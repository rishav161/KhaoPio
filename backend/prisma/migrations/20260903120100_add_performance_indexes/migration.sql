-- Performance indexes for high-traffic query paths.
--
-- PostgreSQL indexes primary keys and unique constraints automatically but
-- NOT foreign keys, so every join and tenant-scoped filter below was a
-- sequential scan. Composite indexes lead with restaurantId because every
-- service scopes by tenant first.

-- CreateIndex
CREATE INDEX "Order_restaurantId_status_idx" ON "Order"("restaurantId", "status");
CREATE INDEX "Order_restaurantId_createdAt_idx" ON "Order"("restaurantId", "createdAt");
CREATE INDEX "Order_waiterId_idx" ON "Order"("waiterId");
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");

-- CreateIndex
CREATE INDEX "Kot_orderId_status_idx" ON "Kot"("orderId", "status");
CREATE INDEX "KotItem_kotId_idx" ON "KotItem"("kotId");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_categoryId_isAvailable_idx" ON "MenuItem"("restaurantId", "categoryId", "isAvailable");

-- CreateIndex
CREATE INDEX "DiningTable_restaurantId_status_idx" ON "DiningTable"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_cashierId_idx" ON "Payment"("cashierId");

-- CreateIndex
CREATE INDEX "Booking_restaurantId_status_idx" ON "Booking"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Coupon_restaurantId_isActive_idx" ON "Coupon"("restaurantId", "isActive");
