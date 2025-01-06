-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(6),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "collaborator" BOOLEAN DEFAULT false,
    "email" TEXT,
    "emailVerified" BOOLEAN DEFAULT false,
    "firstName" TEXT,
    "lastName" TEXT,
    "locale" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "chatApiKey" TEXT,
    "workflowApiKey" TEXT,
    "systemPrompt" TEXT,
    "storePrompt" TEXT,
    "iconUrl" TEXT,
    "tone" TEXT,
    "blockingKeywords" TEXT,
    "chatColor" TEXT,
    "hasMediaMetaField" BOOLEAN NOT NULL DEFAULT false,
    "hasProductKnowledge" BOOLEAN NOT NULL DEFAULT false,
    "hasOrderKnowledge" BOOLEAN NOT NULL DEFAULT false,
    "hasStorePolicy" BOOLEAN NOT NULL DEFAULT false,
    "hasShippingInfo" BOOLEAN NOT NULL DEFAULT false,
    "hasFaq" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeId_key" ON "Store"("storeId");

-- CreateIndex
CREATE INDEX "Store_storeId_idx" ON "Store"("storeId");
