
import { ShopifyService } from "../integrations/shopify/ShopifyService";
import { q_FetchOrders } from "../integrations/shopify/query/q_fetchOrders";
import { DifyService } from "../integrations/dify/DifyService";
import { convertOrdersToText } from "../lib/helpers";
import { DatasetIndexingStatus, DatasetType } from "../lib/types";
import { delay } from "../lib/helpers";
import type { Order, PageInfo } from "../integrations/shopify/types";
import { DATASET_INDEXING_LIMIT_SIZE } from "../lib/constants";
import { getStoreWithDatasets } from "../controllers/store.controller";
import {
  upsertDataset,
  createDataset,
} from "../controllers/dataset.controller";
import { ShopifyGraphQLError, DifyProcessingError } from "../lib/errors";
/**
 * すべてのOrderをページネーションで取得しながらDifyにインデックス化し、
 * 取得したOrderの配列を返す。
 *
 * @param shopDomain - Shopifyのショップドメイン
 * @param accessToken - Shopifyのアクセストークン
 * @param pageSize - 1回のGraphQL呼び出しで取得するOrder数
 */
export async function fetchAndIndexAllOrders(
    shopDomain: string,
    accessToken: string,
    pageSize: number,
  ): Promise<Order[]> {
    const difyService = new DifyService(
      process.env.DIFY_API_KEY!,
      process.env.DIFY_BASE_URL!,
    );
  
    let page = 1;
    let cursor: string | null = null;
    let allOrders: Order[] = [];
    let orderBuffer: Order[] = [];
    let indexedTotalCount = 0;
  
    while (true) {
      console.log(`=== Fetching page ${page} (pageSize: ${pageSize}) ===`);
      page++;
  
      // 1. Shopifyからデータを取得
      const { orders, pageInfo } = await paginateOrders(
        shopDomain,
        accessToken,
        cursor,
        pageSize,
      );
  
      // 2. 結果をバッファ＆全体配列に格納
      orderBuffer.push(...orders);
      allOrders.push(...orders);
  
      // 3. 指定サイズ(DATASET_INDEXING_LIMIT_SIZE)まで溜まったらDify送信
      while (orderBuffer.length >= DATASET_INDEXING_LIMIT_SIZE) {
        const chunk = orderBuffer.splice(0, DATASET_INDEXING_LIMIT_SIZE);
        indexedTotalCount += chunk.length;
  
        await sendOrdersToDify(
          difyService,
          shopDomain,
          chunk,
          indexedTotalCount - chunk.length,
          indexedTotalCount,
        );
      }
  
      // 次ページが存在しないなら終了
      if (!pageInfo?.hasNextPage) {
        break;
      }
  
      // 次のカーソルをセット
      cursor = pageInfo.endCursor;
  
      // 連続で大量に取得するのを避けるためのウェイト（必要に応じて変更）
      await delay(5000);
    }
  
    // 4. 端数バッファが残っていればDify送信
    if (orderBuffer.length > 0) {
      indexedTotalCount += orderBuffer.length;
      await sendOrdersToDify(
        difyService,
        shopDomain,
        orderBuffer,
        indexedTotalCount - orderBuffer.length,
        indexedTotalCount,
      );
      orderBuffer = [];
    }
  
    return allOrders;
  }
  
  /**
   * 1回分のGraphQL呼び出しを行い、Ordersとページ情報を返却する。
   *
   * @param shopDomain - Shopifyのショップドメイン
   * @param accessToken - Shopifyのアクセストークン
   * @param cursor - 前回の最後のOrderのカーソル
   * @param pageSize - 1回のGraphQL呼び出しで取得するOrder数
   */
  async function paginateOrders(
    shopDomain: string,
    accessToken: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<{ orders: Order[]; pageInfo: PageInfo }> {
    const data = await fetchOrders(shopDomain, accessToken, cursor, pageSize);
    const { orders, pageInfo } = extractOrderData(data);
    return { orders, pageInfo };
  }
  
  /**
   * ShopifyのGraphQLエンドポイントを安全に呼び出し、
   * 返却されたレスポンスをそのまま返す。
   */
  export async function fetchOrders(
    shopDomain: string,
    accessToken: string,
    cursor: string | null,
    pageSize: number,
  ) {
    try {
      // GraphQL呼び出し時のパラメータ確認
      if (!shopDomain || !accessToken) {
        throw new ShopifyGraphQLError(
          `Invalid parameters to fetchOrders - shopDomain: ${shopDomain}, accessToken: ${accessToken}`,
        );
      }
      const shopifyService = new ShopifyService(accessToken, shopDomain);
  
      const response = await shopifyService.graphQL.safeShopifyGraphQLCall(
        shopDomain,
        q_FetchOrders,
        {
          cursor,
          pageSize,
        },
      );
      return {
        pageSize,
        cursor,
        data: response.data,
      };
    } catch (err: any) {
      console.error("[fetchOrders] Error during Shopify GraphQL call:", err);
      throw new ShopifyGraphQLError("Shopify GraphQL request failed", err);
    }
  }
  
  /**
   * GraphQLレスポンスからOrder配列とページ情報を抽出して返す。
   */
  function extractOrderData(data: any): {
    orders: Order[];
    pageInfo: PageInfo;
  } {
    try {
      const edges = data?.data?.orders?.edges || [];
      const pageInfo = data?.data?.orders?.pageInfo;
      const orders: Order[] = edges.map((edge: any) => edge.node);
  
      if (!pageInfo) {
        throw new Error("pageInfo is missing in the response");
      }
  
      return { orders, pageInfo };
    } catch (err: any) {
      console.error("[extractOrderData] Error extracting order data:", err);
      throw new ShopifyGraphQLError("Invalid structure in Shopify response", err);
    }
  }
  
  /**
   * DifyにOrder情報を送り、Dataset & Documentを作成・更新する。
   *
   * @param difyService - DifyServiceインスタンス
   * @param shopDomain - Shopifyのショップドメイン
   * @param orders - 送信対象のOrder配列
   * @param startIndex - 送信開始Index(表示用)
   * @param endIndex - 送信終了Index(表示用)
   */
  async function sendOrdersToDify(
    difyService: DifyService,
    shopDomain: string,
    orders: Order[],
    startIndex: number,
    endIndex: number,
  ) {
    let datasetId: string | null = null;
  
    try {
      // 1. storeに紐づくDatasetを取得
      const storeWithDatasets = await getStoreWithDatasets(shopDomain);
      const existingDataset = storeWithDatasets?.datasets?.find(
        (doc: { type: string }) => doc.type === DatasetType.ORDERS,
      );
      const hasOrdersDataset = !!existingDataset;
  
      // 2. なければ新規作成、あれば既存のDataset IDを利用
      if (storeWithDatasets && hasOrdersDataset) {
        datasetId = existingDataset?.datasetId ?? null;
      } else {
        datasetId = await createDataset(DatasetType.ORDERS, shopDomain);
      }
  
      if (!datasetId) {
        throw new Error(
          "Dataset ID is not found (failed to create or retrieve).",
        );
      }
  
      // 3. Documentを作成しDifyに送信
      const title = `${DatasetType.ORDERS}-${startIndex + 1}~${endIndex}`;
      const text = convertOrdersToText(orders);
  
      // Document生成リクエストの準備
      const createDocumentRequest =
        await difyService.document.generateHierarchicalDocumentRequest(
          {
            name: title,
            text: text
          }
        );
      // Document作成
      const document = await difyService.document.createDocumentByText(
        datasetId,
        createDocumentRequest,
      );
  
      // 4. Datasetの最新状況を更新
      await upsertDataset(
        datasetId,
        DatasetType.ORDERS,
        shopDomain,
        document.batch,
        DatasetIndexingStatus.INDEXING,
      );
    } catch (err: any) {
      console.error("[sendOrdersToDify] Error sending orders to Dify:", err);
      throw new DifyProcessingError("Failed to send orders to Dify", err);
    }
  }