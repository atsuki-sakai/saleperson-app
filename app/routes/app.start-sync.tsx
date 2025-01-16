// フロントで「同期開始」ボタンを押す → ActionでPub/Subに「同期開始」をPublish

// app/routes/app.start-sync.tsx
import { ActionFunction, json } from "@remix-run/node";
import { useActionData, Form } from "@remix-run/react";
import { prisma } from "../db.server";
import { publishToPubSub } from "../services/pubsub.server";
import { authenticate } from "../shopify.server";
export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // 1) DBにTaskレコードを作る (進捗管理)
  const task = await prisma.task.create({
    data: {
      storeId: session.shop,
      type: "PRODUCT_SYNC",
      status: "PENDING",
      progressCount: 0,
      totalCount: 0,
    },
  });

  // 2) Pub/Subに「同期開始メッセージ」を送信
  //    ここでcursor=nullなどをセットし、最初の100件を取得指示
  await publishToPubSub("PRODUCT_SYNC_TOPIC", {
    taskId: task.id,
    shopDomain: session.shop,
    cursor: null,
    pageSize: 100,
  });

  return json({
    success: true,
    message: "同期開始メッセージを送信しました",
    taskId: task.id,
  });
};

export default function StartSyncPage() {
  const data = useActionData<typeof action>();

  return (
    <div style={{ padding: 20 }}>
      <h1>商品同期</h1>
      <p>
        下のボタンを押すとPub/Sub経由でShopify商品を100件ずつDifyに送信します。
      </p>
      <Form method="post">
        <button type="submit">同期開始</button>
      </Form>
      {data?.success && (
        <p>Pub/Subへメッセージを送信しました。TaskID: {data.taskId}</p>
      )}
    </div>
  );
}
