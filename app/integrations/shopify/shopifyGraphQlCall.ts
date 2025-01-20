// app/integrations/shopify/serverApi.ts
import fetch from "node-fetch";

type ShopifyGraphQLOptions = {
  query: string;
  variables?: Record<string, any>;
};

/**
 * DBに保存済みのアクセストークン + shopDomain を使ってShopify GraphQLを直接呼び出す例
 */
export async function shopifyGraphQLCall(
  shopDomain: string,
  accessToken: string,
  { query, variables }: ShopifyGraphQLOptions
) {
  const endpoint = `https://${shopDomain}/admin/api/2024-10/graphql.json`; 
  // ↑ APIバージョンは適宜変更

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text(); // 失敗時にエラー内容を把握
    throw new Error(`GraphQL request failed: ${res.status} - ${errorBody}`);
  }

  const json = await res.json();
  return json;
}
