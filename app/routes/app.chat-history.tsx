import { Page, Text, Layout, InlineStack } from "@shopify/polaris";
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session, redirect } = await authenticate.admin(request);
  const billingCheck = await billing.check();
  return { billingCheck };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session, redirect } = await authenticate.admin(request);
  const billingCheck = await billing.check();
  return { billingCheck };
};

export default function AppStoreGuide() {
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <InlineStack align="center" blockAlign="center">
            <Text as="h1" variant="headingLg">
              チャット履歴
            </Text>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
