// integrations/shopify/fetchShopifyProducts.ts
import { authenticate } from "../../shopify.server";
import { Product } from "./types";
import { q_FetchProducts } from "./query/q_fetchProducts";
/** 
 * Shopify Product Pagination Response
 */
export type ShopifyProductsPage = {
  products: Product[];
  hasNextPage: boolean;
  endCursor: string | null;
};

/**
 * 商品データを取得する関数 (ページネーション対応).
 * 
 * @param request   Remix等のRequest
 * @param cursor    次のページを取得するためのカーソル (nullの場合、最初から)
 * @param pageSize  1ページあたりの取得件数 (デフォルト: 50)
 */
export async function fetchShopifyProducts(
  request: Request,
  cursor: string | null = null,
  pageSize = 50,
): Promise<ShopifyProductsPage> {
  // 1. Admin APIを取得
  const { admin } = await authenticate.admin(request);

  // 2. GraphQLリクエストを投げる
  const response = await admin.graphql(
    q_FetchProducts,
    {
      variables: {
        cursor,
        pageSize,
      },
    },
  );

  // 3. レスポンスのステータスコードをチェック
  if (response.status === 429) {
    throw new Error("Throttled");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Shopify API Error:", response.status, errorBody);
    throw new Error(`Shopify API Error: ${response.status}`);
  }

  // 4. レスポンスをJSON化し、エラーがあればthrow
  const rawJson = await response.json();


  // 6. ページネーション情報を取り出す
  const data = rawJson.data.products;
  const products = data.edges.map((edge: any) => edge.node) as Product[];
  const hasNextPage: boolean = data.pageInfo.hasNextPage;
  const endCursor: string | null = data.pageInfo.endCursor || null;

  // 7. 返却
  return { products, hasNextPage, endCursor };
}
