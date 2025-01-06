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

export type ProcessRule = {
  mode: "automatic" | "custom";
  rules?: {
    pre_processing_rules?: Array<{
      id: "remove_extra_spaces" | "remove_urls_emails";
      enabled: boolean;
    }>;
    segmentation?: {
      separator: string;
      max_tokens: number;
    };
  };
}; 

export type KnowledgeType = 
  | "products" 
  | "orders" 
  | "policy" 
  | "faq" 
  | "product_meta_fields";
export const KNOWLEDGE_TYPE_TO_STATE_KEY: Record<string, string> = {
  products: "products",
  orders: "orders",
  policy: "policy",
  faq: "faq",
  product_meta_fields: "product_meta_fields",
};
