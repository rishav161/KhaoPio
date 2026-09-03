-- Brings the database in line with `Restaurant.qrSlug`, which was added to
-- schema.prisma and applied to production via `prisma db push` but never
-- captured as a migration. Safe to run: the column is nullable, and the
-- unique index tolerates multiple NULLs in PostgreSQL.

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "qrSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_qrSlug_key" ON "Restaurant"("qrSlug");
