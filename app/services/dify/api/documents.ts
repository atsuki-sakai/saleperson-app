import { DifyError } from "../../../../app/lib/errors";
import { Document, ProcessRule } from "./types";
import { LOCAL_MODE } from "../../../../app/lib/const";


const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_KNOWLEDGE_API_KEY = process.env.DIFY_KNOWLEDGE_API_KEY;

const LOCAL_DIFY_BASE_URL = process.env.LOCAL_DIFY_BASE_URL;
const LOCAL_DIFY_KNOWLEDGE_API_KEY = process.env.LOCAL_DIFY_KNOWLEDGE_API_KEY;

const BASE_URL = LOCAL_MODE ? LOCAL_DIFY_BASE_URL : DIFY_BASE_URL;
const KNOWLEDGE_API_KEY = LOCAL_MODE ? LOCAL_DIFY_KNOWLEDGE_API_KEY : DIFY_KNOWLEDGE_API_KEY;


/**
 * ドキュメント一覧を取得
 */
export async function listDocuments(
  datasetId: string,
  params?: {
    page?: number;
    limit?: number;
    keyword?: string;
  }
): Promise<Document[]> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.keyword) searchParams.append("keyword", params.keyword);

  const response = await fetch(
        `${BASE_URL}/datasets/${datasetId}/documents?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new DifyError(error.code || "invalid_action", response.status);
  }

  const data = await response.json();
 
  return data;
}

/**
 * テキストでドキュメントを作成
 */
export async function createDocumentFromText(
  datasetId: string,
  params: {
    name: string;
    text: string;
    indexing_technique?: "high_quality" | "economy";
    process_rule?: ProcessRule;
  }
): Promise<Document> {

  const response = await fetch(
    `${BASE_URL}/datasets/${datasetId}/document/create-by-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("Document creation API error:", {
      status: response.status,
      error,
      requestParams: params,
    });
    throw new DifyError(error.code || "invalid_action", response.status);
  }

  const data = await response.json();
 
  return data.document;
}

/**
 * ドキュメントを削除
 */
export async function deleteDocument(
  datasetId: string,
  documentId: string
): Promise<Document> {
  const response = await fetch(
    `${BASE_URL}/datasets/${datasetId}/documents/${documentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new DifyError(error.code || "invalid_action", response.status);
  }

  const data = await response.json();
 
  return data.document;
}

/**
 * テキストでドキュメントを更新
 */
export async function updateDocumentByText(
  datasetId: string,
  documentId: string,
  params: {
    name: string;
    text: string;
    indexing_technique?: "high_quality" | "economy";
    process_rule?: ProcessRule;
  }
): Promise<Document> {
  const response = await fetch(
    `${BASE_URL}/datasets/${datasetId}/documents/${documentId}/update-by-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new DifyError(error.code || "invalid_action", response.status);
  }

  const data = await response.json();
  return data.document;
}

export async function getDocumentSegments(
  datasetId: string,
  documentId: string,
) {
  try {

    const response = await fetch(`${BASE_URL}/datasets/${datasetId}/documents/${documentId}/segments`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new DifyError("セグメントの取得に失敗しました。", response.status);
    }

    const {data}= await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching document segments:", error);
    throw new DifyError(
      error.message || "セグメントの取得中にエラーが発生しました。",
      error.status,
    );
  }
}

export async function updateDocumentSegment(
  datasetId: string,
  documentId: string,
  segmentId: string,
  params: {
    content?: string;
    answer?: string;
    keywords?: string[];
    enabled?: boolean;
  }
) {
  try {
    const response = await fetch(
      `${BASE_URL}/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          segment: params,
        }),
      }
    );

    if (!response.ok) {
      throw new DifyError("セグメントの更新に失敗しました。", response.status);
    }

    const {data} = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error updating document segment:", error);
    throw new DifyError(
      error.message || "セグメントの更新中にエラーが発生しました。",
      error.status,
    );
  }
} 
