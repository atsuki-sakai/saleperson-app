// app/routes/api.syncProducts.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { fetchShopifyProducts } from "../services/shopify/fetchShopifyProducts";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { taskId, shopDomain } = await request.json();
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  console.log("taskId", taskId);
  console.log("shopDomain", shopDomain);
  await delay(3000);

  const { products, hasNextPage, endCursor } = await fetchShopifyProducts(
    request,
    null,
    5,
  );
  console.log("products", products);
  console.log("hasNextPage", hasNextPage);
  console.log("endCursor", endCursor);

  return json({
    success: true,
  });
}
