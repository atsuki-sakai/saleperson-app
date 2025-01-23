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

export enum DatasetType {
  PRODUCTS = "products",
  ORDERS = "orders",
  POLICIES = "policies",
  FAQ = "faq",
  PRODUCT_META_FIELDS = "product_meta_fields",
  TASK_SYNC = "task_sync",
  SYSTEM_PROMPT = "system_prompt",
}

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
  datasets: Dataset[];
}

/// ストアのデータセット
export interface Dataset {
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
  type: DatasetType;
  store?: Store;
  error?: string;
};

export interface IncludeData {
  title: string;
}

export enum DatasetIndexingStatus {
  PENDING = "PENDING",
  SYNCING = "SYNCING",
  INDEXING = "INDEXING",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR",
}
