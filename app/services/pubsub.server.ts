// app/services/pubsub.server.ts
import { PubSub } from "@google-cloud/pubsub";

// GCP側でサービスアカウントの権限を設定しておく必要がある
const pubsub = new PubSub();

/**
 * メッセージをPublishする関数
 * @param topicName 例: "PRODUCT_SYNC_TOPIC"
 * @param payload   JSオブジェクトをJSON化してPublish
 */
export async function publishToPubSub(topicName: string, payload: object) {
  const dataBuffer = Buffer.from(JSON.stringify(payload));
  await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
}

/**
 * PushSubscriptionからのPOSTをデコードする関数
 * Pub/Subは { message: { data: base64 }, subscription: ... } を送ってくる
 */
export async function getPubSubPayload(request: Request) {
  const body = await request.json();
  const message = body.message;
  if (!message?.data) {
    throw new Error("No data in Pub/Sub message");
  }
  const decoded = Buffer.from(message.data, "base64").toString("utf8");
  return JSON.parse(decoded);
}
