import { DIFY_BASE_URL, DIFY_KNOWLEDGE_API_KEY } from "./const";

interface CreateDocumentForTextProps {
  datasetId: string;
  title: string;
  content: string;
  indexing_technique?: "high_quality" | "low_quality";
  process_rule?: { mode: "automatic" | "manual" };
}

export const createDocumentForText = async (createDocumentForTextProps: CreateDocumentForTextProps): Promise<Response | any> => {
  const response = await fetch(`${DIFY_BASE_URL}/datasets/${createDocumentForTextProps.datasetId}/document/create-by-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DIFY_KNOWLEDGE_API_KEY}`,
    },
    body: JSON.stringify({
      name: createDocumentForTextProps.title,
      text: createDocumentForTextProps.content,
      indexing_technique: createDocumentForTextProps.indexing_technique ?? "high_quality",
      process_rule: createDocumentForTextProps.process_rule ?? { mode: "automatic" },
    }),
  });

  return response;
};
