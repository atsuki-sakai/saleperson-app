
import { safeShopifyGraphQLCall } from "../integrations/shopify/common";
import { q_FetchProducts } from "../integrations/shopify/query/q_fetchProducts";
import { DifyService } from "../integrations/dify/DifyService";
import { convertProductsToText } from "../lib/helpers";
import { DatasetIndexingStatus, DatasetType } from "../lib/types";
import { delay } from "../lib/helpers";
import type { Product, PageInfo } from "../integrations/shopify/types";
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
export async function fetchAndIndexAllProducts(
    shopDomain: string,
    accessToken: string,
    pageSize: number,
  ): Promise<Product[]> {
    const difyService = new DifyService(
      process.env.DIFY_API_KEY!,
      process.env.DIFY_BASE_URL!,
    );
  
    let page = 1;
    let cursor: string | null = null;
    let allProducts: Product[] = [];
    let productBuffer: Product[] = [];
    let indexedTotalCount = 0;
  
    while (true) {
      console.log(`=== Fetching page ${page} (pageSize: ${pageSize}) ===`);
      page++;
  
      // 1. Shopifyからデータを取得
      const { products, pageInfo } = await paginateProducts(
        shopDomain,
        accessToken,
        cursor,
        pageSize,
      );
  
      // 2. 結果をバッファ＆全体配列に格納
      productBuffer.push(...products);
      allProducts.push(...products);
  
      // 3. 指定サイズ(DATASET_INDEXING_LIMIT_SIZE)まで溜まったらDify送信
      while (productBuffer.length >= DATASET_INDEXING_LIMIT_SIZE) {
        const chunk = productBuffer.splice(0, DATASET_INDEXING_LIMIT_SIZE);
        indexedTotalCount += chunk.length;
  
        await sendProductsToDify(
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
    if (productBuffer.length > 0) {
      indexedTotalCount += productBuffer.length;
      await sendProductsToDify(
        difyService,
        shopDomain,
        productBuffer,
        indexedTotalCount - productBuffer.length,
        indexedTotalCount,
      );
      productBuffer = [];
    }
  
    return allProducts;
  }
  
  /**
   * 1回分のGraphQL呼び出しを行い、Productsとページ情報を返却する。
   *
   * @param shopDomain - Shopifyのショップドメイン
   * @param accessToken - Shopifyのアクセストークン
   * @param cursor - 前回の最後のProductのカーソル
   * @param pageSize - 1回のGraphQL呼び出しで取得するProduct数
   */
  async function paginateProducts(
    shopDomain: string,
    accessToken: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<{ products: Product[]; pageInfo: PageInfo }> {
    const data = await fetchProducts(shopDomain, accessToken, cursor, pageSize);
    const { products, pageInfo } = extractProductData(data);
    return { products, pageInfo };
  }
  
  /**
   * ShopifyのGraphQLエンドポイントを安全に呼び出し、
   * 返却されたレスポンスをそのまま返す。
   */
  export async function fetchProducts(
    shopDomain: string,
    accessToken: string,
    cursor: string | null,
    pageSize: number,
  ) {
    try {
      // GraphQL呼び出し時のパラメータ確認
      if (!shopDomain || !accessToken) {
        throw new ShopifyGraphQLError(
          `Invalid parameters to fetchProducts - shopDomain: ${shopDomain}, accessToken: ${accessToken}`,
        );
      }
  
      return await safeShopifyGraphQLCall(
        shopDomain,
        accessToken,
        q_FetchProducts,
        {
          cursor,
          pageSize,
        },
      );
    } catch (err: any) {
      console.error("[fetchProducts] Error during Shopify GraphQL call:", err);
      throw new ShopifyGraphQLError("Shopify GraphQL request failed", err);
    }
  }
  
  /**
   * GraphQLレスポンスからOrder配列とページ情報を抽出して返す。
   */
  function extractProductData(data: any): {
    products: Product[];
    pageInfo: PageInfo;
  } {
    try {
      const edges = data?.data?.products?.edges || [];
      const pageInfo = data?.data?.products?.pageInfo;
      const products: Product[] = edges.map((edge: any) => edge.node);
  
      if (!pageInfo) {
        throw new Error("pageInfo is missing in the response");
      }
  
      return { products, pageInfo };
    } catch (err: any) {
      console.error("[extractProductData] Error extracting product data:", err);
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
  async function sendProductsToDify(
    difyService: DifyService,
    shopDomain: string,
    products: Product[],
    startIndex: number,
    endIndex: number,
  ) {
    let datasetId: string | null = null;
  
    try {
      // 1. storeに紐づくDatasetを取得
      const storeWithDatasets = await getStoreWithDatasets(shopDomain);
      const existingDataset = storeWithDatasets?.datasets?.find(
        (doc: { type: string }) => doc.type === DatasetType.PRODUCTS,
      );
      const hasProductsDataset = !!existingDataset;
  
      // 2. なければ新規作成、あれば既存のDataset IDを利用
      if (storeWithDatasets && hasProductsDataset) {
        datasetId = existingDataset?.datasetId ?? null;
      } else {
        datasetId = await createDataset(DatasetType.PRODUCTS, shopDomain);
      }
  
      if (!datasetId) {
        throw new Error(
          "Dataset ID is not found (failed to create or retrieve).",
        );
      }
  
      // 3. Documentを作成しDifyに送信
      const title = `${DatasetType.PRODUCTS}-${startIndex + 1}~${endIndex}`;
      const text = await convertProductsToText(products, shopDomain);
      console.log("text", text);
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
        DatasetType.PRODUCTS,
        shopDomain,
        document.batch,
        DatasetIndexingStatus.INDEXING,
      );
    } catch (err: any) {
      console.error("[sendProductsToDify] Error sending products to Dify:", err);
      throw new DifyProcessingError("Failed to send products to Dify", err);
    }
  }