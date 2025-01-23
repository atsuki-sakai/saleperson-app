import { SHOPIFY_API_VERSION } from "app/lib/constants";
import { delay } from "app/lib/helpers";
interface IShopifyGraphQLOptions {
  query: string;
  variables: { cursor: string | null; pageSize: number };
}
/**
 * DBに保存済みのアクセストークン + shopDomain を使ってShopify GraphQLを直接呼び出す例
 */
export async function shopifyGraphQLCall(
  shopDomain: string,
  accessToken: string,
  { query, variables }: IShopifyGraphQLOptions
) {
  const endpoint = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

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


// APIのレートリミットで429が返ってきた場合にリトライするラッパー
export async function safeShopifyGraphQLCall(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: { cursor: string | null; pageSize: number },
  baseSleepMs = 3000,
): Promise<any> {
  let retryCount = 0;
  let sleepTime = baseSleepMs;

  while (true) {
    try {
      const data = await shopifyGraphQLCall(shopDomain, accessToken, {
        query,
        variables,
      });
      return data;
    } catch (error: any) {
      if (
        typeof error.message === "string" &&
        (error.message.includes("429") ||
          error.message.includes("Too Many Requests"))
      ) {
        console.error(
          `[WARN] Throttled error detected. Retry count=${retryCount}`,
        );
        retryCount += 1;
        sleepTime = sleepTime * 1.5; // Exponential backoff
        await delay(sleepTime);
        console.log("sleepTime", sleepTime);
        continue;
      } else {
        throw error;
      }
    }
  }
}
