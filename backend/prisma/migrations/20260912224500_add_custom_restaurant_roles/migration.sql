-- DropIndex
DROP INDEX IF EXISTS "Role_name_key";

-- AlterTable Role: safely convert name enum to TEXT without dropping column, and add isSystem & restaurantId
ALTER TABLE "Role"
  ALTER COLUMN "name" TYPE TEXT,
  ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "restaurantId" TEXT;

-- Mark existing standard roles as system roles
UPDATE "Role"
SET "isSystem" = true
WHERE "name" IN ('SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_CHEF');

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Role_restaurantId_idx" ON "Role"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_restaurantId_key" ON "Role"("name", "restaurantId");

-- AddForeignKey
ALTER TABLE "Role" DROP CONSTRAINT IF EXISTS "Role_restaurantId_fkey";
ALTER TABLE "Role" ADD CONSTRAINT "Role_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
