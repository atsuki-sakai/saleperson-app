// app/routes/pubsub.webhook.tsx
import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { getPubSubPayload, publishToPubSub } from "../services/pubsub.server";
import { fetchShopifyProducts } from "../services/shopify/fetchShopifyProducts";
import {
  upsertProducts,
  clensingProductDataToText,
} from "../models/documents.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const payload = await getPubSubPayload(request);
    const { taskId, shopDomain, cursor, pageSize } = payload;

    // 1) Taskを PROCESSING に更新
    const task = await prisma.task.upsert({
      where: {
        storeId_type: {
          storeId: shopDomain,
          type: "PRODUCT_SYNC",
        },
      },
      update: {
        status: "IN_PROGRESS",
        updatedAt: new Date(),
      },
      create: {
        id: taskId,
        status: "IN_PROGRESS",
        storeId: shopDomain,
        type: "PRODUCT_SYNC",
      },
    });

    // 2) Shopifyから商品取得
    const { products, hasMore, nextCursor } = await fetchShopifyProducts(
      request,
      cursor,
    );
    // const productText = clensingProductDataToText(products, shopDomain);

    // 3) Difyに送る
    // await upsertProducts(shopDomain, productText);

    // 4) taskの progressCount を加算
    const updatedTask = await prisma.task.update({
      where: {
        storeId_type: {
          storeId: shopDomain,
          type: "PRODUCT_SYNC",
        },
      },
      data: {
        progressCount: { increment: products.length },
        cursor: nextCursor ?? undefined,
      },
    });

    // 5 次のページがあれば Pub/Sub再発行、なければCOMPLETED
    if (hasMore && nextCursor) {
      console.log("Publishing to PubSub with payload:", {
        taskId,
        shopDomain,
        cursor: nextCursor,
        pageSize,
      });

      try {
        await publishToPubSub("PRODUCT_SYNC_TOPIC", {
          taskId,
          shopDomain,
          cursor: nextCursor,
          pageSize,
        });
        console.log("Successfully published to PubSub");
      } catch (pubsubError) {
        console.error("PubSub publish error:", pubsubError);
        throw pubsubError;
      }
    } else {
      // 最終ページ → COMPLETED に更新
      await prisma.task.update({
        where: {
          storeId_type: {
            storeId: shopDomain,
            type: "PRODUCT_SYNC",
          },
        },
        data: {
          status: "COMPLETED",
          updatedAt: new Date(),
        },
      });
    }

    return json({ success: true });
  } catch (error: any) {
    console.error("PubSub Handler Error:", error);
    // TaskをERRORに更新
    //  (taskIdが存在しない場合はtry-catch or optionalで対策)
    if (error?.message && error?.stack) {
      await prisma.task.updateMany({
        where: { id: error.taskId }, // or { id: taskId } if you still have it
        data: {
          status: "ERROR",
          errorMessage: String(error.message).slice(0, 500), // 長すぎる場合は切り捨て
        },
      });
    }

    return json({ error: error.message || "Unknown error" }, { status: 500 });
  }
};
