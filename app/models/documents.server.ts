// app/models/documents.server.ts

import type { Product, Order } from "../services/shopify/types";
import { CHUNK_SEPARATOR_SYMBOL, CHUNK_MAX_TOKENS } from "../lib/const";
import { prisma } from "../db.server";
import {
  createDocumentFromText,
  updateDocumentByText,
  getDocumentSegments,
  updateDocumentSegment,
} from "../services/dify/api/documents";
import { createKnowledge } from "../services/dify/api/datasets";
import type { KnowledgeType, ProcessRule, Segment } from "../services/dify/api/types";

/* ------------------------------------------------------------------
 * 1. Data cleansing functions
 * ------------------------------------------------------------------ */
export function clensingProductDataToText(products: Product[], shop: string): string {
  // Sort by update date descending
  const sorted = [...products].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return sorted
    .map((product) => {
      const options =
        product.options
          .map((op) => `${op.name}: ${op.values.join(", ")}`)
          .join("\n") || "なし";

      const priceRange = `${product.priceRangeV2.minVariantPrice.amount} ${product.priceRangeV2.minVariantPrice.currencyCode} ～ ${product.priceRangeV2.maxVariantPrice.amount} ${product.priceRangeV2.maxVariantPrice.currencyCode}`;

      const metafields =
        product.metafields.edges
          .map((meta) => {
            const node = meta.node;
            // Exclude certain keys
            if (node.key === "badge" || node.key === "widget") return null;

            let value = node.value;
            try {
              if (value.startsWith("[")) {
                // If it starts with "[", assume JSON
                value = JSON.parse(value).join(", ");
              }
            } catch {
              // Do nothing; use raw value
            }
            // Remove HTML tags
            value = value.replace(/<[^>]*>/g, "").replace(/\n/g, " ");
            return `${node.key.replace("_", "")}: ${value}`;
          })
          .filter(Boolean)
          .join("\n") || "なし";

      const variants = product.variants.edges
        .map((variant) => {
          const vn = variant.node;
          const selectedOptions = vn.selectedOptions
            .map((o: { name: string; value: string }) => `${o.name}: ${o.value}`)
            .join("\n");
          const sku = vn.sku?.replaceAll("-", "") || "なし";
          return `商品名: ${vn.title}
        オプション: ${selectedOptions}
        価格: ${vn.price} ${vn.currencyCode || "JPY"}
        SKU: ${sku}
        在庫数: ${vn.inventoryQuantity || 0}`;
        })
        .join("\n");

      const id = product.id.replace("gid://shopify/Product/", "");
      const desc =
        product.description?.replace(/<[^>]*>/g, "").replace(/\n/g, " ") || "なし";

      return `
商品情報
商品名: ${product.title === "Default Title" ? "なし" : product.title}
商品ID: ${id}
商品URL: https://${shop}/products/${product.handle}
商品タイプ: ${product.productType || "なし"}
販売元: ${product.vendor || "なし"}
公開ステータス: ${product.status}
総在庫数: ${product.totalInventory || 0}
最終更新日時: ${product.updatedAt}
商品説明: ${desc}
オプション:
${options}
価格情報: ${priceRange}
バリエーション:
${variants}
メタフィールド
${metafields}
`.trim();
    })
    .join(CHUNK_SEPARATOR_SYMBOL);
}

export function clensingOrderDataToText(orders: Order[]): string {
  return orders
    .map((order) => {
      if (!order.createdAt) return "";

      const orderId =
        order.id?.replace("gid://shopify/Order/", "不明") || "不明";
      const totalAmount =
        order.currentTotalPriceSet?.presentmentMoney.amount || "不明";
      const currency =
        order.currentTotalPriceSet?.presentmentMoney.currencyCode || "JPY";
      const customerName = order.customer?.displayName || "不明";
      const customerEmail = order.customer?.email || "不明";
      const customerId =
        order.customer?.id?.replace("gid://shopify/Customer/", "") || "不明";
      const customerPhone = order.customer?.phone || "不明";
      const customerTags = order.customer?.tags || "なし";
      const note = order.note || "なし";
      const lineItems = order.lineItems?.edges
        ?.map((edge) => edge.node)
        .filter(Boolean)
        .map(
          (item) =>
            `${item.title} x ${item.quantity}点 (${item.originalTotalSet?.presentmentMoney.amount}円)`
        )
        .join(", ");

      return `
注文データ
注文日: ${order.createdAt}
注文番号: ${order.name || "不明"}
注文ID: ${orderId}
注文金額: ${totalAmount} ${currency}
注文者: ${customerName}
注文者メールアドレス: ${customerEmail}
注文者ID: ${customerId}
注文者電話番号: ${customerPhone}
注文タグ: ${customerTags}
注文メモ: ${note}
商品: ${lineItems}
`.trim();
    })
    .filter(Boolean)
    .join(CHUNK_SEPARATOR_SYMBOL);
}

/* ------------------------------------------------------------------
 * 2. Common upsert logic
 * ------------------------------------------------------------------ */
export async function getOrCreateDataset(shop: string): Promise<string> {
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { documents: true },
  });
  if (store?.datasetId) {
    return store.datasetId;
  }
  const knowledge = await createKnowledge({
    name: shop,
    permission: "only_me",
  });
  return knowledge.id;
}

interface DocumentUpsertOptions {
  datasetId: string;
  docName: string;
  docType: KnowledgeType;
  content: string;
  storeId: string;
  segmentUpdater?: (datasetId: string, docId: string) => Promise<void>;
}

async function upsertDifyDocument(options: DocumentUpsertOptions) {
  const { datasetId, docName, docType, content, storeId, segmentUpdater } = options;

  // Find existing document
  const store = await prisma.store.findUnique({
    where: { storeId },
    include: { documents: true },
  });
  const existingDoc = store?.documents.find((d) => d.type === docType);

  // Create or update in Dify
  const processRule: ProcessRule = {
    name: docName,
    text: content,
    indexing_technique: "high_quality",
    doc_form: "hierarchical_model",
    doc_language: "English",
    process_rule: {
      mode: "custom",
      rules: {
        segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS,
          parent_mode: "full-doc",
        },
        subchunk_segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: CHUNK_MAX_TOKENS,
          chunk_overlap: 50,
        },
      },
    },
  };

  const docResponse = !existingDoc
      ? await createDocumentFromText(datasetId, processRule)
    : await updateDocumentByText(datasetId, existingDoc.id, {
        name: docName,
        text: content,
      });

  if (!docResponse.id) {
    throw new Error("No document ID returned from Dify.");
  }

  // Upsert in Prisma
  await prisma.store.upsert({
    where: { storeId },
    create: {
      storeId,
      datasetId,
      documents: {
        create: {
          id: docResponse.id,
          name: docName,
          type: docType,
          datasetId,
        },
      },
    },
    update: {
      datasetId,
      documents: {
        upsert: {
          where: { id: docResponse.id },
          create: {
            id: docResponse.id,
            name: docName,
            type: docType,
            datasetId,
          },
          update: {
            name: docName,
            type: docType,
          },
        },
      },
    },
  });

  // Optionally update segments
  if (segmentUpdater) {
    await segmentUpdater(datasetId, docResponse.id);
  }
}

/* ------------------------------------------------------------------
 * 3. Specific upsert handlers
 * ------------------------------------------------------------------ */

// FAQ
export async function upsertFaq(shop: string, faqContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "よくある質問";

  await upsertDifyDocument({
    datasetId,
    docName,
    docType: "faq",
    content: faqContent,
    storeId: shop,
  });

  // Update store's faqContent
  await prisma.store.update({
    where: { storeId: shop },
    data: { faqContent },
  });
}

// Product Meta Fields
export async function upsertProductMeta(shop: string, metaContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "商品メタフィールド";

  await upsertDifyDocument({
    datasetId,
    docName,
    docType: "product_meta_fields",
    content: metaContent,
    storeId: shop,
  });

  await prisma.store.update({
    where: { storeId: shop },
    data: { metaFieldDescription: metaContent },
  });
}

// Orders
export async function upsertOrders(shop: string, orderContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "注文データ";

  await upsertDifyDocument({
    datasetId,
    docName,
    docType: "orders",
    content: orderContent,
    storeId: shop,
    segmentUpdater: async (dsId, docId) => {
      const segments = await getDocumentSegments(dsId, docId);
      await Promise.all(
        segments.map(async (seg: Segment) => {
          if (!seg.content) {
            return;
          }
          const content = seg.content;
          const allLines = content.split("\n").map((line) => line.trim());
          const keywords = allLines.filter((line) =>
            ["注文日", "注文番号", "注文金額", "注文者", "注文者メールアドレス", "注文タグ"].some((k) =>
              line.startsWith(k),
            ),
          );

          // Extract product lines
          const splittedByProduct = content.split("商品: ");
          // If no "商品: " found, skip
          if (splittedByProduct.length < 2) {
            return;
          }

          const productLines = splittedByProduct[1]
            ?.split(",")
            .map((kw) => kw.split("x")[0].trim()) || [];

          await updateDocumentSegment(dsId, docId, seg.id, {
            content: seg.content,
            answer: seg.answer,
            enabled: true,
            keywords: [...keywords, ...productLines],
          });
        }),
      );
    },
  });
}

// Products
export async function upsertProducts(shop: string, productContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "商品データ";

  await upsertDifyDocument({
    datasetId,
    docName,
    docType: "products",
    content: productContent,
    storeId: shop,
    segmentUpdater: async (dsId, docId) => {
      const segments = await getDocumentSegments(dsId, docId);
      await Promise.all(
        segments.map(async (seg) => {
          if (!seg.content) {
            return;
          }

          // Split for "商品情報"
          const productPart = seg.content.split("商品情報")[1];

          // Split for "メタフィールド"
          const metaSplitArray = seg.content.split("メタフィールド");
          const metaSplit = metaSplitArray.length < 2 ? "" : metaSplitArray[1];

          const productKeywords = productPart
            .split("\n")
            .filter((kw) => kw.trim() && !kw.includes("商品説明"))
            .map((kw) => kw.trim());

      
          const metaKeywords = metaSplit
            .split("\n")
            .map((m) => m.trim())
            .filter(Boolean);

          const allKeywords = [...productKeywords, ...metaKeywords];
       

          await updateDocumentSegment(dsId, docId, seg.id, {
            content: seg.content,
            answer: seg.answer,
            enabled: true,
            keywords: allKeywords,
          });
        }),
      );
    },
  });
}

// Store policy
export async function upsertPolicy(shop: string, policyContent: string) {
  const datasetId = await getOrCreateDataset(shop);
  const docName = "ストアポリシー";

  await upsertDifyDocument({
    datasetId,
    docName,
    docType: "policy",
    content: policyContent,
    storeId: shop,
    segmentUpdater: async (dsId, docId) => {
      const segments = await getDocumentSegments(dsId, docId);
      for (const seg of segments) {
        if (!seg.content) {
          continue;
        }
        const title = seg.content.split(`##`)[0].trim();
        const extractedKeywords = extractPolicyKeywords(title);

        await updateDocumentSegment(dsId, docId, seg.id, {
          content: seg.content,
          answer: seg.answer,
          enabled: true,
          keywords: extractedKeywords,
        });
      }
    },
  });
}

export async function handleStoreUpsert(params: {
  storeId: string;
  mainPrompt: string;
}) {
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
    const knowledgeResponse = await createKnowledge({
      name: shopName,
      permission: "only_me",
    });
    datasetId = knowledgeResponse.id;
  }
  // 2. 既存のシステムプロンプトドキュメントを検索
  const existingSystemPromptDoc = store?.documents.find(
    (doc) => doc.type === "system_prompt",
  );

  // 3. Difyでドキュメントを作成 or 更新
  const documentResponse = !existingSystemPromptDoc
    ? await createDocumentFromText(datasetId, {
        name: promptName,
        text: mainPrompt,
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
              parent_mode: "full-doc",
            },
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
              { id: "remove_urls_emails", enabled: true },
            ],
          },
        },
        indexing_technique: "high_quality",
      })
    : await updateDocumentByText(datasetId, existingSystemPromptDoc.id, {
        name: promptName,
        text: mainPrompt,
      });

  const documentId = documentResponse.id;
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

/* ------------------------------------------------------------------
 * 4. Utility for store policy
 * ------------------------------------------------------------------ */
function extractPolicyKeywords(title: string): string[] {
  switch (title) {
    case "Legal notice":
      return ["特定商法取引法に基づく表記"];
    case "Privacy policy":
      return ["プライバシーポリシー"];
    case "Terms of service":
      return ["利用規約"];
    case "Refund policy":
      return ["返品について"];
    case "Shipping policy":
      return ["配送について"];
    default:
      return [];
  }
}