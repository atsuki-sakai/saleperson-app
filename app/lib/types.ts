export type KnowledgeType = "products" | "orders" | "policy" | "faq" | "product_meta_fields" | "system_prompt";

/// Shopifyストアの設定とメタデータ
export interface Store {
  id: string;
  storeId: string;
  chatApiKey: string | null;
  workflowApiKey: string | null;
  systemPrompt: string | null;
  storePrompt: string | null;
  iconUrl: string | null;
  tone: string | null;
  blockingKeywords: string | null;
  datasetId: string | null;
  chatColor: string | null;
  createdAt: Date;
  updatedAt: Date;
  faqContent: string | null;
  metaFieldDescription: string | null;
  documents: Document[];
}

/// ストアのドキュメント
export interface Document {
  id: string;
  name: string;
  text: string;
  storeId: string;
  store: Store;
  createdAt: Date;
  updatedAt: Date;
}

