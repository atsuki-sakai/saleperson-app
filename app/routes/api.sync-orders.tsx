import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { q_FetchOrders } from "../integrations/shopify/query/q_fetchOrders";
import { DifyService } from "../integrations/dify/DifyService";
import { delay } from "../controllers/helpers";
import { getStoreWithDatasets } from "../controllers/store.controller";
import { importOrders } from "../controllers/order.controller";
import {
  SHOPIFY_PAGE_SIZE,
  DATASET_INDEXING_LIMIT_SIZE,
} from "app/lib/constants";
import { DatasetType } from "../lib/types";
import { convertOrdersToText } from "../controllers/helpers";
import { ICreateDatasetResponse } from "app/integrations/dify/types";
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
    const allOrders = await importOrders(
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
