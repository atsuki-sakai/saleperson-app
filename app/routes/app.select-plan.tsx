import {
  Box,
  Card,
  Layout,
  List,
  Page,
  Text,
  BlockStack,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  LITE_PLAN,
  MONTHLY_PLAN,
  ANNUAL_PLAN,
  PlanFeature,
} from "../lib/types";
import { PLAN_CONFIGS } from "../lib/constants";
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  const billingCheck = await billing.check();
  return { billingCheck };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const selectedPlan = formData.get("plan") as
    | typeof LITE_PLAN
    | typeof MONTHLY_PLAN
    | typeof ANNUAL_PLAN;
  const shop = session.shop.split(".myshopify.com")[0];
  await billing.require({
    plans: [selectedPlan],
    onFailure: async () =>
      billing.request({
        plan: selectedPlan,
        isTest: true,
        returnUrl: `https://admin.shopify.com/store/${shop}/apps/saleperson-app`,
      }),
  });

  return null;
};

function PlanFeatureList({ features }: { features: PlanFeature[] }) {
  return (
    <List type="bullet">
      {features.map((feature, index) => (
        <List.Item key={index}>
          <Text
            as="span"
            variant="bodyMd"
            tone={feature.included ? "success" : "subdued"}
          >
            {feature.included ? "✓" : "✕"} {feature.name}
          </Text>
        </List.Item>
      ))}
    </List>
  );
}

export default function SelectPlan() {
  const { billingCheck } = useLoaderData<typeof loader>();

  const hasSubscription = billingCheck.appSubscriptions.length > 0;
  const currentSubscription = hasSubscription
    ? billingCheck.appSubscriptions[0]
    : null;
  const currentPlan = currentSubscription
    ? PLAN_CONFIGS.find((plan: any) => plan.id === currentSubscription.name)
    : null;

  return (
    <Page>
      <Layout>
        {!hasSubscription ? (
          <Layout.Section>
            <BlockStack gap="500">
              <Text as="h1" variant="headingLg">
                ビジネスに最適なプランを選択
              </Text>

              <InlineStack gap="200" align="start">
                {PLAN_CONFIGS.map((plan: any) => (
                  <Card key={plan.id}>
                    <BlockStack gap="400">
                      <BlockStack gap="200">
                        <Text as="h2" variant="headingMd">
                          {plan.name}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {plan.description}
                        </Text>
                      </BlockStack>

                      <Text as="p" variant="headingLg">
                        ¥{plan.price.toLocaleString()}
                        <Text as="span" variant="bodyMd" tone="subdued">
                          /{plan.interval === "ANNUAL" ? "年" : "月"}
                        </Text>
                      </Text>

                      <PlanFeatureList features={plan.features} />

                      <Form method="post">
                        <input type="hidden" name="plan" value={plan.id} />
                        <Button variant="primary" submit fullWidth>
                          {plan.name}を選択
                        </Button>
                      </Form>
                    </BlockStack>
                  </Card>
                ))}
              </InlineStack>
            </BlockStack>
          </Layout.Section>
        ) : (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h1" variant="headingLg">
                  現在のサブスクリプション
                </Text>

                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    {currentPlan?.name}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {currentPlan?.description}
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <Text as="p" variant="headingMd">
                    料金
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ¥{currentPlan?.price.toLocaleString()}
                    <Text as="span" variant="bodyMd" tone="subdued">
                      /{currentPlan?.interval === "ANNUAL" ? "年" : "月"}
                    </Text>
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <Text as="p" variant="headingMd">
                    含まれる機能
                  </Text>
                  {currentPlan && (
                    <PlanFeatureList features={currentPlan.features} />
                  )}
                </BlockStack>

                {currentSubscription?.test ? (
                  <Text as="h2" variant="headingMd" tone="critical">
                    テストモード中
                  </Text>
                ) : null}

                <Box maxWidth="300px" paddingBlockStart="400">
                  <Button
                    variant="primary"
                    tone="critical"
                    url="/app/cancel-subscription"
                  >
                    サブスクリプションをキャンセル
                  </Button>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
