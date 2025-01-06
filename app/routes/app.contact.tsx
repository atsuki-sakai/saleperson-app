import {
  Page,
  Text,
  Layout,
  BlockStack,
  Box,
  Button,
  TextField,
  InlineStack,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
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
            <Box paddingBlockStart="400" minWidth="600px">
              <BlockStack gap="200" align="center">
                <Text as="h1" variant="headingLg">
                  お問い合わせ
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  追加機能のご要望やご質問などありましたらお気軽にお問い合わせください。
                </Text>
                <Box paddingBlockStart="200">
                  <Divider />
                </Box>
                <Box>
                  <TextField
                    label="お名前"
                    autoComplete="off"
                    placeholder="お名前を入力してください"
                    name="name"
                  />
                </Box>
                <Box>
                  <TextField
                    label="メールアドレス"
                    autoComplete="off"
                    placeholder="メールアドレスを入力してください"
                    name="email"
                  />
                </Box>
                <Box>
                  <TextField
                    label="お問い合わせ内容"
                    autoComplete="off"
                    placeholder="お問い合わせ内容を入力してください"
                    multiline={6}
                    name="contact"
                  />
                </Box>

                <Button size="large" fullWidth variant="primary">
                  送信
                </Button>
              </BlockStack>
            </Box>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
