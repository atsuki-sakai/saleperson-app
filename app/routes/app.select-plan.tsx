import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  LITE_PLAN,
  MONTHLY_PLAN,
  ANNUAL_PLAN,
  PLAN_CONFIGS,
  PlanFeature,
} from "../constants";
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useNavigate, Form, useLoaderData } from "@remix-run/react";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session, redirect } = await authenticate.admin(request);

  const billingCheck = await billing.check();
  return { billingCheck };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const selectedPlan = formData.get("plan") as
    | typeof MONTHLY_PLAN
    | typeof ANNUAL_PLAN
    | typeof LITE_PLAN;
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
  const navigate = useNavigate();
  const { billingCheck } = useLoaderData<typeof loader>();

  const hasSubscription = billingCheck.appSubscriptions.length > 0;
  const currentSubscription = hasSubscription
    ? billingCheck.appSubscriptions[0]
    : null;
  const currentPlan = currentSubscription
    ? PLAN_CONFIGS.find((plan) => plan.id === currentSubscription.name)
    : null;

  return (
    <Page>
      <TitleBar title="Select Plan" />
      <Layout>
        {!hasSubscription ? (
          <Layout.Section>
            <BlockStack gap="500">
              <Text as="h1" variant="headingLg">
                Choose the Right Plan for Your Business
              </Text>

              <InlineStack gap="500" align="start">
                {PLAN_CONFIGS.map((plan) => (
                  <Card key={plan.id}>
                    <BlockStack gap="400">
                      <BlockStack gap="200">
                        <Text as="h2" variant="headingMd">
                          {plan.name}
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {plan.description}
                        </Text>
                      </BlockStack>

                      <Text as="p" variant="headingLg">
                        ¥{plan.price.toLocaleString()}
                        <Text as="span" variant="bodyMd" tone="subdued">
                          /{plan.interval === "ANNUAL" ? "year" : "month"}
                        </Text>
                      </Text>

                      <PlanFeatureList features={plan.features} />

                      <Form method="post">
                        <input type="hidden" name="plan" value={plan.id} />
                        <Button variant="primary" submit fullWidth>
                          Select {plan.name}
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
                  Current Subscription Details
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
                    Price
                  </Text>
                  <Text as="p" variant="bodyMd">
                    ¥{currentPlan?.price.toLocaleString()}
                    <Text as="span" variant="bodyMd" tone="subdued">
                      /{currentPlan?.interval === "ANNUAL" ? "year" : "month"}
                    </Text>
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <Text as="p" variant="headingMd">
                    Features Included
                  </Text>
                  {currentPlan && (
                    <PlanFeatureList features={currentPlan.features} />
                  )}
                </BlockStack>

                <BlockStack gap="200">
                  <Text as="p" variant="headingMd">
                    Subscription Status
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Status: {currentSubscription?.status}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Test Mode: {currentSubscription?.test ? "Yes" : "No"}
                  </Text>
                </BlockStack>

                <BlockStack gap="200" align="start">
                  <Button
                    variant="primary"
                    tone="critical"
                    url="/app/cancel-subscription"
                  >
                    Cancel Subscription
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
