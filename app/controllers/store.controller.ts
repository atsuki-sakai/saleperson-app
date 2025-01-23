import { prisma } from "app/db.server";
import type { Store } from "@prisma/client";

export function createStore(store: Store){
  return prisma.store.create({
    data: {
        storeId: store.storeId,
        accessToken: store.accessToken || null,
        chatApiKey: store.chatApiKey || null,
        workflowApiKey: store.workflowApiKey || null,
        systemPrompt: store.systemPrompt || null,
        storePrompt: store.storePrompt || null,
        iconUrl: store.iconUrl || null,
        tone: store.tone || null,
        blockingKeywords: store.blockingKeywords || null,
    }
  });
}

export function upsertStore(store: Store) {
  return prisma.store.upsert({
    where: {
        storeId: store.storeId,
    },
    update: {
        systemPrompt: store.systemPrompt || null,
        storePrompt: store.storePrompt || null,
        iconUrl: store.iconUrl || null,
        tone: store.tone || null,
        blockingKeywords: store.blockingKeywords || null,
    },
    create: {
        storeId: store.storeId,
        accessToken: store.accessToken || null,
        chatApiKey: store.chatApiKey || null,
        workflowApiKey: store.workflowApiKey || null,
        systemPrompt: store.systemPrompt || null,
        storePrompt: store.storePrompt || null,
        iconUrl: store.iconUrl || null,
        tone: store.tone || null,
        blockingKeywords: store.blockingKeywords || null,
    }
  });
}

export async function getStoreAccessToken(storeId: string) {
  const store = await prisma.store.findUnique({
    where: {
      storeId,
    },
    select: {
      accessToken: true,
    }
  });
  if (!store) {
    throw new Error("Store not found");
  }
  if (!store.accessToken) {
    throw new Error("Access token not found");
  }
  return store.accessToken;
}

export async function getStoreInfo(storeId: string) {
  return await prisma.store.findFirst({
    where: {
      storeId,
    },
    select: {
        systemPrompt: true,
        storePrompt: true,
        iconUrl: true,
        tone: true,
        blockingKeywords: true,
        datasets: true,
        metaFieldDescription: true
    }
  });
}

export function updateStore(store: Store) {
  return prisma.store.update({
    where: {
      storeId: store.storeId,
    },
    data: {
        chatApiKey: store.chatApiKey || null,
        workflowApiKey: store.workflowApiKey || null,
        systemPrompt: store.systemPrompt || null,
        storePrompt: store.storePrompt || null,
        iconUrl: store.iconUrl || null,
        tone: store.tone || null,
        blockingKeywords: store.blockingKeywords || null,
    },
  });
}

export function deleteStore(storeId: string) {
  return prisma.store.delete({
    where: {
      storeId,
    },
  });
}

export async function getStoreWithDatasets(storeId: string) {
  return await prisma.store.findUnique({
    where: { storeId },
    include: { datasets: true },
  });
}

