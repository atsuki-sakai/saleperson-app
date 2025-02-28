import { type IncludeData } from "../../lib/types";
import { type DatasetType } from "../../lib/types";
import { type Store } from "@prisma/client";
import { type ActionResponse } from "../../lib/types";
import { Form } from "@remix-run/react";

import {
  Card,
  Box,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  Button,
  ProgressBar,
  Banner,
  TextField,
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import { CheckCircleIcon } from "@shopify/polaris-icons";

interface SyncCardProps {
  title: string;
  icon: React.FunctionComponent;
  description: string;
  includeDatas: IncludeData[];
  type: DatasetType;
  store?: Store;
  isLoading: boolean;
  status: "idle" | "processing" | "completed" | "error" | "indexing";
  progress: number;
  importStates: {
    [key: string]: {
      isLoading: boolean;
      progress: number;
      status: "idle" | "processing" | "completed" | "error" | "indexing";
    };
  };
  actionData: ActionResponse;
}

export function SyncCard({
  title,
  type,
  store,
  isLoading,
  status,
  progress,
  description,
  includeDatas,
  importStates,
  actionData,
}: SyncCardProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [excludeEmails, setExcludeEmails] = useState("");
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const isAnyProcessing = Object.values(importStates).some(
    (state) => state.isLoading || state.status === "processing",
  );
  const errorMessage =
    !actionData?.success && actionData?.type === type
      ? actionData?.error
      : undefined;

  // プログレスバーのアニメーション
  useEffect(() => {
    if (status === "processing") {
      const interval = setInterval(() => {
        setAnimatedProgress((prev) => {
          const next = prev + 1;
          if (next >= progress) {
            clearInterval(interval);
            return progress;
          }
          return next;
        });
      }, 20);
      return () => clearInterval(interval);
    } else if (status === "completed") {
      setAnimatedProgress(100);
    } else {
      setAnimatedProgress(0);
    }
  }, [status, progress]);

  // 成功状態の監視
  useEffect(() => {
    if (status === "completed") {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <Card>
      <Box minWidth="300px" width="100%">
        <BlockStack gap="400">
          <InlineStack align="start" blockAlign="center" gap="100">
            <CheckCircleIcon width={16} height={16} color="green" />
            <Text as="p" variant="bodyXs" tone="success" fontWeight="bold">
              作成済み
            </Text>
          </InlineStack>
          <Text as="h3" variant="headingMd">
            {title}
          </Text>

          <Box>
            <BlockStack gap="400">
              <Box maxWidth="360px">
                <Text as="p" variant="bodySm" tone="subdued">
                  {description}
                </Text>
              </Box>
              <Box paddingBlockEnd="200" paddingBlockStart="200">
                <Divider />
              </Box>
              <Box paddingBlockStart="200">
                <Text as="p" variant="bodySm">
                  学習に含まれるデータ
                </Text>
              </Box>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "8px",
                  padding: "8px 0",
                }}
              >
                {includeDatas.map((data: IncludeData) => (
                  <div
                    key={data.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      padding: "2px 4px",
                      backgroundColor: "rgba(0, 100, 0, 0.05)",
                      borderRadius: "4px",
                      border: "1px solid rgba(0, 100, 0, 0.1)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        color: "darkgreen",
                        margin: 0,
                        fontWeight: 500,
                        width: "100%",
                        textAlign: "center",
                        lineHeight: "1rem",
                      }}
                    >
                      {data.title}
                    </p>
                  </div>
                ))}
              </div>
              <Form method="post">
                <input type="hidden" name="type" value={type} />
                <input
                  type="hidden"
                  name="storeDatasetId"
                  value={store?.datasetId || ""}
                />
                {type === "orders" && (
                  <Box paddingBlockEnd="300">
                    <TextField
                      label="除外するメールアドレス（カンマ区切りで複数指定可能）"
                      type="text"
                      name="excludeEmails"
                      value={excludeEmails}
                      onChange={setExcludeEmails}
                      placeholder="example1@test.com, example2@test.com"
                      helpText="指定したメールアドレスの注文は除外されます"
                      autoComplete="off"
                    />
                  </Box>
                )}
                <Button
                  variant="primary"
                  tone="success"
                  submit
                  loading={isLoading}
                  disabled={isAnyProcessing}
                >
                  {isLoading ? "同期中..." : "最新データに同期"}
                </Button>
              </Form>
              {status === "processing" && (
                <ProgressBar progress={animatedProgress} />
              )}
              {status === "completed" && showSuccess && (
                <Banner title="同期完了" tone="success">
                  <p>データの同期が正常に完了しました。</p>
                </Banner>
              )}
              {status === "error" && (
                <Banner title="エラーが発生しました" tone="critical">
                  <p>
                    {errorMessage || "データの同期中にエラーが発生しました。"}
                  </p>
                </Banner>
              )}
            </BlockStack>
          </Box>
        </BlockStack>
      </Box>
    </Card>
  );
}
