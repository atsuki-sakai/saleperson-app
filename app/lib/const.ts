
// ##################################################################
// ローカルモードの設定: trueの場合はローカルのDifyを使用します、Dockerも必ず起動してください。
export const LOCAL_MODE = true;
// ##################################################################

// App - Plan
export type PlanFeature = {
  name: string;
  included: boolean;
};

export type PlanConfig = {
  id: typeof LITE_PLAN | typeof MONTHLY_PLAN | typeof ANNUAL_PLAN;
  name: string;
  price: number;
  currency: string;
  interval: "EVERY_30_DAYS" | "ANNUAL";
  features: PlanFeature[];
  description: string;
};

export const LITE_PLAN = "Lite Subscription" as const;
export const MONTHLY_PLAN = "Monthly subscription" as const;
export const ANNUAL_PLAN = "Annual subscription" as const;

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: LITE_PLAN,
    name: "Dify Lite プラン",
    price: 4980,
    currency: "JPY",
    interval: "EVERY_30_DAYS",
    description: "Difyの基本カスタマイズ(レベル1)が利用可能な、個人や小規模事業者向けの入門プランです。",
    features: [
      { name: "基本機能の利用", included: true },
      { name: "メールサポート", included: true },
      { name: "最大100件までのDifyプロジェクト作成", included: true },
      { name: "高度な分析機能（レベル2以上）", included: false },
      { name: "優先サポート", included: false },
    ],
  },
  {
    id: MONTHLY_PLAN,
    name: "Dify Pro プラン",
    price: 10000,
    currency: "JPY",
    interval: "EVERY_30_DAYS",
    description: "Difyの拡張カスタマイズ(レベル2)が利用でき、ビジネス拡大に適したプランです。",
    features: [
      { name: "基本機能の利用", included: true },
      { name: "メールサポート", included: true },
      { name: "Difyプロジェクト数無制限", included: true },
      { name: "高度な分析機能（レベル2）", included: true },
      { name: "優先サポート", included: true },
    ],
  },
  {
    id: ANNUAL_PLAN,
    name: "Dify Premium プラン",
    price: 30000,
    currency: "JPY",
    interval: "EVERY_30_DAYS",
    description: "Difyのすべてのカスタマイズ機能(レベル3)が利用可能。大規模ビジネス向けのお得な年間プランです。",
    features: [
      { name: "基本機能の利用", included: true },
      { name: "メールサポート", included: true },
      { name: "Difyプロジェクト数無制限", included: true },
      { name: "高度な分析機能（レベル2）", included: true },
      { name: "優先サポート", included: true },
    ],
  },
];


// Dify - Common
export const CHUNK_SEPARATOR_SYMBOL = "=====データの区切り=====";
export const CHUNK_MAX_TOKENS = 3000;

// Dify - Knowledge
export const KNOWLEDGE_TYPE_TO_STATE_KEY: Record<string, string> = {
    products: "products",
    orders: "orders",
    policy: "policy",
    faq: "faq",
    product_meta_fields: "product_meta_fields",
    system_prompt: "system_prompt",
  };
  


