
import { DifyService } from "../integrations/dify/DifyService";
import { DatasetIndexingStatus, DatasetType } from "../lib/types";
import { getStoreWithDatasets } from "../controllers/store.controller";
import { ShopPolicies } from "../integrations/shopify/types/Policies";
import { removeHtmlAndLiquidTags } from "../lib/helpers";
import { Policy } from "../integrations/shopify/types/Policies";
import {
  upsertDataset,
  createDataset,
} from "../controllers/dataset.controller";
import { DifyProcessingError } from "../lib/errors";
import { ShopifyService } from "../integrations/shopify/ShopifyService";
/**
 * すべてのOrderをページネーションで取得しながらDifyにインデックス化し、
 * 取得したOrderの配列を返す。
 *
 * @param shopDomain - Shopifyのショップドメイン
 * @param accessToken - Shopifyのアクセストークン
 * @param pageSize - 1回のGraphQL呼び出しで取得するOrder数
 */
export async function fetchAndIndexPolicies(
    shopDomain: string,
    accessToken: string
  ) {
    const difyService = new DifyService(
      process.env.DIFY_API_KEY!,
      process.env.DIFY_BASE_URL!,
    );

    const shopifyService = new ShopifyService(
      shopDomain,
      accessToken,
    );
    const shopPolicies = await shopifyService.policies.fetchAllPolicies();

    await sendPoliciesToDify(
        difyService,
        shopDomain,
        shopPolicies,
    );

    return shopPolicies;
  }
  
  
  /**
   * DifyにShopPolicies情報を送り、Dataset & Documentを作成・更新する。
   *
   * @param difyService - DifyServiceインスタンス
   * @param shopDomain - Shopifyのショップドメイン
   * @param shopPolicies - 送信対象のShopPolicies
   */
  async function sendPoliciesToDify(
    difyService: DifyService,
    shopDomain: string,
    shopPolicies: ShopPolicies,
  ) {
    let datasetId: string | null = null;
  
    try {
        // 1. storeに紐づくDatasetを取得
        const storeWithDatasets = await getStoreWithDatasets(shopDomain);
        const existingDataset = storeWithDatasets?.datasets?.find(
            (doc: { type: string }) => doc.type === DatasetType.POLICIES,
        );
        const hasPoliciesDataset = !!existingDataset;
    
        // 2. なければ新規作成、あれば既存のDataset IDを利用
        if (storeWithDatasets && hasPoliciesDataset) {
            datasetId = existingDataset?.datasetId ?? null;
        } else {
            datasetId = await createDataset(DatasetType.POLICIES, shopDomain);
        }
    
        if (datasetId === null) {
            throw new Error(
            "Dataset ID is not found (failed to create or retrieve).",
            );
        }
    
        // 3. Documentを作成しDifyに送信
        shopPolicies.map(async (policy: Policy) => {
            const createDocumentRequest =
            await difyService.document.generateHierarchicalDocumentRequest(
                {
                    name: policy.title,
                    text: removeHtmlAndLiquidTags(policy.body),
                    segMaxTokens: 1000,
                    subSegMaxTokens: 250,
                    segOverlap: 50,
                }
            );
            const document = await difyService.document.createDocumentByText(
              datasetId!,
              createDocumentRequest,
            );
            // 4. Datasetの最新状況を更新
            await upsertDataset(
                datasetId!,
                DatasetType.POLICIES,
                shopDomain,
                document.batch,
                DatasetIndexingStatus.INDEXING,
            );
        });
    } catch (err: any) {
      console.error("[sendPoliciesToDify] Error sending policies to Dify:", err);
      throw new DifyProcessingError("Failed to send policies to Dify", err);
    }
}