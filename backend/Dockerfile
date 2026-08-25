# deps: install once, cached while source changes
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# build: compile TS, generate the Prisma client
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npx tsc

# runner: production deps only + compiled output
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 5000
USER node
CMD ["node", "dist/index.js"]
