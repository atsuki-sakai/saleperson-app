// app/routes/api.syncProducts.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { shopifyGraphQLCall } from "../services/shopify/shopifyGraphQlCall";
import { quantityFetchProducts } from "../services/shopify/query/q_fetchProducts";

/**
 * 3秒スリープのラッパ
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * エラーが出たらリトライするようなラッパ
 *  - スリープ時間を引数で受け取り、429が来たらさらに延長しつつ再試行する例
 */
async function safeShopifyGraphQLCall(
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
      // 429などが返ってきた場合はエラーメッセージやステータスコードをチェック
      if (
        typeof error.message === "string" &&
        (error.message.includes("429") ||
          error.message.includes("Too Many Requests"))
      ) {
        console.error(
          `[WARN] Throttled error detected. Retry count=${retryCount}`,
        );
        // リトライ回数をある程度制限したい場合はここでreturnするor throwする手もある
        // ここでは無限リトライ想定なのでスリープをして再試行
        retryCount += 1;
        sleepTime = sleepTime * 1.5; // Exponential backoffの例: 3秒 -> 4.5秒 -> 6.75秒...
        await delay(sleepTime);
        console.log("sleepTime", sleepTime);
        continue;
      } else {
        // 429以外のエラーは単純にthrow
        throw error;
      }
    }
  }
}

/**
 * 実際に全ページの商品を取得して返す関数
 *  - ページ毎にGraphQLを呼び出し
 *  - 3秒スリープ
 *  - hasNextPage=true ならendCursorを次のcursorとして再度取得
 */
async function fetchAllProducts(
  shopDomain: string,
  accessToken: string,
  pageSize: number,
) {
  let allProducts: any[] = [];
  let cursor: string | null = null;

  while (true) {
    console.log("fetchAllProducts");
    // 3秒スリープ
    await delay(3000);

    // GraphQL呼び出し (429を考慮したsafeラッパ)
    const data = await safeShopifyGraphQLCall(
      shopDomain,
      accessToken,
      quantityFetchProducts,
      {
        cursor,
        pageSize,
      },
    );
    const edges =
      data?.data?.products?.edges.map((edge: any) => edge.node) || [];
    const pageInfo = data?.data?.products?.pageInfo;

    console.log("edges", edges[0].description);

    // 今回取得した分をまとめてallProductsへ追加
    for (const edge of edges) {
      allProducts.push(edge.node);
    }

    // 次のページが無ければループ終了
    if (!pageInfo?.hasNextPage) {
      break;
    }
    // 次ページのカーソルをセット
    cursor = pageInfo.endCursor;
  }

  return allProducts;
}

/**
 * RemixのAction
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { taskId, shopDomain } = await request.json();

  // TaskやStoreの確認
  const store = await prisma.store.findUnique({
    where: { storeId: shopDomain },
    select: { accessToken: true },
  });
  if (!store?.accessToken) {
    return json({ error: "Store or accessToken not found" }, { status: 404 });
  }

  // すべての商品を取得 (1ページ50件ずつ)
  try {
    const allProducts = await fetchAllProducts(
      shopDomain,
      store.accessToken,
      50,
    );

    // 必要に応じてDB保存や別の処理を行う
    console.log(`取得件数: ${allProducts.length}件`);
    console.log("allProducts", allProducts[0]);

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
      },
    });
    console.log("task updated");

    return json({
      success: true,
      totalProducts: allProducts.length,
      firstProductTitle: allProducts[0]?.title || "(no products)",
    });
  } catch (err: any) {
    console.error("Error fetching all products:", err);
    return json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
