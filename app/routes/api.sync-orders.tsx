import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getStoreAccessToken } from "../controllers/store.controller";
import { ShopifyGraphQLError, DifyProcessingError } from "../lib/errors";
import { fetchAndIndexAllOrders } from "../controllers/order.controller";

/**
 * ページネーションしながらShopifyからOrdersを取得する処理。
 * 取得したOrderは指定サイズに応じてバッファに格納し、溜まったタイミングでDifyに送信する。
 * 全件取り切った後にバッファが残っていれば、それも送信する。
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { shopDomain } = await request.json();
    if (!shopDomain) {
      return json({ error: "shopDomain is required" }, { status: 400 });
    }

    const accessToken = await getStoreAccessToken(shopDomain);
    if (!accessToken) {
      return json(
        { error: `No access token found for shop: ${shopDomain}` },
        { status: 404 },
      );
    }

    // 1. まとめて注文を取得＆Difyにインデックス化
    const allOrders = await fetchAndIndexAllOrders(shopDomain, accessToken, 50);

    console.log(`取得件数: ${allOrders.length}件`);
    console.log("task updated");

    return json({
      success: true,
      totalOrders: allOrders.length,
      firstOrderTitle: allOrders[0]?.name || "(no orders)",
    });
  } catch (err: any) {
    // 共通のエラーハンドリング
    console.error("[action] Error fetching all orders:", err);

    // カスタムエラーであれば、より詳細な情報を付与
    if (err instanceof ShopifyGraphQLError) {
      return json(
        {
          error: err.message || "Shopify GraphQL Error",
          details: err.originalError?.message || err,
        },
        { status: 500 },
      );
    } else if (err instanceof DifyProcessingError) {
      return json(
        {
          error: err.message || "Dify Processing Error",
          details: err.originalError?.message || err,
        },
        { status: 500 },
      );
    }

    // 汎用エラー
    return json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
