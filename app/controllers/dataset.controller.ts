import { DatasetIndexingStatus, DatasetType } from "app/lib/types";
import { prisma } from "app/db.server";
import { DifyService } from "app/integrations/dify/DifyService";

const difyService = new DifyService(
    process.env.DIFY_API_KEY!,
    process.env.DIFY_BASE_URL!,
  );

export const createDataset = async (type: DatasetType, shopDomain: string) => {
    const dataset = await difyService.dataset.createDataset({
        name: type,
        description: `${type} dataset`,
        indexing_technique: "high_quality",
        permission: "only_me",
    });
    await prisma.dataset.create({
        data: {
            id: dataset.id,
            datasetId: dataset.id,
            storeId: shopDomain,
            type: type,
            status: DatasetIndexingStatus.INDEXING,
        },
    });
    return dataset.id;
}

export const upsertDataset = async (datasetId: string, type: DatasetType, shopDomain: string, batch: string, status: DatasetIndexingStatus) => {
    await prisma.dataset.upsert({
        where: { id: datasetId! },
        update: {
        batchIds: {
            push: batch,
        },
        datasetId,
        status: status,
        }, 
        create: {
        storeId: shopDomain,
        type: type,
        status: status,
        batchIds: [batch],
        datasetId,
        },
    });
}

export const deleteDataset = async (datasetId: string) => {
    await prisma.dataset.delete({
        where: { id: datasetId },
    });
}