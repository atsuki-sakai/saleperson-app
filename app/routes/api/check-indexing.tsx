// api/checkIndexing

import { json } from "@remix-run/node";
import { ActionFunctionArgs } from "@remix-run/node";
import { DifyService } from "../../services/dify/DifyService";
import { prisma } from "../../db.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const difyService = new DifyService(
      process.env.DIFY_API_KEY!,
      process.env.DIFY_BASE_URL!,
    );

    const { datasetId, batch, taskId, storeId } = await request.json();

    let indexingResponse;
    try {
      indexingResponse = await difyService.document.getIndexingStatus(
        datasetId,
        batch,
      );
      console.log("indexingResponse", indexingResponse.data[0].indexing_status);
      const indexingStatus = indexingResponse.data[0].indexing_status;

      if (indexingStatus === "completed") {
        await prisma.task.delete({
          where: {
            id: taskId,
          },
        });
        console.log("task deleted");
        const taskQueue = await prisma.task.findMany({
          where: {
            storeId: storeId,
            type: "PRODUCT_CHUNK_SYNC",
          },
        });
        console.log("taskQueue", taskQueue);
        if (taskQueue.length == 0) {
          await prisma.task.deleteMany({
            where: {
              storeId: storeId,
              type: "PRODUCT_SYNC",
            },
          });
          console.log("main task deleted");
        }
      }
    } catch (err: any) {
      await prisma.task.delete({
        where: {
          id: taskId,
          storeId: storeId,
          batch: batch,
        },
      });
    }
    return json({
      success: false,
    });
  } catch (err: any) {
    return json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
