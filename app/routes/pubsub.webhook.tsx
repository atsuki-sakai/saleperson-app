// app/routes/pubsub.webhook.tsx
import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "../db.server";
import { getPubSubPayload, publishToPubSub } from "../services/pubsub.server";
import { fetchShopifyProducts } from "../services/shopify/fetchShopifyProducts";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    console.log("Received webhook request");
    const payload = await getPubSubPayload(request);
    console.log("Decoded payload:", payload);

    // 疎通確認用の簡単なペイロード
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      originalPayload: payload,
    };

    console.log("Publishing test payload:", testPayload);

    try {
      const messageId = await publishToPubSub(
        "PRODUCT_SYNC_TOPIC",
        testPayload,
      );
      console.log("Successfully published message:", messageId);
      return json({ success: true, messageId });
    } catch (error) {
      console.error("PubSub publish error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown PubSub error";
      return json(
        { error: "PubSub publish failed", details: errorMessage },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return json({ error: error.message || "Unknown error" }, { status: 500 });
  }
};
