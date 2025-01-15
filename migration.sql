-- CreateTable
CREATE TABLE "session" (
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

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "chatApiKey" TEXT,
    "workflowApiKey" TEXT,
    "systemPrompt" TEXT,
    "storePrompt" TEXT,
    "iconUrl" TEXT,
    "tone" TEXT,
    "blockingKeywords" TEXT,
    "datasetId" TEXT,
    "chatColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "faqContent" TEXT,
    "metaFieldDescription" TEXT,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "datasetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_shop_idx" ON "session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "store_storeId_key" ON "store"("storeId");

-- CreateIndex
CREATE INDEX "store_storeId_idx" ON "store"("storeId");

-- CreateIndex
CREATE INDEX "document_storeId_idx" ON "document"("storeId");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("storeId") ON DELETE RESTRICT ON UPDATE CASCADE;

