-- CreateTable
CREATE TABLE "FavouriteMenuItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavouriteMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavouriteMenuItem_restaurantId_sortOrder_idx" ON "FavouriteMenuItem"("restaurantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FavouriteMenuItem_restaurantId_menuItemId_key" ON "FavouriteMenuItem"("restaurantId", "menuItemId");

-- AddForeignKey
ALTER TABLE "FavouriteMenuItem" ADD CONSTRAINT "FavouriteMenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavouriteMenuItem" ADD CONSTRAINT "FavouriteMenuItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
