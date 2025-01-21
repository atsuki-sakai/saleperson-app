// app/models/documents.server.ts

import type { Product, Order } from "../integrations/shopify/types";
import { CHUNK_SEPARATOR_SYMBOL, CHUNK_MAX_TOKENS } from "../lib/constants";
import { prisma } from "../db.server";
import { DifyService } from "../integrations/dify/DifyService";

// /* ------------------------------------------------------------------
//  * 1. Data cleansing functions
//  * ------------------------------------------------------------------ */
// export function clensingProductDataToText(products: Product[], shop: string): string {
//   // Sort by update date descending
//   const sorted = [...products].sort(
//     (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
//   );

//   return sorted
//     .map((product) => {
//       const options =
//         product.options
//           .map((op) => `${op.name}: ${op.values.join(", ")}`)
//           .join("\n") || "なし";

//       const priceRange = `${product.priceRangeV2.minVariantPrice.amount} ${product.priceRangeV2.minVariantPrice.currencyCode} ～ ${product.priceRangeV2.maxVariantPrice.amount} ${product.priceRangeV2.maxVariantPrice.currencyCode}`;

//       const metafields =
//         product.metafields.edges
//           .map((meta) => {
//             const node = meta.node;
//             // Exclude certain keys
//             if (node.key === "badge" || node.key === "widget") return null;

//             let value = node.value;
//             try {
//               if (value.startsWith("[")) {
//                 // If it starts with "[", assume JSON
//                 value = JSON.parse(value).join(", ");
//               }
//             } catch {
//               // Do nothing; use raw value
//             }
//             // Remove HTML tags
//             value = value.replace(/<[^>]*>/g, "").replace(/\n/g, " ");
//             return `${node.key.replace("_", "")}: ${value}`;
//           })
//           .filter(Boolean)
//           .join("\n") || "なし";

//       const variants = product.variants.edges
//         .map((variant) => {
//           const vn = variant.node;
//           const selectedOptions = vn.selectedOptions
//             .map((o: { name: string; value: string }) => `${o.name}: ${o.value}`)
//             .join("\n");
//           const sku = vn.sku?.replaceAll("-", "") || "なし";
//           return `商品名: ${vn.title}
//         オプション: ${selectedOptions}
//         価格: ${vn.price} ${vn.currencyCode || "JPY"}
//         SKU: ${sku}
//         在庫数: ${vn.inventoryQuantity || 0}`;
//         })
//         .join("\n");

//       const id = product.id.replace("gid://shopify/Product/", "");
//       const desc =
//         product.description?.replace(/<[^>]*>/g, "").replace(/\n/g, " ") || "なし";

//       return `
// 商品情報
// 商品名: ${product.title === "Default Title" ? "なし" : product.title}
// 商品ID: ${id}
// 商品URL: https://${shop}/products/${product.handle}
// 商品タイプ: ${product.productType || "なし"}
// 販売元: ${product.vendor || "なし"}
// 公開ステータス: ${product.status}
// 総在庫数: ${product.totalInventory || 0}
// 最終更新日時: ${product.updatedAt}
// 商品説明: ${desc}
// オプション:
// ${options}
// 価格情報: ${priceRange}
// バリエーション:
// ${variants}
// メタフィールド
// ${metafields}
// `.trim();
//     })
//     .join(CHUNK_SEPARATOR_SYMBOL);
// }

// export function clensingOrderDataToText(orders: Order[]): string {
//   return orders
//     .map((order) => {
//       if (!order.createdAt) return "";

//       const orderId =
//         order.id?.replace("gid://shopify/Order/", "不明") || "不明";
//       const totalAmount =
//         order.currentTotalPriceSet?.presentmentMoney.amount || "不明";
//       const currency =
//         order.currentTotalPriceSet?.presentmentMoney.currencyCode || "JPY";
//       const customerName = order.customer?.displayName || "不明";
//       const customerEmail = order.customer?.email || "不明";
//       const customerId =
//         order.customer?.id?.replace("gid://shopify/Customer/", "") || "不明";
//       const customerPhone = order.customer?.phone || "不明";
//       const customerTags = order.customer?.tags || "なし";
//       const note = order.note || "なし";
//       const lineItems = order.lineItems?.edges
//         ?.map((edge) => edge.node)
//         .filter(Boolean)
//         .map(
//           (item) =>
//             `${item.title} x ${item.quantity}点 (${item.originalTotalSet?.presentmentMoney.amount}円)`
//         )
//         .join(", ");

//       return `
// 注文データ
// 注文日: ${order.createdAt}
// 注文番号: ${order.name || "不明"}
// 注文ID: ${orderId}
// 注文金額: ${totalAmount} ${currency}
// 注文者: ${customerName}
// 注文者メールアドレス: ${customerEmail}
// 注文者ID: ${customerId}
// 注文者電話番号: ${customerPhone}
// 注文タグ: ${customerTags}
// 注文メモ: ${note}
// 商品: ${lineItems}
// `.trim();
//     })
//     .filter(Boolean)
//     .join(CHUNK_SEPARATOR_SYMBOL);
// }

// /* ------------------------------------------------------------------
//  * 2. Common upsert logic
//  * ------------------------------------------------------------------ */
// export async function getOrCreateDataset(shop: string): Promise<string> {
//   const store = await prisma.store.findUnique({
//     where: { storeId: shop },
//     include: { documents: true },
//   });
//   if (store?.datasetId) {
//     return store.datasetId;
//   }
//   const knowledge = await createKnowledge({
//     name: shop,
//     permission: "only_me",
//   });
//   return knowledge.id;
// }

// interface DocumentUpsertOptions {
//   datasetId: string;
//   docName: string;
//   docType: KnowledgeType;
//   content: string;
//   storeId: string;
//   segmentUpdater?: (datasetId: string, docId: string) => Promise<void>;
// }

// async function upsertDifyDocument(options: DocumentUpsertOptions) {
//   const { datasetId, docName, docType, content, storeId, segmentUpdater } = options;

//   // Find existing document
//   const store = await prisma.store.findUnique({
//     where: { storeId },
//     include: { documents: true },
//   });
//   const existingDoc = store?.documents.find((d) => d.type === docType);

//   // Create or update in Dify
//   const processRule: ProcessRule = {
//     name: docName,
//     text: content,
//     indexing_technique: "high_quality",
//     doc_form: "hierarchical_model",
//     doc_language: "English",
//     process_rule: {
//       mode: "custom",
//       rules: {
//         segmentation: {
//           separator: CHUNK_SEPARATOR_SYMBOL,
//           max_tokens: CHUNK_MAX_TOKENS,
//           parent_mode: "full-doc",
//         },
//         subchunk_segmentation: {
//           separator: CHUNK_SEPARATOR_SYMBOL,
//           max_tokens: CHUNK_MAX_TOKENS,
//           chunk_overlap: 50,
//         },
//       },
//     },
//   };

//   const docResponse = !existingDoc
//       ? await createDocumentFromText(datasetId, processRule)
//     : await updateDocumentByText(datasetId, existingDoc.id, {
//         name: docName,
//         text: content,
//       });

//   if (!docResponse.id) {
//     throw new Error("No document ID returned from Dify.");
//   }

//   // Upsert in Prisma
//   await prisma.store.upsert({
//     where: { storeId },
//     create: {
//       storeId,
//       datasetId,
//       documents: {
//         create: {
//           id: docResponse.id,
//           name: docName,
//           type: docType,
//           datasetId,
//         },
//       },
//     },
//     update: {
//       datasetId,
//       documents: {
//         upsert: {
//           where: { id: docResponse.id },
//           create: {
//             id: docResponse.id,
//             name: docName,
//             type: docType,
//             datasetId,
//           },
//           update: {
//             name: docName,
//             type: docType,
//           },
//         },
//       },
//     },
//   });

//   // Optionally update segments
//   if (segmentUpdater) {
//     await segmentUpdater(datasetId, docResponse.id);
//   }
// }

/* ------------------------------------------------------------------
 * 3. Specific upsert handlers
 * ------------------------------------------------------------------ */

// FAQ
export async function upsertFaq(shop: string, faqContent: string) {
  const difyService = new DifyService(
    process.env.DIFY_API_KEY!,
    process.env.DIFY_BASE_URL!,
  );
  const docName = "よくある質問";
  const dataset = await difyService.dataset.createDataset({
    name: docName,
    permission: "only_me",
  });
  await difyService.document.createDocumentByText(dataset.id, {
    name: docName,
    text: faqContent,
    indexing_technique: "high_quality",
    doc_form: "hierarchical_model",
    doc_language: "ja",
    process_rule: {
      mode: "hierarchical",
      rules: {
        pre_processing_rules: [
          { id: "remove_extra_spaces", enabled: true },
          { id: "remove_urls_emails", enabled: true },
        ],
        parent_mode: "paragraph",
        segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS
        },
        subchunk_segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS,
          chunk_overlap: 50,
        },
      },
    },
  });
  // Update store's faqContent
  await prisma.store.update({
    where: { storeId: shop },
    data: { faqContent },
  });
}

// Product Meta Fields
export async function upsertProductMeta(shop: string, metaContent: string) {
  const difyService = new DifyService(
    process.env.DIFY_API_KEY!,
    process.env.DIFY_BASE_URL!,
  );
  const docName = "商品メタフィールド";
  const dataset = await difyService.dataset.createDataset({
    name: docName,
    permission: "only_me",
  });
  await difyService.document.createDocumentByText(dataset.id, {
    name: docName,
    text: metaContent,
    indexing_technique: "high_quality",
    doc_form: "hierarchical_model",
    doc_language: "ja",
    process_rule: {
      mode: "hierarchical",
      rules: {
        pre_processing_rules: [
          { id: "remove_extra_spaces", enabled: true },
          { id: "remove_urls_emails", enabled: true },
        ],
        parent_mode: "paragraph",
        segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS,
        },
        subchunk_segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS,
          chunk_overlap: 50,
        },
      },
    },
  });

  await prisma.store.update({
    where: { storeId: shop },
    data: { metaFieldDescription: metaContent },
  });
}

// Store policy
export async function upsertPolicy(shop: string, policyContent: string) {
  const difyService = new DifyService(
    process.env.DIFY_API_KEY!,
    process.env.DIFY_BASE_URL!,
  );
  const docName = "Store Policy";

  const dataset = await difyService.dataset.createDataset({
    name: docName,
    permission: "only_me",
  });

 await difyService.document.createDocumentByText(dataset.id, {
    name: "Store Policy document",
    text: policyContent,
    indexing_technique: "high_quality",
    doc_form: "hierarchical_model",
    doc_language: "ja",
    process_rule: {
      mode: "hierarchical",
      rules: {
        pre_processing_rules: [
          { id: "remove_extra_spaces", enabled: true },
          { id: "remove_urls_emails", enabled: true },
        ],
        parent_mode: "paragraph",
        segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS,

        },
        subchunk_segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS,
          chunk_overlap: 50,
        },
      },
    },
  });
}

export async function handleStoreUpsert(params: {
  storeId: string;
  mainPrompt: string;
}) {
  const difyService = new DifyService(
    process.env.DIFY_API_KEY!,
    process.env.DIFY_BASE_URL!,
  );
  const { storeId, mainPrompt } = params;

  const store = await prisma.store.findUnique({
    where: { storeId },
    include: { documents: true },
  });

  if (!mainPrompt) {
    throw new Error("プロンプトが空です。");
  }
  const promptName = "システムプロンプト";
  const shopName = storeId.split(".myshopify.com")[0];

  // 1. Difyでナレッジ(データセット)の作成 or 既存IDを使用
  let datasetId = store?.datasetId;
  if (!datasetId) {
    const dataset = await difyService.dataset.createDataset({
      name: shopName,
      permission: "only_me",
    });
    datasetId = dataset.id;
  }
  // 2. 既存のシステムプロンプトドキュメントを検索
  const existingSystemPromptDoc = store?.documents.find(
    (doc) => doc.type === "system_prompt",
  );

  // 3. Difyでドキュメントを作成 or 更新
  const documentResponse = !existingSystemPromptDoc
    ? await difyService.document.createDocumentByText(datasetId, {  
        name: promptName,
        text: mainPrompt,
        indexing_technique: "high_quality",
        doc_form: "hierarchical_model",
        doc_language: "ja",
        process_rule: {
          mode: "hierarchical",
          rules: {
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
              { id: "remove_urls_emails", enabled: true },
            ],
            parent_mode: "paragraph",
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
            },
            subchunk_segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
              chunk_overlap: 50,
            },
          },
        },
      })
    : await difyService.document.updateDocumentByText(datasetId, existingSystemPromptDoc.id, {
        name: promptName,
        text: mainPrompt,
      });

  const documentId = documentResponse.document.id;
  if (!documentId) {
    throw new Error("ドキュメントIDの取得に失敗しました。");
  }
  // 4. PrismaでDB更新
  const updatedStore = await prisma.store.upsert({
    where: { storeId: storeId },
    create: {
      storeId: storeId,
      datasetId: datasetId,
      documents: {
        create: {
          id: documentId,
          name: promptName,
          type: "system_prompt",
        },
      },
    },
    update: {
      datasetId: datasetId,
      documents: {
        upsert: {
          where: { id: documentId },
          create: {
            id: documentId,
            name: promptName,
            type: "system_prompt",
            datasetId: datasetId,
          },
          update: {
            id: documentId,
            name: promptName,
            type: "system_prompt",
            datasetId: datasetId,
          },
        },
      },
    },
    include: { documents: true },
  });

  return updatedStore;
}
