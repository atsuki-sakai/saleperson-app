-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP,
    "cancelledAt" TIMESTAMP,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_shop_idx" ON "Subscription"("shop");

-- CreateIndex
CREATE INDEX "Subscription_subscriptionId_idx" ON "Subscription"("subscriptionId");
