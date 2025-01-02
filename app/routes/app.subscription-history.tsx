import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { PLAN_CONFIGS } from "../constants";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // 全てのサブスクリプション履歴を取得
  const subscriptions = await prisma.subscription.findMany({
    where: {
      shop: session.shop,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return { subscriptions };
};

export default function SubscriptionHistory() {
  const { subscriptions } = useLoaderData<typeof loader>();

  const rows = subscriptions.map((subscription) => {
    const plan = PLAN_CONFIGS.find((p) => p.id === subscription.planId);
    return [
      plan?.name || subscription.planId,
      subscription.status,
      new Date(subscription.startDate).toLocaleDateString(),
      subscription.endDate
        ? new Date(subscription.endDate).toLocaleDateString()
        : "-",
      subscription.cancelledAt
        ? new Date(subscription.cancelledAt).toLocaleDateString()
        : "-",
      subscription.isTest ? "Yes" : "No",
    ];
  });

  return (
    <Page
      title="Subscription History"
      backAction={{ content: "Back", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Your Subscription History
              </Text>
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                ]}
                headings={[
                  "Plan",
                  "Status",
                  "Start Date",
                  "End Date",
                  "Cancelled Date",
                  "Test Mode",
                ]}
                rows={rows}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
