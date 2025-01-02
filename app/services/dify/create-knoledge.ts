import { DIFY_BASE_URL, DIFY_KNOWLEDGE_API_KEY } from "./const";
import { Response } from "node-fetch";

interface CreateKnowledgeProps {
  name: string;
  permission: string;
}

export const createKnowledge = async (createKnowledgeProps: CreateKnowledgeProps): Promise<Response | any> => {
  const response = await fetch(`${DIFY_BASE_URL}/datasets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DIFY_KNOWLEDGE_API_KEY}`,
    },
    body: JSON.stringify({
      name: createKnowledgeProps.name,
      permission: createKnowledgeProps.permission,
    }),
  });

  return response;
};
