// api/checkIndexing

import { json } from "@remix-run/node";
import { ActionFunctionArgs } from "@remix-run/node";
import { DifyService } from "../integrations/dify/DifyService";
import { prisma } from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  return json({ message: "OK" }, { status: 200 });
}
