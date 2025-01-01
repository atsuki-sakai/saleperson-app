export const LITE_PLAN = "Lite Subscription" as const;
export const MONTHLY_PLAN = "Monthly subscription" as const;
export const ANNUAL_PLAN = "Annual subscription" as const;

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

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: LITE_PLAN,
    name: "Lite Plan",
    price: 1000,
    currency: "JPY",
    interval: "EVERY_30_DAYS",
    description: "Perfect for small businesses just getting started",
    features: [
      { name: "Basic features", included: true },
      { name: "Email support", included: true },
      { name: "Up to 100 products", included: true },
      { name: "Advanced analytics", included: false },
      { name: "Priority support", included: false },
    ],
  },
  {
    id: MONTHLY_PLAN,
    name: "Monthly Plan",
    price: 2000,
    currency: "JPY",
    interval: "EVERY_30_DAYS",
    description: "Great for growing businesses",
    features: [
      { name: "Basic features", included: true },
      { name: "Email support", included: true },
      { name: "Unlimited products", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Priority support", included: false },
    ],
  },
  {
    id: ANNUAL_PLAN,
    name: "Annual Plan",
    price: 20000,
    currency: "JPY",
    interval: "ANNUAL",
    description: "Best value for established businesses",
    features: [
      { name: "Basic features", included: true },
      { name: "Email support", included: true },
      { name: "Unlimited products", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Priority support", included: true },
    ],
  },
]; 