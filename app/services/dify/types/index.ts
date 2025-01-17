export * from './DifyCommonTypes';
export * from './DatasetTypes';
export * from './DocumentTypes';
export * from './SegmentTypes';
export * from './RetrievalTypes';
export * from './DifyError';

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

