// pubsub.webhook.tsx: Pub/SubのPush先エンドポイント → メッセージを受け取り → Shopifyから商品100件取得 → Dify送信 → 次のページがあれば再度Publish
// app/routes/pubsub.webhook.tsx
import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { getPubSubPayload, publishToPubSub } from "../services/pubsub.server";
import { fetchShopifyProducts } from "../services/shopify/fetchShopifyProducts";
import { upsertProducts } from "../models/documents.server";
import { clensingProductDataToText } from "../models/documents.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    // 1) Pub/Subのメッセージをデコード
    const payload = await getPubSubPayload(request);
    const { taskId, shopDomain, cursor, pageSize } = payload;

    // 2) Shopifyから商品を取得(100件)
    const { products, hasMore, nextCursor } = await fetchShopifyProducts(
      request,
      cursor,
    );

    // 3) Difyに送る (upsertProducts内で clensingProductDataToText → Dify createDocument)
    const productText = clensingProductDataToText(products, shopDomain);
    await upsertProducts(shopDomain, productText);

    // 4) 進捗管理 (実際にはTaskテーブルなどを使って更新)
    // 例: ここではStoreテーブルにprogressなどのフィールドがあるとして
    await prisma.store.update({
      where: { storeId: shopDomain },
      data: {
        // 何らかの progress や status を更新
        // progress: { increment: products.length }
      },
    });

    // 5) 次のページがあれば再度Pub/SubにPublish
    if (hasMore && nextCursor) {
      await publishToPubSub("PRODUCT_SYNC_TOPIC", {
        taskId,
        shopDomain,
        cursor: nextCursor,
        pageSize,
      });
    } else {
      // すべて完了
      // DBに完了ステータスを記録など
      await prisma.store.update({
        where: { storeId: shopDomain },
        data: {
          // e.g. status: "COMPLETED"
        },
      });
    }

    return json({ success: true });
  } catch (error: any) {
    console.error("PubSub Handler Error:", error);
    return json({ error: error.message || "Unknown error" }, { status: 500 });
  }
};
