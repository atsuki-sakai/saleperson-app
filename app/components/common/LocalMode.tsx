import { Card, Text } from "@shopify/polaris";
import { LOCAL_MODE } from "../../lib/constants";

export function LocalModeCard() {
  return (
    <Card background="bg-surface-critical" padding="200">
      <Text as="h4" alignment="center" variant="headingMd" tone="subdued">
        {LOCAL_MODE ? "ローカルモード" : "テスト中"}
      </Text>
    </Card>
  );
}
