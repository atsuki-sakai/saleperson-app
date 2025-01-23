import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { q_FetchProducts } from "../integrations/shopify/query/q_fetchProducts";
import { DifyService } from "../integrations/dify/DifyService";
import { CHUNK_SEPARATOR_SYMBOL } from "../lib/constants";
import { DatasetType } from "../lib/types";
import { ICreateDocumentByTextRequest } from "../integrations/dify/types";
import { convertProductsToText } from "../controllers/helpers";

// function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// // 429が返ってきた場合にリトライする安全ラッパ
// async function safeShopifyGraphQLCall(
//   shopDomain: string,
//   accessToken: string,
//   query: string,
//   variables: { cursor: string | null; pageSize: number },
//   baseSleepMs = 3000,
// ): Promise<any> {
//   let retryCount = 0;
//   let sleepTime = baseSleepMs;

//   while (true) {
//     try {
//       const data = await shopifyGraphQLCall(shopDomain, accessToken, {
//         query,
//         variables,
//       });
//       return data;
//     } catch (error: any) {
//       if (
//         typeof error.message === "string" &&
//         (error.message.includes("429") ||
//           error.message.includes("Too Many Requests"))
//       ) {
//         console.error(
//           `[WARN] Throttled error detected. Retry count=${retryCount}`,
//         );
//         retryCount += 1;
//         sleepTime = sleepTime * 1.5; // Exponential backoff
//         await delay(sleepTime);
//         console.log("sleepTime", sleepTime);
//         continue;
//       } else {
//         throw error;
//       }
//     }
//   }
// }

// /**
//  * Difyに送信（dataset & document作成）する処理をまとめたヘルパー
//  *  - 300件のチャンクごとに呼び出したい
//  */
// async function sendProductsToDify(
//   difyService: DifyService,
//   shopDomain: string,
//   products: any[], // 300件分 or 残り
//   startIndex: number,
//   endIndex: number,
// ) {
//   // const chunkTask = await prisma.task.create({
//   //   data: {
//   //     storeId: shopDomain,
//   //     type: "PRODUCT_CHUNK_SYNC",
//   //     status: "IN_PROGRESS",
//   //   },
//   // });

//   let datasetId: string | null = null;
//   const datasetName = `${shopDomain}-Products`;
//   const prismaStore = await prisma.store.findFirst({
//     where: {
//       storeId: shopDomain,
//     },
//     select: {
//       datasets: {
//         where: {
//           type: DatasetType.PRODUCTS,
//           name: datasetName,
//         },
//         select: {
//           datasetId: true,
//         },
//       },
//     },
//   });

//   if (prismaStore?.datasets.length && prismaStore.datasets.length > 0) {
//     datasetId = prismaStore.datasets[0].datasetId;
//     console.log("datasetId", datasetId);
//     console.log("prismaStore", prismaStore);
//     console.log("prismaStore.datasets", prismaStore.datasets);
//   } else {
//     // datasetを作成
//     const dataset = await difyService.dataset.createDataset({
//       name: `Products`,
//       description: `Products Dataset`,
//       indexing_technique: "high_quality",
//       permission: "only_me",
//     });
//     datasetId = dataset.id;
//     await prisma.dataset.create({
//       data: {
//         datasetId: dataset.id,
//         name: datasetName,
//         type: DatasetType.PRODUCTS,
//         storeId: shopDomain,
//       },
//     });
//   }

//   // let summaries: string[] = [];
//   // await Promise.all(
//   //   products.map(async (product: any) => {
//   //     const summary = await convertProductToText(product, shopDomain);
//   //     console.log("summary", summary);
//   //     summaries.push(summary);
//   //   }),
//   // );

//   // console.log("summaries", summaries);
//   // const longText = summaries.join(CHUNK_SEPARATOR_SYMBOL);
//   // console.log("longText", longText);

//   // documentを作成
//   const createDocumentRequest: ICreateDocumentByTextRequest = {
//     name: `${startIndex + 1}~${endIndex}`,
//     text: await convertProductsToText(products, shopDomain), // 300件ぶんのテキスト
//     indexing_technique: "high_quality",
//     doc_form: "hierarchical_model",
//     doc_language: "ja",
//     process_rule: {
//       mode: "hierarchical",
//       rules: {
//         pre_processing_rules: [
//           {
//             id: "remove_extra_spaces",
//             enabled: true,
//           },
//           {
//             id: "remove_urls_emails",
//             enabled: false,
//           },
//         ],
//         segmentation: {
//           separator: CHUNK_SEPARATOR_SYMBOL,
//           max_tokens: 4000,
//           chunk_overlap: 50,
//         },
//         parent_mode: "paragraph",
//         subchunk_segmentation: {
//           separator: "\n",
//           max_tokens: 500,
//           chunk_overlap: 50,
//         },
//       },
//     },
//   };

//   const document = await difyService.document.createDocumentByText(
//     datasetId!,
//     createDocumentRequest,
//   );
//   // await prisma.task.upsert({
//   //   where: { id: chunkTask.id },
//   //   update: {
//   //     batch: document.batch,
//   //     datasetId,
//   //     status: "INDEXING",
//   //   },
//   //   create: {
//   //     storeId: shopDomain,
//   //     type: "PRODUCT_CHUNK_SYNC",
//   //     status: "INDEXING",
//   //     batch: document.batch,
//   //     datasetId,
//   //   },
//   // });
//   console.log("document", document);
// }

// /**
//  * 全商品の取得と、300件ずつDifyに送信
//  */
// async function fetchAllProducts(
//   shopDomain: string,
//   accessToken: string,
//   pageSize: number,
// ) {
//   let count = 1; // ページ読み込みカウント（何ページ目か）
//   let currntFetchProductCount = 0; // どこまで取得したかの数
//   let allProducts: any[] = []; // 全商品を入れておく配列（必要なら返す）
//   let cursor: string | null = null;

//   // ▼ ここから追加・変更 ▼
//   // 300件ずつ送信したいためのバッファとインデックス管理
//   const CHUNK_SIZE = 100;
//   let productBuffer: any[] = []; // 300件を貯める一時バッファ
//   let fetchedTotal = 0; // 何件フェッチ(=バッファ)したかの累計
//   // ▲ ここまで追加・変更 ▲

//   const difyService = new DifyService(
//     process.env.DIFY_API_KEY!,
//     process.env.DIFY_BASE_URL!,
//   );

//   while (true) {
//     currntFetchProductCount = pageSize * count;
//     console.log("fetchAllProducts count", currntFetchProductCount);

//     // 5秒スリープ
//     await delay(5000);

//     // 50件単位( pageSize )ごとにGraphQLを呼び出す
//     const data = await safeShopifyGraphQLCall(
//       shopDomain,
//       accessToken,
//       q_FetchProducts,
//       { cursor, pageSize },
//     );
//     count++;
//     // 取得した商品
//     const edges = data?.data?.products?.edges || [];
//     const pageInfo = data?.data?.products?.pageInfo;

//     // バッファに追加
//     for (const edge of edges) {
//       productBuffer.push(edge.node);
//     }

//     // allProducts にも追加（必要があれば）
//     allProducts.push(...edges.map((e: any) => e.node));

//     // 300件たまったらDifyへ送信（複数回溜まる場合は while で回す）
//     while (productBuffer.length >= CHUNK_SIZE) {
//       const chunk = productBuffer.splice(0, CHUNK_SIZE);
//       fetchedTotal += CHUNK_SIZE;

//       await sendProductsToDify(
//         difyService,
//         shopDomain,
//         chunk,
//         fetchedTotal - CHUNK_SIZE, // startIndex
//         fetchedTotal, // endIndex
//       );
//     }

//     // 次のページがなければループ終了
//     if (!pageInfo?.hasNextPage) {
//       break;
//     }
//     // カーソルを次に進める
//     cursor = pageInfo.endCursor;
//   }

//   // ループが終わったら、300件未満の端数を送信
//   if (productBuffer.length > 0) {
//     const leftover = productBuffer.splice(0, productBuffer.length);
//     const startIndex = fetchedTotal; // 何件目からか
//     fetchedTotal += leftover.length; // 端数を加算
//     await sendProductsToDify(
//       difyService,
//       shopDomain,
//       leftover,
//       startIndex,
//       fetchedTotal,
//     );
//   }

//   return allProducts;
// }

// /**
//  * Remixの Action
//  */
// export async function action({ request }: ActionFunctionArgs) {
//   if (request.method !== "POST") {
//     return json({ error: "Method not allowed" }, { status: 405 });
//   }

//   const { shopDomain, mainTaskId } = await request.json();
//   console.log("shopDomain", shopDomain);

//   // TaskやStoreの確認
//   const store = await prisma.store.findUnique({
//     where: { storeId: shopDomain },
//     select: { accessToken: true },
//   });
//   if (!store?.accessToken) {
//     return json({ error: "Store or accessToken not found" }, { status: 404 });
//   }

//   // 全商品を取得しつつ、300件単位でDifyへ送信
//   try {
//     const allProducts = await fetchAllProducts(
//       shopDomain,
//       store.accessToken,
//       50,
//     );

//     // await prisma.task.update({
//     //   where: { id: mainTaskId },
//     //   data: {
//     //     status: "COMPLETED",
//     //   },
//     // });
//     console.log(`取得件数: ${allProducts.length}件`);

//     console.log("task updated");

//     return json({
//       success: true,
//       totalProducts: allProducts.length,
//       firstProductTitle: allProducts[0]?.title || "(no products)",
//     });
//   } catch (err: any) {
//     console.error("Error fetching all products:", err);
//     return json({ error: err.message || "Unknown error" }, { status: 500 });
//   }
// }

export async function action({ request }: ActionFunctionArgs) {
  return json({ success: true });
}
