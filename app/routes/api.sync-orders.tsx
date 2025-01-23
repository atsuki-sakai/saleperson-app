import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { q_FetchOrders } from "../integrations/shopify/query/q_fetchOrders";
import { DifyService } from "../integrations/dify/DifyService";
import { ICreateDocumentByTextRequest } from "../integrations/dify/types";
import { convertOrdersToText } from "../models/dify/document.utils";
import { DatasetType } from "../lib/types";
import {
  SHOPIFY_PAGE_SIZE,
  DATASET_INDEXING_LIMIT_SIZE,
  CHUNK_SEPARATOR_SYMBOL,
} from "app/lib/constants";
import {
  delay,
  safeShopifyGraphQLCall,
} from "../integrations/shopify/shopifyGraphQlCall";

/**
 * Remixの Action
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { shopDomain } = await request.json();

  // TaskやStoreの確認
  const store = await prisma.store.findUnique({
    where: { storeId: shopDomain },
    select: { accessToken: true, datasets: true },
  });
  if (!store?.accessToken) {
    return json({ error: "Store or accessToken not found" }, { status: 404 });
  }

  // 全商品を取得しつつ、300件単位でDifyへ送信
  try {
    const allOrders = await fetchAllOrders(
      shopDomain,
      store.accessToken,
      SHOPIFY_PAGE_SIZE,
    );
    console.log(`取得件数: ${allOrders.length}件`);

    console.log("task updated");

    return json({
      success: true,
      totalOrders: allOrders.length,
      firstOrderTitle: allOrders[0]?.name || "(no orders)",
    });
  } catch (err: any) {
    console.error("Error fetching all orders:", err);
    return json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * Difyに送信（dataset & document作成）する処理をまとめたヘルパー
 *  - 300件のチャンクごとに呼び出したい
 */
async function sendOrdersToDify(
  difyService: DifyService,
  shopDomain: string,
  orders: any[], // 300件分 or 残り
  startIndex: number,
  endIndex: number,
) {
  let datasetId: string | null = null;
  const datasetName = `${shopDomain}-${DatasetType.ORDERS}`;
  const prismaStore = await prisma.store.findFirst({
    where: {
      storeId: shopDomain,
    },
    select: {
      datasets: {
        where: {
          type: DatasetType.ORDERS,
          name: datasetName,
        },
        select: {
          datasetId: true,
          type: true,
        },
      },
    },
  });

  if (
    prismaStore?.datasets.some(
      (doc: { type: any }) => doc.type === DatasetType.ORDERS,
    )
  ) {
    datasetId =
      prismaStore.datasets.find(
        (doc: { type: any }) => doc.type === DatasetType.ORDERS,
      )?.datasetId ?? null;
  } else {
    // datasetを作成
    const dataset = await difyService.dataset.createDataset({
      name: DatasetType.ORDERS,
      description: `Dataset for ${DatasetType.ORDERS}`,
      indexing_technique: "high_quality",
      permission: "only_me",
    });
    datasetId = dataset.id;
    await prisma.dataset.create({
      data: {
        datasetId: dataset.id,
        name: datasetName,
        storeId: shopDomain,
        type: DatasetType.ORDERS,
      },
    });
  }

  // documentを作成
  const createDocumentRequest: ICreateDocumentByTextRequest = {
    name: `${startIndex + 1}~${endIndex}`,
    text: convertOrdersToText(orders), // 300件ぶんのテキスト
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
          chunk_overlap: 50,
        },
        parent_mode: "paragraph",
        subchunk_segmentation: {
          separator: "\n",
          max_tokens: 500,
          chunk_overlap: 50,
        },
      },
    },
  };

  await difyService.document.createDocumentByText(
    datasetId!,
    createDocumentRequest,
  );
}

/**
 * 全商品の取得と、300件ずつDifyに送信
 */
async function fetchAllOrders(
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

    // 300件たまったらDifyへ送信（複数回溜まる場合は while で回す）
    while (orderBuffer.length >= DATASET_INDEXING_LIMIT_SIZE) {
      const chunk = orderBuffer.splice(0, DATASET_INDEXING_LIMIT_SIZE);
      fetchedTotal += DATASET_INDEXING_LIMIT_SIZE;

      await sendOrdersToDify(
        difyService,
        shopDomain,
        chunk,
        fetchedTotal - DATASET_INDEXING_LIMIT_SIZE, // startIndex
        fetchedTotal, // endIndex
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
    await sendOrdersToDify(
      difyService,
      shopDomain,
      leftover,
      startIndex,
      fetchedTotal,
    );
  }

  return allOrders;
}
