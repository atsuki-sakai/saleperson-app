
import { DifyError } from "../../../../app/lib/errors";
import { Dataset, DifyResponse } from "./types";
import { LOCAL_MODE } from "../../../../app/lib/const";

const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_KNOWLEDGE_API_KEY = process.env.DIFY_KNOWLEDGE_API_KEY;
const LOCAL_DIFY_BASE_URL = process.env.LOCAL_DIFY_BASE_URL;
const LOCAL_DIFY_KNOWLEDGE_API_KEY = process.env.LOCAL_DIFY_KNOWLEDGE_API_KEY;

const BASE_URL = LOCAL_MODE ? LOCAL_DIFY_BASE_URL : DIFY_BASE_URL;
const KNOWLEDGE_API_KEY = LOCAL_MODE ? LOCAL_DIFY_KNOWLEDGE_API_KEY : DIFY_KNOWLEDGE_API_KEY;

/**
 * ナレッジ一覧を取得
 */
export async function listKnowledge(): Promise<Dataset[]> {
  const response = await fetch(`${BASE_URL}/datasets`, {
    headers: {
      Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new DifyError(error.code || "invalid_action", response.status);
  }

  const data = await response.json();

  return data;
}

/**
 * ナレッジを作成
 */
export async function createKnowledge(params: {
  name: string;
  description?: string;
  permission?: "only_me" | "all_team_members";
}): Promise<Dataset> {
 
  try {
  
    const response = await fetch(`${BASE_URL}/datasets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
      },
      body: JSON.stringify(params),
    });
   
    if (!response.ok) {
      const error = await response.json();
      console.error("Error response:", error);
      throw new DifyError(error.code || "invalid_action", response.status);
    }

    const data = await response.json();
   
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

/**
 * ナレッジを削除
 */
export async function deleteKnowledge(knowledgeId: string): Promise<Dataset> {
  const response = await fetch(`${BASE_URL}/datasets/${knowledgeId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new DifyError(error.code || "invalid_action", response.status);
  }

  const data = await response.json();
  return data;
}

/**
 * ナレッジを更新
 */
export async function updateKnowledge(
  datasetId: string,
  params: {
    name?: string;
    description?: string;
    permission?: "only_me" | "all_team_members";
  }
): Promise<Dataset>{
  const response = await fetch(`${BASE_URL}/datasets/${datasetId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
    },
    body: JSON.stringify(params),
  });


  if (!response.ok) {
    const error = await response.json();
    throw new DifyError(error.code || "invalid_action", response.status);
  }

  return response.json();
} 