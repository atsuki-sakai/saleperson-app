// app/routes/api.syncProducts.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { fetchShopifyProducts } from "../services/shopify/fetchShopifyProducts";
import {
  clensingProductDataToText,
  upsertProducts,
} from "../models/documents.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // リクエストBodyからパラメータを読み取る
  const { taskId, shopDomain, cursor: initialCursor } = await request.json();

  // タスクレコードを確認
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Response("Task not found", { status: 404 });
  }

  try {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const maxRetries = 3;
    let retryCount = 0;
    let hasNextPage = true;
    let currentCursor: string | null = initialCursor;

    while (hasNextPage) {
      retryCount = 0;
      let success = false;

      while (!success && retryCount < maxRetries) {
        try {
          // APIリクエスト前に3秒待機
          await delay(3000);
          console.log("3秒待機");

          // 商品データの取得
          const {
            products,
            endCursor,
            hasNextPage: nextPage,
          } = await fetchShopifyProducts(request, currentCursor);

          console.log("Fetched products:", products.length);
          console.log("End cursor:", endCursor);
          console.log("Has next page:", nextPage);

          // 商品データの処理
          if (products && products.length > 0) {
            const formattedContent = clensingProductDataToText(
              products,
              shopDomain,
            );
            await upsertProducts(shopDomain, formattedContent);

            // タスクの進捗を更新
            await prisma.task.update({
              where: { id: taskId },
              data: {
                progressCount: { increment: products.length },
                totalCount: { increment: products.length },
                status: nextPage ? "IN_PROGRESS" : "COMPLETED",
                cursor: endCursor,
                updatedAt: new Date(),
              },
            });
          }

          // カーソルとページネーション情報を更新
          currentCursor = endCursor;
          hasNextPage = nextPage;
          success = true;
        } catch (error: any) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, error);

          if (error.message === "Throttled" && retryCount < maxRetries) {
            console.warn(
              `Throttled detected. Retrying after ${5000 * retryCount}ms...`,
            );
            await delay(5000 * retryCount);
            continue;
          }
          throw error;
        }
      }

      if (!success) {
        throw new Error(
          "商品データの取得に失敗しました。しばらく待ってから再度お試しください。",
        );
      }
    }

    return json({ success: true, type: "products", store: null });
  } catch (error: any) {
    console.error("SyncProducts Action Error:", error);
    // エラー時はタスクを更新
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "ERROR",
        errorMessage: error.message || "不明なエラーが発生しました",
        updatedAt: new Date(),
      },
    });

    return json(
      { success: false, error: error.message || "不明なエラーが発生しました" },
      { status: 500 },
    );
  }
}
