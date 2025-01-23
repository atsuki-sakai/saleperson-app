import {
  Box,
  Card,
  Layout,
  Page,
  Text,
  FormLayout,
  TextField,
  BlockStack,
  Button,
  Banner,
  Divider,
  ColorPicker,
  Select,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState } from "react";
import { handleStoreUpsert } from "../controllers/documents.server";
import { Form, useActionData } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { CHUNK_SEPARATOR_SYMBOL, CHUNK_MAX_TOKENS } from "../lib/constants";

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";

// HSVからHEXに変換する関数
function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number, k = (n + h / 60) % 6) =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  const rgb = [f(5), f(3), f(1)].map((x) => Math.round(x * 255));
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}

function hexToHsv(hex: string): {
  hue: number;
  saturation: number;
  brightness: number;
} {
  const rgb = hex.match(/[a-f\d]{2}/gi);
  if (!rgb) {
    return { hue: 0, saturation: 0, brightness: 0 };
  }
  const r = parseInt(rgb[0], 16);
  const g = parseInt(rgb[1], 16);
  const b = parseInt(rgb[2], 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const h = d
    ? max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4
    : 0;
  const s = max ? d / max : 0;
  const v = max;
  return { hue: h * 60, saturation: s, brightness: v };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing, redirect } = await authenticate.admin(request);
  const billingCheck = await billing.check();
  if (!billingCheck.hasActivePayment) {
    return redirect("/app/select-plan");
  }

  const store = await prisma.store.findUnique({
    where: {
      storeId: session.shop,
    },
    select: {
      storeId: true,
      chatApiKey: true,
      workflowApiKey: true,
      systemPrompt: true,
      storePrompt: true,
      tone: true,
      iconUrl: true,
      blockingKeywords: true,
      chatColor: true,
      datasetId: true,
    },
  });

  return {
    shopId: session.shop,
    store: store || null,
  };
};
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const type = formData.get("type") as "api_settings";

  // API設定の保存
  if (type === "api_settings") {
    const chatApiKey = formData.get("chatApiKey") as string;
    const workflowApiKey = formData.get("workflowApiKey") as string;
    const systemPrompt = formData.get("systemPrompt") as string;
    const tone = formData.get("tone") as string;
    const blockingKeywords = formData.get("blockingKeywords") as string;
    const iconUrl = formData.get("iconUrl") as string;
    const storePrompt = formData.get("storePrompt") as string;
    const chatColor = formData.get("chatColor") as string;

    try {
      await prisma.store.upsert({
        where: {
          storeId: session.shop,
        },
        create: {
          storeId: session.shop,
          chatApiKey,
          workflowApiKey,
          iconUrl,
          tone,
          blockingKeywords: blockingKeywords,
          chatColor,
          systemPrompt,
          storePrompt,
        },
        update: {
          iconUrl,
          chatColor,
          systemPrompt,
          storePrompt,
          tone,
          blockingKeywords,
        },
      });

      const mainPrompt =
        "\n## システムプロンプト\n" +
        "会話のトーンは" +
        tone +
        "を心がけてください。\n" +
        systemPrompt +
        CHUNK_SEPARATOR_SYMBOL +
        "\n## ストアについての事前知識\n" +
        storePrompt +
        CHUNK_SEPARATOR_SYMBOL +
        "\n## 回答をブロックするキーワード。以下のキーワードは回答しないでください。\n" +
        blockingKeywords;

      // const store = await handleStoreUpsert({
      //   storeId: session.shop,
      //   mainPrompt,
      // });

      return { success: true, type: "api_settings", store: null };
    } catch (error) {
      console.error("Error saving API settings:", error);
      return {
        success: false,
        type: "api_settings",
        error: "API設定の保存中にエラーが発生しました",
      };
    }
  }
  return { success: false, type, error: "無効なインポートタイプです" };
};

export default function ChatPage() {
  const { store } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [color, setColor] = useState(hexToHsv(store?.chatColor || "#529c2e"));

  const [apiSettings, setApiSettings] = useState({
    chatApiKey: store?.chatApiKey || "",
    workflowApiKey: store?.workflowApiKey || "",
    systemPrompt: store?.systemPrompt || "",
    storePrompt: store?.storePrompt || "",
    iconUrl: store?.iconUrl || "",
    tone: store?.tone || "",
    blockingKeywords: store?.blockingKeywords || "",
    chatColor: store?.chatColor || "0",
  });

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Box paddingBlockEnd="400" paddingBlockStart="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingXl">
                  チャット設定
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  ストアに設定されているチャットウィジェットの設定はこちらで上書きできます。
                  <br />
                  会話の振る舞いや回答させたくないキーワードなどを設定できます。
                </Text>
                <Form method="post">
                  <FormLayout>
                    <input type="hidden" name="type" value="api_settings" />

                    <Divider />
                    <Text as="h3" variant="headingLg">
                      1.システムプロンプト
                    </Text>
                    <Box>
                      <TextField
                        label="システムプロンプトとは、AIアシスタントの振る舞いを設定するプロンプトです。最大2000文字まで入力できます。"
                        name="systemPrompt"
                        value={apiSettings.systemPrompt}
                        maxLength={2000}
                        onChange={(value) =>
                          setApiSettings((prev) => ({
                            ...prev,
                            systemPrompt: value,
                          }))
                        }
                        multiline={6}
                        autoComplete="off"
                        placeholder="AIアシスタントの振る舞いを設定するプロンプトを入力してください。"
                      />
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodySm" tone="success">
                          例：
                          <br />
                          あなたは男性です。
                          <br />
                          顧客の質問に対して、適切な回答を提供します。
                        </Text>
                      </Box>
                    </Box>
                    <Divider />
                    <Text as="h3" variant="headingLg">
                      2.ストアプロンプト
                    </Text>
                    <Box>
                      <TextField
                        label="ストアプロンプトとは、AIアシスタントにストアの情報を伝えるプロンプトです。最大2000文字まで入力できます。"
                        name="storePrompt"
                        value={apiSettings.storePrompt}
                        maxLength={2000}
                        onChange={(value) =>
                          setApiSettings((prev) => ({
                            ...prev,
                            storePrompt: value,
                          }))
                        }
                        multiline={6}
                        autoComplete="off"
                        placeholder="ストアの情報をAIアシスタントに伝えるプロンプトを入力してください。"
                      />
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodySm" tone="success">
                          例：
                          <br />
                          このストアはファッションショップです。
                          <br />
                          ターゲットは20代の女性です。
                        </Text>
                      </Box>
                    </Box>

                    <Divider />
                    <Text as="h3" variant="headingLg">
                      3.チャットウィジェットの設定
                    </Text>
                    <TextField
                      label="アイコンURL"
                      helpText="チャットウィジェットに表示されるAIアシスタントのアイコン画像のURLを設定します。"
                      name="iconUrl"
                      autoComplete="off"
                      placeholder="https://example.com/icon.png"
                      value={apiSettings.iconUrl}
                      onChange={(value) =>
                        setApiSettings((prev) => ({
                          ...prev,
                          iconUrl: value,
                        }))
                      }
                    />

                    <BlockStack gap="400">
                      <Box paddingBlockEnd="400">
                        <BlockStack>
                          <Text as="h3" variant="headingMd">
                            カラー設定
                          </Text>
                          <Box paddingBlockStart="200">
                            <Text as="p" variant="bodySm" tone="subdued">
                              チャットウィジェットのメインカラーを設定
                            </Text>
                            {apiSettings.chatColor}
                          </Box>
                          <div
                            style={{
                              margin: "10px 0",
                              backgroundColor: apiSettings.chatColor,
                              width: "40px",
                              height: "40px",
                              color: apiSettings.chatColor,
                              padding: "10px",
                              borderRadius: "10px",
                              overflow: "hidden",
                            }}
                          >
                            .
                          </div>

                          <input
                            type="hidden"
                            name="chatColor"
                            value={apiSettings.chatColor}
                          />
                          <ColorPicker
                            color={color}
                            onChange={(value) => {
                              setColor(value);
                              setApiSettings((prev) => ({
                                ...prev,
                                chatColor: hsvToHex(
                                  value.hue,
                                  value.saturation,
                                  value.brightness,
                                ),
                              }));
                            }}
                          />
                        </BlockStack>
                      </Box>

                      <Text as="h3" variant="headingMd">
                        トーン設定
                      </Text>
                      <Select
                        label="AIアシスタントの会話のトーンを設定します。"
                        name="tone"
                        options={[
                          "フレンドリーな会話",
                          "ビジネスシーンに合わせた会話",
                          "エンターテイメントシーンに合わせた会話",
                        ]}
                        value={apiSettings.tone}
                        onChange={(value: string) =>
                          setApiSettings((prev) => ({
                            ...prev,
                            tone: value,
                          }))
                        }
                      />
                      <Box paddingBlockStart="200">
                        <Text as="h3" variant="headingMd">
                          回答をブロックするキーワード
                        </Text>
                      </Box>
                      <TextField
                        label="指定したキーワードへの回答をブロックします。"
                        name="blockingKeywords"
                        autoComplete="off"
                        placeholder={`例: キーワード：\n「政治思想、犯罪」`}
                        value={apiSettings.blockingKeywords}
                        maxLength={1000}
                        multiline={6}
                        onChange={(value) =>
                          setApiSettings((prev) => ({
                            ...prev,
                            blockingKeywords: value,
                          }))
                        }
                      />
                    </BlockStack>

                    <Box paddingBlockStart="400">
                      <Button submit variant="primary" fullWidth size="large">
                        設定を保存
                      </Button>
                    </Box>
                    {actionData?.type === "api_settings" && (
                      <Banner
                        title={
                          actionData.success
                            ? "設定を保存しました"
                            : "エラーが発生しました"
                        }
                        tone={actionData.success ? "success" : "critical"}
                      >
                        <p>
                          {actionData.success
                            ? "API設定が正常に保存されました"
                            : (actionData as { error: string }).error}
                        </p>
                      </Banner>
                    )}
                  </FormLayout>
                </Form>
              </BlockStack>
            </Card>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
