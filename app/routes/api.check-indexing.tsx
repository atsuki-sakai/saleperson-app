import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { getStoreWithDatasets } from "app/controllers/store.controller";
import { checkDatasetIndexing } from "app/controllers/dataset.controller";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { shopDomain } = await request.json();
  const data = await getStoreWithDatasets(shopDomain);

  // データベースから取得した dataset の配列
  const datasets = data?.datasets || [];

  await checkDatasetIndexing(shopDomain, datasets);

  return json({ message: "OK" }, { status: 200 });
}
