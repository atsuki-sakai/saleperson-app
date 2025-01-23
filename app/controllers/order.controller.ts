import { getStoreAccessToken } from "app/controllers/store.controller";
import { ShopifyService } from "app/integrations/shopify/ShopifyService";
import { DifyService } from "app/integrations/dify/DifyService";    
import { DatasetType } from "app/lib/types";
import { getStoreWithDatasets } from "app/controllers/store.controller";
import { convertOrdersToText } from "app/controllers/helpers";
import { ICreateDocumentByTextRequest, ICreateDocumentByTextResponse } from "app/integrations/dify/types";
import { CHUNK_SEPARATOR_SYMBOL } from "app/lib/constants";
import { delay } from "app/controllers/helpers";
import { safeShopifyGraphQLCall } from "app/integrations/shopify/common";
import { q_FetchOrders } from "app/integrations/shopify/query";
import { DATASET_INDEXING_LIMIT_SIZE } from "app/lib/constants";


/**
 * 全商品の取得と、300件ずつDifyに送信
 */
export async function importOrders(
    shopDomain: string,
    accessToken: string,
    pageSize: number,
  ) {
    let count = 1; // ページ読み込みカウント（何ページ目か）
    let currntFetchOrderCount = 0; // どこまで取得したかの数
    let allOrders: any[] = []; // 全注文を入れておく配列（必要なら返す）
    let cursor: string | null = null;
  
    let orderBuffer: any[] = []; // 300件を貯める一時バッファ
    let fetchedTotal = 0; // 何件フェッチ(=バッファ)したかの累計
  
    const difyService = new DifyService(
      process.env.DIFY_API_KEY!,
      process.env.DIFY_BASE_URL!,
    );
  
    while (true) {
      currntFetchOrderCount = pageSize * count;
      console.log("fetchAllOrders count", currntFetchOrderCount);
  
      // 5秒スリープ
      await delay(5000);
  
      // pageSizeごとにGraphQLを呼び出す
      const data = await safeShopifyGraphQLCall(
        shopDomain,
        accessToken,
        q_FetchOrders,
        { cursor, pageSize },
      );
      count++;
      // 取得した注文
      const edges = data?.data?.orders?.edges || [];
      const pageInfo = data?.data?.orders?.pageInfo;
  
      // バッファに追加
      for (const edge of edges) {
        orderBuffer.push(edge.node);
      }
  
      // allOrders にも追加（必要があれば）
      allOrders.push(...edges.map((e: any) => e.node));

      console.log("allOrders", allOrders.length);
  
      // 300件たまったらDifyへ送信（複数回溜まる場合は while で回す）
      while (orderBuffer.length >= DATASET_INDEXING_LIMIT_SIZE) {
        const chunk = orderBuffer.splice(0, DATASET_INDEXING_LIMIT_SIZE);
        console.log("chunk", chunk);
        fetchedTotal += DATASET_INDEXING_LIMIT_SIZE;
        console.log("fetchedTotal", fetchedTotal);
        console.log("convertOrdersToText", typeof convertOrdersToText(chunk));
        sendTextDataToDify(
          difyService,
          shopDomain,
          convertOrdersToText(chunk),
          fetchedTotal,
          fetchedTotal + DATASET_INDEXING_LIMIT_SIZE,
        );
      }
  
      // 次のページがなければループ終了
      if (!pageInfo?.hasNextPage) {
        break;
      }
      // カーソルを次に進める
      cursor = pageInfo.endCursor;
    }
  
    // ループが終わったら、300件未満の端数を送信
    if (orderBuffer.length > 0) {
      const leftover = orderBuffer.splice(0, orderBuffer.length);
      const startIndex = fetchedTotal; // 何件目からか
      fetchedTotal += leftover.length; // 端数を加算
      await sendTextDataToDify(
        difyService,
        shopDomain,
        convertOrdersToText(leftover),
        startIndex,
        fetchedTotal,
      );
    }
  
    return allOrders;
  }
  
  async function sendTextDataToDify(
    difyService: DifyService,
    shopDomain: string,
    longText: string, // 300件分 or 残り
    startIndex: number,
    endIndex: number,
  ) {
    let datasetId: string | null = null;
    const storeDatasets = await getStoreWithDatasets(shopDomain);
    const orderDataset = storeDatasets?.datasets.find(
      (dataset) => dataset.type === DatasetType.ORDERS,
    );
  
    if (orderDataset) {
      datasetId = orderDataset.id;
    } else {
      const dataset = await difyService.dataset.createDataset({
        name: DatasetType.ORDERS,
        description: `${DatasetType.ORDERS} dataset`,
      });
      datasetId = dataset.id;
    }
    const createDocumentRequest =
      await difyService.document.generateHierarchicalDocumentRequest(
        `${startIndex + 1}~${endIndex}`,
        longText,
      );
    await difyService.document.createDocumentByText(
      datasetId,
      createDocumentRequest,
    );
  }
  