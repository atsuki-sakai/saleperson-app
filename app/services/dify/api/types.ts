export type DifyResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    status: number;
  };
};

export type Dataset = {
  id: string;
  name: string;
  description?: string;
  permission: "only_me" | "all_team_members";
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  dataset_id: string;
  name: string;
  content: string;
  status: "pending" | "processing" | "completed" | "error";
  created_at: string;
  updated_at: string;
};

export type Segment = {
  id: string;
  position: number;
  document_id: string;
  content: string;
  answer: string;
  word_count: number;
  tokens: number;
  keywords: string[];
  index_node_id: string;
  index_node_hash: string;
  hit_count: number;
  enabled: boolean;
  disabled_at: null;
  disabled_by: null;
  status: string;
  created_by: string;
  created_at: number;
  indexing_at: number;
  completed_at: number;
  error: null;
  stopped_at: null;
}

export type ProcessRule = {
  name: string;
  text: string;
  indexing_technique?: "high_quality" | "economy";
  doc_form?: "text_model" | "hierarchical_model" | "qa_model";
  doc_language?: string;
  process_rule: {
    mode: "custom" | "automatic";
    rules?: {
      pre_processing_rules?: Array<{
        id: string;
        enabled: boolean;
      }>;
      segmentation?: {
        separator: string;
        max_tokens: number;
        parent_mode: "full-doc" | "paragraph";
      };
      subchunk_segmentation?: {
        separator: string;
        max_tokens: number;
        chunk_overlap?: number;
      };
    };
  };
};

export type KnowledgeType = 
  | "products" 
  | "orders" 
  | "policy" 
  | "faq" 
  | "product_meta_fields"
  | "system_prompt";
export const KNOWLEDGE_TYPE_TO_STATE_KEY: Record<string, string> = {
  products: "products",
  orders: "orders",
  policy: "policy",
  faq: "faq",
  product_meta_fields: "product_meta_fields",
  system_prompt: "system_prompt",
};
