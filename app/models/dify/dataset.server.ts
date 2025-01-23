// app/models/knowledgeUpsert.server.ts
import { prisma } from "../../db.server";
import { DifyService } from "../../integrations/dify/DifyService";
import { CHUNK_SEPARATOR_SYMBOL, CHUNK_MAX_TOKENS } from "../../lib/constants";
import { DatasetType } from "../../lib/types";

const difyService = new DifyService(process.env.DIFY_API_KEY!, process.env.DIFY_BASE_URL!);

/**
 * Difyのデータセットが無い場合は作成し、IDを返却する
 */
export async function getOrCreateDataset(shop: string): Promise<string> {
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { datasets: true },
  });
  if (store?.datasetId) {
    return store.datasetId;
  }
  // Difyに新規Knowledge作成
  const dataset = await difyService.dataset.createDataset({ name: shop, permission: "only_me" });
  // DBに反映
  await prisma.store.update({
    where: { storeId: shop },
    data: {
      datasetId: dataset.id
    }
  });
  return dataset.id;
}

/**
 * 「注文データ」用ドキュメントをDifyにUpsert
 */
export async function upsertOrders(shop: string, orderContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "注文データ";

  // 既存ドキュメントを探す(Prisma)
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { datasets: true },
  });
  const existingDoc = store?.datasets.find((d) => d.type === DatasetType.ORDERS);

  // DifyへUpsert
  const docResponse = !existingDoc
    ? await difyService.document.createDocumentByText(datasetId, {
        name: docName,
        text: orderContent,
        indexing_technique: "high_quality",
        doc_form: "hierarchical_model",
        doc_language: "ja",
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
            },
          },
        },
      })
    : await difyService.document.updateDocumentByText(datasetId, existingDoc.id, {
        name: docName,
        text: orderContent,
      });

  // Prismaに反映
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    update: {
      datasetId,
      datasets: {
        upsert: {
          where: { id: docResponse.document.id },
          create: {
            id: docResponse.document.id,
            name: docName,
            type: DatasetType.ORDERS,
            datasetId,
          },
          update: {
            name: docName,
          },
        },
      },
    },
    create: {
      storeId: shop,
      datasetId,
      datasets: {
        create: {
          id: docResponse.document.id,
          name: docName,
          type: DatasetType.ORDERS,
          datasetId,
        },
      },
    },
    include: { datasets: true },
  });

  return updatedStore;
}

/**
 * 「ポリシー」用ドキュメント
 */
export async function upsertPolicy(shop: string, policyContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "ストアポリシー";

  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { datasets: true },
  });
  const existingDoc = store?.datasets.find((d) => d.type === DatasetType.POLICY);

  const docResponse = !existingDoc
    ? await difyService.document.createDocumentByText(datasetId, {
        name: docName,
        text: policyContent,
        indexing_technique: "high_quality",
        doc_language: "ja",
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: { separator: CHUNK_SEPARATOR_SYMBOL },
          },
        },
      })
    : await difyService.document.updateDocumentByText(datasetId, existingDoc.id, {
        name: docName,
        text: policyContent,
      });

  // Prismaに反映
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    update: {
      datasetId,
      datasets: {
        upsert: {
          where: { id: docResponse.document.id },
          create: { id: docResponse.document.id, name: docName, type: DatasetType.POLICY, datasetId },
          update: { name: docName },
        },
      },
    },
    create: {
      storeId: shop,
      datasetId,
      datasets: {
        create: { id: docResponse.document.id, name: docName, type: DatasetType.POLICY, datasetId },
      },
    },
    include: { datasets: true },
  });

  return updatedStore;
}

/**
 * FAQドキュメント
 */
export async function upsertFaq(shop: string, faqContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "よくある質問";

  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { datasets: true },
  });
  const existingDoc = store?.datasets.find((d) => d.type === DatasetType.FAQ);

  const docResponse = !existingDoc
    ? await difyService.document.createDocumentByText(datasetId, {
        name: docName,
        text: faqContent,
        indexing_technique: "high_quality",
        doc_language: "ja",
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: { separator: CHUNK_SEPARATOR_SYMBOL },
          },
        },
      })
    : await difyService.document.updateDocumentByText(datasetId, existingDoc.id, {
        name: docName,
        text: faqContent,
      });

  // 同時にstore.faqContentにも保存例
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    create: {
      storeId: shop,
      datasetId,
      faqContent: faqContent,
      datasets: {
        create: {
          id: docResponse.document.id,
          name: docName,
          type: DatasetType.FAQ,
          datasetId,
        },
      },
    },
    update: {
      datasetId,
      faqContent: faqContent,
      datasets: {
        upsert: {
          where: { id: docResponse.document.id },
          create: {
            id: docResponse.document.id,
            name: docName,
            type: DatasetType.FAQ,
            datasetId,
          },
          update: {
            name: docName,
            type: DatasetType.FAQ,
          },
        },
      },
    },
    include: { datasets: true },
  });

  return updatedStore;
}

/**
 * 商品メタフィールド説明文
 */
export async function upsertProductMeta(shop: string, metaContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "商品メタフィールド";

  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { datasets: true },
  });
  const existingDoc = store?.datasets.find((d) => d.type === DatasetType.PRODUCT_META_FIELDS);

  const docResponse = !existingDoc
    ? await difyService.document.createDocumentByText(datasetId, {
        name: docName,
        text: metaContent,
        indexing_technique: "high_quality",
        doc_language: "ja",
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: { separator: CHUNK_SEPARATOR_SYMBOL },
          },
        },
      })
    : await difyService.document.updateDocumentByText(datasetId, existingDoc.id, {
        name: docName,
        text: metaContent,
      });

  // 同時にstore.metaFieldDescriptionにも保存例
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    create: {
      storeId: shop,
      datasetId,
      metaFieldDescription: metaContent,
      datasets: {
        create: {
          id: docResponse.document.id,
          name: docName,
          type: DatasetType.PRODUCT_META_FIELDS,
          datasetId,
        },
      },
    },
    update: {
      datasetId,
      metaFieldDescription: metaContent,
      datasets: {
        upsert: {
          where: { id: docResponse.document.id },
          create: {
            id: docResponse.document.id,
            name: docName,
            type: DatasetType.PRODUCT_META_FIELDS,
            datasetId,
          },
          update: {
            name: docName,
            type: DatasetType.PRODUCT_META_FIELDS,
          },
        },
      },
    },
    include: { datasets: true },
  });

  return updatedStore;
}
