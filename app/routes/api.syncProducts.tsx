import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { shopifyGraphQLCall } from "../services/shopify/shopifyGraphQlCall";
import { quantityFetchProducts } from "../services/shopify/query/q_fetchProducts";
import { DifyService } from "../services/dify/DifyService";
import { CHUNK_SEPARATOR_SYMBOL } from "../services/dify/const";
import { ICreateDocumentByTextRequest } from "../services/dify/types";
import { convertProductsToText } from "app/services/helper/data-clensing";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 429が返ってきた場合にリトライする安全ラッパ
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

/**
 * Difyに送信（dataset & document作成）する処理をまとめたヘルパー
 *  - 300件のチャンクごとに呼び出したい
 *  - chunkTask という「チャンク専用のタスク」を作成し、Document作成後にステータスとbatchを更新
 */
async function sendProductsToDify(
  difyService: DifyService,
  shopDomain: string,
  products: any[], // 300件分 or 残り
  startIndex: number,
  endIndex: number,
) {
  // 1. チャンク用のタスクを作成（IN_PROGRESS）
  const chunkTask = await prisma.task.create({
    data: {
      storeId: shopDomain,
      type: "PRODUCT_SYNC_CHUNK",
      status: "IN_PROGRESS",
      // 必要に応じてprogressCountなど他のカラムをセット
    },
  });

  // 2. DifyのDatasetを作成
  const dataset = await difyService.dataset.createDataset({
    name: `${shopDomain}-Products-${endIndex}`,
    description: `Products-${startIndex + 1}~${endIndex}`,
    indexing_technique: "high_quality",
    permission: "only_me",
  });

  // 3. Documentを作成
  const documentBody: ICreateDocumentByTextRequest = {
    name: `${startIndex + 1}~${endIndex}`,
    text: convertProductsToText(products, shopDomain), // 300件ぶんのテキスト
    indexing_technique: "high_quality",
    doc_form: "hierarchical_model",
    doc_language: "ja",
    process_rule: {
      mode: "hierarchical",
      rules: {
        pre_processing_rules: [
          {
            id: "remove_extra_spaces",
            enabled: true,
          },
          {
            id: "remove_urls_emails",
            enabled: false,
          },
        ],
        segmentation: {
          separator: CHUNK_SEPARATOR_SYMBOL,
          max_tokens: 4000,
          chunk_overlap: 30,
        },
        parent_mode: "paragraph",
        subchunk_segmentation: {
          separator: "\n",
          max_tokens: 1000,
          chunk_overlap: 30,
        },
      },
    },
  };

  const document = await difyService.document.createDocumentByText(
    dataset.id,
    documentBody,
  );
  console.log("document", document);

  // 4. チャンク用タスクをINDEXINGに変更し、batchを保存
  await prisma.task.update({
    where: { id: chunkTask.id },
    data: {
      status: "INDEXING",
      batch: document.batch || null, // docのbatchを保存 (nullになる場合もあるので注意)
    },
  });
}

/**
 * 全商品の取得と、300件ずつDifyに送信
 *  - メインタスク (mainTaskId) は呼び出し元で作成しておき、それをここで参照して処理が完了したらメインタスクを更新
 */
async function fetchAllProducts(
  shopDomain: string,
  accessToken: string,
  pageSize: number,
  mainTaskId: string,
) {
  let count = 1; // ページ読み込みカウント（何ページ目か）
  let currentFetchProductCount = 0; // どこまで取得したかの数
  let allProducts: any[] = []; // 全商品を入れておく配列（必要なら返す）
  let cursor: string | null = null;

  // 300件ずつ送信したいのでバッファとインデックス管理
  const CHUNK_SIZE = 300;
  let productBuffer: any[] = []; // 300件を貯める一時バッファ
  let fetchedTotal = 0; // 何件フェッチ(=バッファ)したかの累計

  const difyService = new DifyService(
    process.env.DIFY_API_KEY!,
    process.env.DIFY_BASE_URL!,
  );

  while (true) {
    currentFetchProductCount = pageSize * count;
    console.log("fetchAllProducts count", currentFetchProductCount);

    // 5秒スリープ
    await delay(5000);

    // 50件単位( pageSize )ごとにGraphQLを呼び出す
    const data = await safeShopifyGraphQLCall(
      shopDomain,
      accessToken,
      quantityFetchProducts,
      { cursor, pageSize },
    );
    count++;
    // 取得した商品
    const edges = data?.data?.products?.edges || [];
    const pageInfo = data?.data?.products?.pageInfo;

    // バッファに追加
    for (const edge of edges) {
      productBuffer.push(edge.node);
    }

    // allProducts にも追加（必要があれば）
    allProducts.push(...edges.map((e: any) => e.node));

    // 300件たまったらDifyへ送信
    while (productBuffer.length >= CHUNK_SIZE) {
      const chunk = productBuffer.splice(0, CHUNK_SIZE);
      fetchedTotal += CHUNK_SIZE;
      // チャンクデータをDifyへ送信し、タスクを作成/更新
      await sendProductsToDify(
        difyService,
        shopDomain,
        chunk,
        fetchedTotal - CHUNK_SIZE,
        fetchedTotal,
      );
    }

    // 次のページがなければループ終了
    if (!pageInfo?.hasNextPage) {
      break;
    }
    // カーソルを次に進める
    cursor = pageInfo.endCursor;
  }

  // 300件未満の端数を送信
  if (productBuffer.length > 0) {
    const leftover = productBuffer.splice(0, productBuffer.length);
    const startIndex = fetchedTotal; // 何件目からか
    fetchedTotal += leftover.length; // 端数を加算

    await sendProductsToDify(
      difyService,
      shopDomain,
      leftover,
      startIndex,
      fetchedTotal,
    );
  }

  // すべての商品送信が終わったら、メインタスクをINDEXINGにしてもよいし、
  // あるいはCOMPLETEDにするなど、要件に合わせてステータスを変更
  // 今回は「DifyへのDoc作成が完了したあとメインタスクをINDEXINGにする」という例で更新
  await prisma.task.update({
    where: { id: mainTaskId },
    data: {
      status: "INDEXING",
    },
  });

  return allProducts;
}
