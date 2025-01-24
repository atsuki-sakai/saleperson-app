import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getStoreAccessToken } from "../controllers/store.controller";
import { ShopifyGraphQLError, DifyProcessingError } from "../lib/errors";
import { fetchAndIndexPolicies } from "../controllers/policies.controller";

/**
 * Shopifyからポリシーを取得し、Difyにインデックス化する処理。
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

    // 1. まとめてポリシーを取得＆Difyにインデックス化
    await fetchAndIndexPolicies(shopDomain, accessToken);
    console.log("updated policies");

    return json({
      success: true,
    });
  } catch (err: any) {
    // 共通のエラーハンドリング
    console.error("[action] Error fetching policies:", err);

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
