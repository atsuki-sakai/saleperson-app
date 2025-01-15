// App - Plan
export type PlanFeature = {
  name: string;
  included: boolean;
};

export const LITE_PLAN = "Lite Subscription" as const;
export const MONTHLY_PLAN = "Monthly subscription" as const;
export const ANNUAL_PLAN = "Annual subscription" as const;
export type PlanConfig = {
  id: typeof LITE_PLAN | typeof MONTHLY_PLAN | typeof ANNUAL_PLAN;
  name: string;
  price: number;
  currency: string;
  interval: "EVERY_30_DAYS" | "ANNUAL";
  features: PlanFeature[];
  description: string;
};

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

// Component
export type ActionResponse = {
      success: true;
      type: KnowledgeType;
      store?: Store;
      error?: string
    };

export interface IncludeData {
  title: string;
}