import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { createKnowledge } from "../services/dify/create-knoledge";
import { createDocumentForText } from "../services/dify/create-document-for-text";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, redirect, session } = await authenticate.admin(request);

  const { hasActivePayment } = await billing.check();

  if (!hasActivePayment) {
    return redirect("/app/select-plan");
  }

  return { shopId: session.id };
};

export default function Index() {
  const { shopId } = useLoaderData<typeof loader>();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const shopify = useAppBridge();
  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    const newChatHistory = [...chatHistory, { role: "user", content: message }];
    setChatHistory(newChatHistory);
    setMessage("");

    try {
      createKnowledge({
        name: shopId,
        permission: "only_me",
      })
        .then(async (response) => response.json())
        .then(async (knowledgeData) => {
          const datasetId = knowledgeData.dataset_id;
          const documentResponse = await createDocumentForText({
            datasetId,
            title: "商品情報",
            content: message,
            indexing_technique: "high_quality",
            process_rule: { mode: "automatic" },
          });

          const documentData = await documentResponse.json();
          // setChatHistory([
          //   ...newChatHistory,
          //   { role: "assistant", content: documentData.answer },
          // ]);
        });
    } catch (error) {
      console.error("Error sending message:", error);
      shopify.toast.show("Error sending message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  AI Assistant
                </Text>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "10px",
                        margin: "5px 0",
                        backgroundColor:
                          msg.role === "user" ? "#f4f6f8" : "#ffffff",
                        borderRadius: "8px",
                      }}
                    >
                      <Text as="p">
                        <strong>
                          {msg.role === "user" ? "You: " : "Assistant: "}
                        </strong>
                        {msg.content}
                      </Text>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Message"
                      value={message}
                      onChange={(message) => setMessage(message)}
                      autoComplete="off"
                      placeholder="Type your message..."
                      multiline={1}
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSendMessage}
                    loading={isLoading}
                    disabled={isLoading || !message.trim()}
                  >
                    Send
                  </Button>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
