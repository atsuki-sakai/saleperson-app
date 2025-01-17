// services/shopify/fetchShopifyProducts.ts
import { authenticate } from "../../shopify.server";
import { Product } from "./types";

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
    `#graphql
    query getProducts($cursor: String, $pageSize: Int) {
      products(first: $pageSize, after: $cursor) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            vendor
            status
            totalInventory
            createdAt
            updatedAt
            options {
              id
              name
              values
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantCompareAtPrice {
                amount
                currencyCode
              }
              maxVariantCompareAtPrice {
                amount
                currencyCode
              }
            }
            metafields(first: 10) {
              edges {
                node {
                  namespace
                  key
                  value
                  type
                }
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  sku
                  inventoryQuantity
                  price
                  compareAtPrice
                  selectedOptions {
                    name
                    value
                  }
                  metafields(first: 5) {
                    edges {
                      node {
                        namespace
                        key
                        value
                        type
                      }
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
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
