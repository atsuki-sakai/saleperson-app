import { DatasetIndexingStatus, DatasetType } from "app/lib/types";
import { prisma } from "app/db.server";
import { DifyService } from "app/integrations/dify/DifyService";
import { Dataset } from "@prisma/client";


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

export async function checkDatasetIndexing(shopDomain: string, datasets: Dataset[]) {
      // データセットを1件ずつループ
  for (const dataset of datasets) {
    // INDEXING 状態のデータセットのみ処理
    if (dataset.status === DatasetIndexingStatus.INDEXING) {
      // バッチIDを「逐次的」に処理する
      // ループ途中で配列を更新しても問題が出ないよう、スナップショット [...dataset.batchIds] を使用
      for (const batch of [...dataset.batchIds]) {
        try {
          // バッチのインデックス状況を取得
          const docIndexState = await difyService.document.getIndexingStatus(
            dataset.datasetId!,
            batch,
          );

          // 「indexing_status === completed」ならバッチを配列から除去
          if (docIndexState?.data[0]?.indexing_status === "completed") {
            console.log(`completed batch: ${batch}`);
            await removeDatasetToBatch(dataset, shopDomain, batch);

            // datasetオブジェクトの batchIds も更新しておくとさらに衝突が減る
            dataset.batchIds = dataset.batchIds.filter(
              (id: string) => id !== batch,
            );
            if (dataset.batchIds.length === 0) {
              await completedImportDocument(shopDomain, dataset.datasetId!);
            }
          }
        } catch (error) {
          // 404エラーが出る場合(「Documents not found」)などは適宜対処
          console.error("Error in batch:", batch, error);
        }
      }
    }
  }
}


export async function completedImportDocument(shopDomain: string, datasetId: string) {
    await prisma.dataset.update({
            where: {
                id: datasetId,
                storeId: shopDomain,
            },
            data: {
                status: DatasetIndexingStatus.COMPLETED,
            }
        }
    )
}


/**
 * 特定のバッチIDをDatasetのbatchIds配列から削除する
 */
export async function removeDatasetToBatch(
    dataset: any,
    shopDomain: string,
    batchToRemove: string
  ) {
    const filtered = dataset.batchIds.filter((id: string) => id !== batchToRemove);
  
    await prisma.dataset.update({
      where: {
        id: dataset.id,
        storeId: shopDomain,
      },
      data: {
        batchIds: filtered,
      },
    });

  
    dataset.batchIds = filtered;
  
    return filtered;
  }
  


export const deleteDataset = async (datasetId: string) => {
    await prisma.dataset.delete({
        where: { id: datasetId },
    });
}