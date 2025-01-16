// app/routes/app.start-sync.tsx
import { ActionFunction, json } from "@remix-run/node";
import { useActionData, Form } from "@remix-run/react";
import { prisma } from "../db.server";
import { publishToPubSub } from "../services/pubsub.server";
import { authenticate } from "../shopify.server";

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // 1) Taskを upsert (既に同じstoreId + typeがあれば更新、なければ新規)
  //    再度同期開始した場合、status = COMPLETED のままでも上書きする（PENDINGに戻す）
  const task = await prisma.task.upsert({
    where: {
      storeId_type: {
        storeId: session.shop,
        type: "PRODUCT_SYNC",
      },
    },
    update: {
      status: "PENDING",
      progressCount: 0,
      totalCount: 0,
      errorMessage: null,
      cursor: null,
      updatedAt: new Date(),
    },
    create: {
      storeId: session.shop,
      type: "PRODUCT_SYNC",
      status: "PENDING",
      progressCount: 0,
      totalCount: 0,
      // cursor, errorMessage は必要に応じて指定
    },
  });

  // 2) Pub/Sub にメッセージを送信して同期開始
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
