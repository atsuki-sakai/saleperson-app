import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { ActionResponse } from "../lib/types";
import {
  useLoaderData,
  useActionData,
  Form,
  useNavigation,
} from "@remix-run/react";
import { ImportCard, SyncCard } from "../components/ui";
import { LocalModeCard } from "../components/common";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  ProgressBar,
  Banner,
  Box,
  InlineStack,
  Divider,
  TextField,
} from "@shopify/polaris";
import { htmlTagRemove } from "../lib/helper";
import { prisma } from "../db.server";
import { ArchiveIcon, CartIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { fetchShopifyProducts } from "../services/shopify/fetchShopifyProducts";
import { fetchOrders } from "../services/shopify/fetchOrders";
import { fetchPolicies } from "../services/shopify/fetchPolicys";
import { useImportStates } from "../hooks/useImportState";
import { CHUNK_SEPARATOR_SYMBOL } from "../lib/const";
import {
  upsertProducts,
  upsertOrders,
  upsertPolicy,
  upsertFaq,
  upsertProductMeta,
} from "../models/documents.server";
import type { KnowledgeType } from "../services/dify/api/types";
import {
  clensingProductDataToText,
  clensingOrderDataToText,
} from "../models/documents.server";
const storePolicyIncludeData = [
  { title: "返品と返金ポリシー" },
  { title: "プライバシーポリシー" },
  { title: "利用規約" },
  { title: "配送ポリシー" },
  { title: "連絡先情報" },
  { title: "特定商取引法に基づく表記" },
  { title: "購入オプションのキャンセルポリシー" },
];

const productIncludeData = [
  { title: "商品名" },
  { title: "商品ID" },
  { title: "商品URL" },
  { title: "商品タイプ" },
  { title: "販売元" },
  { title: "公開ステータス" },
  { title: "総在庫数" },
  { title: "最終更新日時" },
  { title: "商品説明" },
  { title: "オプション" },
  { title: "価格情報" },
  { title: "バリエーション" },
  { title: "メタフィールド" },
];

const orderIncludeData = [
  { title: "注文ID" },
  { title: "注文日時" },
  { title: "注文金額" },
  { title: "数量" },
  { title: "顧客情報" },
  { title: "購入商品" },
  { title: "注文メモ" },
  { title: "タグ" },
];

/* -------------------------------------------
 *  Action / Loader
 * ------------------------------------------- */

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing, redirect } = await authenticate.admin(request);

  // 課金チェック
  const billingCheck = await billing.check();
  if (!billingCheck.hasActivePayment) {
    return redirect("/app/select-plan");
  }

  // ストアデータ取得
  const store = await prisma.store.findUnique({
    where: {
      storeId: session.shop,
    },
    include: {
      documents: true,
    },
  });
  return json({
    storeId: session.shop,
    store: store || null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const type = formData.get("type") as KnowledgeType;

  /* -----------------------
   * type === "products"
   * -----------------------*/

  if (type === "products") {
    try {
      // 1. タスクの作成または取得
      const task = await prisma.task.upsert({
        where: {
          storeId_type: {
            storeId: session.shop,
            type: "PRODUCT_SYNC",
          },
        },
        update: {
          status: "IN_PROGRESS",
          progressCount: 0,
          totalCount: 0,
          errorMessage: null,
          cursor: null,
          updatedAt: new Date(),
        },
        create: {
          storeId: session.shop,
          type: "PRODUCT_SYNC",
          status: "IN_PROGRESS",
          progressCount: 0,
          totalCount: 0,
        },
      });

      // 2. 同期処理の開始をトリガー
      const origin = new URL(request.url).origin;
      console.log("origin", origin);
      await fetch(`${origin}/api/syncProducts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
          shopDomain: session.shop,
        }),
      });

      // const { products, hasNextPage, endCursor } = await fetchShopifyProducts(
      //   request,
      //   null,
      //   5,
      // );

      return json({
        success: true,
        type,
        message:
          "商品同期を開始しました。バックグラウンドで処理が継続されます。",
        taskId: task.id,
      });
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || "不明なエラーが発生しました";
      return {
        success: false,
        type,
        store: null,
        error: `同期の開始に失敗しました: ${errorMessage}`,
      };
    }
  } else if (type === "orders") {
    /* -----------------------
     * type === "ORDERS"
     * -----------------------*/
    try {
      // 注文データの取得と保存を行う関数

      const excludeEmails = formData.get("excludeEmails") as string;
      const emailsToExclude = excludeEmails
        ?.split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const { orders } = await fetchOrders(request, {
        excludeEmails: emailsToExclude,
      });

      const formattedContent = clensingOrderDataToText(orders);

      const store = await upsertOrders(session.shop, formattedContent);

      return json({ success: true, type, store });
    } catch (error: any) {
      const errorMessage = error?.message || "不明なエラーが発生しました";
      return {
        success: false,
        type,
        store: null,
        error: `注文データのインポート中にエラーが発生しました: ${errorMessage}`,
      };
    }
  } else if (type === "policy") {
    /* -----------------------
     * type === "policy"
     * -----------------------*/
    try {
      const response = await fetchPolicies(request);
      const policies = await response.json();

      const convertedNewPolicy = policies.data.shop.shopPolicies
        .map(
          (p: any) =>
            `${p.title}##\n\n${htmlTagRemove(p.body)}\n${CHUNK_SEPARATOR_SYMBOL}`,
        )
        .join("\n")
        .replace(/\\n/g, "\n")
        .replace(/&nbsp;/g, "")
        .trim();

      const store = await upsertPolicy(session.shop, convertedNewPolicy);

      return json({ success: true, type, store });
    } catch (error: any) {
      const errorMessage = error?.message || "不明なエラーが発生しました";
      return {
        success: false,
        type,
        store: null,
        error: errorMessage,
      };
    }
  } else if (type === "faq") {
    try {
      const currentFaq = formData.get("currentFaq") as string;

      console.log("currentFaq", currentFaq);

      const store = await upsertFaq(session.shop, currentFaq);

      return json({ success: true, type, store });
    } catch (error: any) {
      console.error("FAQ Creation Error:", error);
      return {
        success: false,
        type,
        store: null,
        error: error.message || "不明なエラーが発生しました",
      };
    }
  } else if (type === "product_meta_fields") {
    try {
      const metaFieldDescription = formData.get(
        "product_meta_fields",
      ) as string;

      const store = await upsertProductMeta(session.shop, metaFieldDescription);

      return json({ success: true, type: "product_meta_fields", store });
    } catch (error: any) {
      const errorMessage = error?.message || "不明なエラーが発生しました";
      return json({
        success: false,
        type: "product_meta_fields",
        store: null,
        error: errorMessage,
      });
    }
  }
  // 無効なtype
  return { success: false, type, error: "無効なインポートタイプです" };
};

/* -------------------------------------------
 *  React Component
 * ------------------------------------------- */

export default function Index() {
  const { store } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const [currentStore, setCurrentStore] = useState<any | null>(store);

  const [directKnowledgeData, setDirectKnowledgeData] = useState<{
    faqContent: string;
    product_meta_fields: string;
  }>({
    faqContent: currentStore?.faqContent || "",
    product_meta_fields: currentStore?.metaFieldDescription || "",
  });

  // Compute derived properties
  const hasProductKnowledge = currentStore?.documents?.some(
    (k: { type: string }) => k.type === "products",
  );
  const hasOrderKnowledge = currentStore?.documents?.some(
    (k: { type: string }) => k.type === "orders",
  );
  const hasStorePolicy = currentStore?.documents?.some(
    (k: { type: string }) => k.type === "policy",
  );
  const hasMetaField = currentStore?.documents?.some(
    (k: { type: string }) => k.type === "product_meta_fields",
  );
  const hasFaq = currentStore?.documents?.some(
    (k: { type: string }) => k.type === "faq",
  );

  // 成功メッセージの表示状態を管理
  const [showSuccessMessage, setShowSuccessMessage] = useState<{
    [key: string]: boolean;
  }>({
    products: false,
    orders: false,
    policy: false,
    faq: false,
    product_meta_fields: false,
  });

  const { importStates, setProcessing, setCompleted, setError } =
    useImportStates();

  // Actionからの結果を反映
  useEffect(() => {
    if (
      actionData &&
      ["products", "orders", "policy", "faq", "product_meta_fields"].includes(
        actionData.type,
      )
    ) {
      const { type, success, error } = actionData;

      if (error) {
        setError(type, error);
      } else {
        setCompleted(type);
      }

      // 成功時にメッセージを表示し、3秒後に非表示にする
      if (success) {
        setShowSuccessMessage((prev) => ({ ...prev, [type]: true }));
        setTimeout(() => {
          setShowSuccessMessage((prev) => ({ ...prev, [type]: false }));
        }, 3000);
      }
    }
    if (actionData && "store" in actionData && actionData.store) {
      const store = actionData.store;
      setCurrentStore(store);
    }
  }, [actionData]);

  // フォーム送信時にプログレスやステータスを更新
  useEffect(() => {
    if (navigation.state === "submitting") {
      const formData = navigation.formData;
      const type = formData?.get("type") as KnowledgeType;
      if (type) {
        setProcessing(type);
      }
    }
  }, [navigation.state, navigation.formData]);

  // いずれかの処理が実行中かどうか
  const isAnyProcessing = Object.values(importStates).some(
    (state) => state.isLoading || state.status === "processing",
  );
  return (
    <Page>
      <BlockStack gap="800">
        <Layout>
          <Layout.Section>
            <Box paddingBlockEnd="800">
              <Box paddingBlockEnd="400">
                <BlockStack gap="200">
                  <LocalModeCard />
                  {store?.chatApiKey === null ? (
                    <Card background="bg-surface-success" padding="400">
                      <BlockStack gap="400">
                        <Text as="h3" variant="headingMd" tone="success">
                          AIアシスタント構築中
                        </Text>
                        <Text as="p" variant="bodySm" tone="success">
                          もう暫くお待ちください。1週間から1ヶ月で貴社の情報を学習したLLMが構築されます。
                        </Text>
                      </BlockStack>
                    </Card>
                  ) : null}
                  {!hasOrderKnowledge && (
                    <>
                      <Card background="bg-surface-critical" padding="400">
                        <Text as="p" variant="bodySm" tone="critical">
                          Step1:
                          商品データからナレッジベースを作成してください。
                        </Text>
                      </Card>
                      <Card background="bg-surface-critical" padding="400">
                        <Text as="p" variant="bodySm" tone="critical">
                          Step2:
                          注文データからナレッジベースを作成してください。
                        </Text>
                      </Card>
                    </>
                  )}
                  {!hasStorePolicy && (
                    <Card background="bg-surface-critical" padding="400">
                      <Text as="p" variant="bodySm" tone="critical">
                        Step3: ポリシーを作成してください。
                      </Text>
                    </Card>
                  )}

                  {!hasFaq && (
                    <Card background="bg-surface-critical" padding="400">
                      <Text as="p" variant="bodySm" tone="critical">
                        Step4: よくあるご質問を作成してください。
                      </Text>
                    </Card>
                  )}
                </BlockStack>
              </Box>

              <Card>
                <BlockStack gap="400">
                  <Text as="h1" variant="headingXl">
                    学習データの作成
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    ボタンひとつでShopifyに登録された商品データや注文データからナレッジを作成します。
                    <br />
                    作成したナレッジはAIアシスタントの学習に使用されます。
                  </Text>

                  <Divider />
                  <Text as="h3" variant="headingLg">
                    １.Shopifyのデータをインポート
                  </Text>
                  <InlineStack gap="400">
                    {hasProductKnowledge ? (
                      <SyncCard
                        title="商品データ"
                        description="商品の説明文、バリエーション、価格などの情報からAIアシスタントが商品についての回答を生成できるようにナレッジを作成します。"
                        icon={ArchiveIcon}
                        includeDatas={productIncludeData}
                        type="products"
                        store={currentStore}
                        isLoading={importStates.products.isLoading}
                        status={importStates.products.status}
                        progress={importStates.products.progress}
                        importStates={importStates}
                        actionData={actionData as ActionResponse}
                      />
                    ) : (
                      <ImportCard
                        title="商品データ"
                        description="商品の説明文、バリエーション、価格などの情報からAIアシスタントが商品についての回答を生成できるようにナレッジを作成します。"
                        icon={ArchiveIcon}
                        includeDatas={productIncludeData}
                        type="products"
                        store={currentStore}
                        isLoading={importStates.products.isLoading}
                        status={importStates.products.status}
                        progress={importStates.products.progress}
                        isCreated={false}
                        importStates={importStates}
                        actionData={actionData as ActionResponse}
                      />
                    )}

                    {hasOrderKnowledge ? (
                      <SyncCard
                        title="注文データ"
                        description="過去の注文履歴、顧客の購買パターンなどからAIアシスタントが注文についての回答を生成できるようにナレッジを作成します。"
                        icon={CartIcon}
                        includeDatas={orderIncludeData}
                        type="orders"
                        store={currentStore}
                        isLoading={importStates.orders.isLoading}
                        status={importStates.orders.status}
                        progress={importStates.orders.progress}
                        importStates={importStates}
                        actionData={actionData as ActionResponse}
                      />
                    ) : (
                      <ImportCard
                        title="注文データ"
                        description="過去の注文履歴、顧客の購買パターンなどからAIアシスタントが注文についての回答を生成できるようにナレッジを作成します。"
                        icon={CartIcon}
                        includeDatas={orderIncludeData}
                        type="orders"
                        store={currentStore}
                        isLoading={importStates.orders.isLoading}
                        status={importStates.orders.status}
                        progress={importStates.orders.progress}
                        isCreated={false}
                        importStates={importStates}
                        actionData={actionData as ActionResponse}
                      />
                    )}

                    {hasStorePolicy ? (
                      <SyncCard
                        title="ポリシー"
                        description="ストアのポリシーを元にAIアシスタントがポリシーについての回答を生成できるようにナレッジを作成します。"
                        icon={ArchiveIcon}
                        includeDatas={storePolicyIncludeData}
                        type="policy"
                        store={currentStore}
                        isLoading={importStates.policy.isLoading}
                        status={importStates.policy.status}
                        progress={importStates.policy.progress}
                        importStates={importStates}
                        actionData={actionData as ActionResponse}
                      />
                    ) : (
                      <ImportCard
                        title="ポリシー"
                        description="ストアのポリシーを元にAIアシスタントがポリシーについての回答を生成できるようにナレッジを作成します。"
                        icon={ArchiveIcon}
                        includeDatas={storePolicyIncludeData}
                        type="policy"
                        store={currentStore}
                        isLoading={importStates.policy.isLoading}
                        status={importStates.policy.status}
                        progress={importStates.policy.progress}
                        isCreated={false}
                        importStates={importStates}
                        actionData={actionData as ActionResponse}
                      />
                    )}
                  </InlineStack>

                  <Box paddingBlockStart="400">
                    <Divider />
                  </Box>

                  <BlockStack gap="400">
                    <Text as="h3" variant="headingLg">
                      ２.問い合わせ回答データの設定
                    </Text>
                    <Form method="post">
                      <input type="hidden" name="type" value="faq" />
                      <input
                        type="hidden"
                        name="currentFaq"
                        value={directKnowledgeData.faqContent || ""}
                      />
                      <Box>
                        <div
                          style={{
                            display: "flex",
                            gap: "400",
                            maxWidth: "300px",
                            justifyContent: "space-between",
                            alignItems: "center",
                            border: "1px solid #e0e0e0",
                            borderRadius: "4px",
                            padding: "4px",
                            backgroundColor: "#f0f0f0",
                            marginBottom: "12px",
                          }}
                        >
                          <div style={{ fontSize: "16px" }}>
                            <p style={{ fontSize: "8px", lineHeight: "1rem" }}>
                              セクション区切り文字列
                            </p>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "red",
                                lineHeight: "0.5rem",
                              }}
                            >
                              {CHUNK_SEPARATOR_SYMBOL}
                            </p>
                          </div>
                          <Button
                            size="micro"
                            tone="success"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                CHUNK_SEPARATOR_SYMBOL,
                              );
                            }}
                          >
                            区切り文字をコピー
                          </Button>
                        </div>

                        <Box paddingBlockEnd="400">
                          <Text as="p" variant="bodySm" tone="subdued">
                            セクション毎に分ける場合は "
                            <span style={{ color: "red" }}>
                              {CHUNK_SEPARATOR_SYMBOL}
                            </span>
                            "で区切ってください。
                            <br />
                            セクション毎に分ける事でAIアシスタントがセクション(例:
                            注文についてなど)を元に回答を絞り込むことができ回答精度が向上します。
                          </Text>
                        </Box>
                        <Box paddingBlockEnd="400">
                          <Divider />
                        </Box>

                        <TextField
                          label="過去に顧客からよくある質問がある場合はその内容などを設定して下さい。"
                          autoComplete="off"
                          value={directKnowledgeData.faqContent || ""}
                          onChange={(value) =>
                            setDirectKnowledgeData((prev) => ({
                              ...prev,
                              faqContent: value,
                            }))
                          }
                          name="faq"
                          multiline={8}
                          placeholder={`例: 注文について\nQ: 注文方法を教えてください。\nA: 商品ページから「カートに入れる」ボタンをクリックし、必要事項を入力して注文を完了させてください。\nQ: 注文内容の変更・キャンセルはできますか？\nA: 原則として、注文確定後の変更・キャンセルは承っておりません。お早めにご連絡いただければ、状況に応じて対応いたします。\n======\n配送について\nQ: 配送業者はどこですか？\nA: 通常、[配送業者名]を利用しております。\nQ: 送料はいくらですか？\nA: [送料]です。[金額]以上のご購入で送料無料となります。\nQ: 注文内容の変更・キャンセルはできますか？\nA: 原則として、注文確定後の変更・キャンセルは承っておりません。お早めにご連絡いただければ、状況に応じて対応いたします。`}
                        />
                      </Box>
                      <Box paddingBlockStart="300">
                        <Button
                          variant="primary"
                          submit
                          loading={importStates.faq.isLoading}
                          disabled={
                            isAnyProcessing ||
                            !directKnowledgeData.faqContent?.trim()
                          }
                        >
                          {hasFaq
                            ? "よくある質問のナレッジを更新"
                            : "よくある質問のナレッジを作成"}
                        </Button>
                      </Box>
                      {importStates.faq.status === "processing" && (
                        <Box paddingBlockStart="300">
                          <ProgressBar progress={importStates.faq.progress} />
                        </Box>
                      )}
                      {importStates.faq.status === "completed" &&
                        showSuccessMessage.faq && (
                          <Box paddingBlockStart="300">
                            <Banner title="作成完了" tone="success">
                              <p>
                                よくある質問のナレッジが正常に作成されました。
                              </p>
                            </Banner>
                          </Box>
                        )}
                      {importStates.faq.status === "error" &&
                        actionData?.type === "faq" && (
                          <Box paddingBlockStart="300">
                            <Banner
                              title="エラーが発生しました"
                              tone="critical"
                            >
                              <p>
                                {(actionData as { error: string })?.error ||
                                  "ナレッジの作成中にエラーが発生しました。"}
                              </p>
                            </Banner>
                          </Box>
                        )}
                    </Form>

                    <Box paddingBlockStart="400">
                      <Divider />
                    </Box>

                    <Text as="h3" variant="headingLg">
                      ３.商品メタフィールドの設定
                    </Text>
                    <Text as="p" variant="bodySm" tone="caution">
                      ※商品データにメタフィールドを設定していない場合は必要ありません。
                    </Text>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="type"
                        value="product_meta_fields"
                      />
                      <input
                        type="hidden"
                        name="storeDatasetId"
                        value={currentStore?.datasetId || ""}
                      />
                      <input
                        type="hidden"
                        name="previousProductMetaFields"
                        value={currentStore?.metaFieldDescription || ""}
                      />
                      <TextField
                        label="設定する事でAIアシスタントは商品のメタフィールドを元に回答を生成します。"
                        name="product_meta_fields"
                        value={directKnowledgeData.product_meta_fields || ""}
                        maxLength={2000}
                        onChange={(value) =>
                          setDirectKnowledgeData((prev) => ({
                            ...prev,
                            product_meta_fields: value,
                          }))
                        }
                        multiline={6}
                        autoComplete="off"
                        placeholder={`### 以下は商品のメタフィールドのキーです。\neffective_date: 有効期限\nitem_name: 商品名\nquantity: 数量\nprice: 価格`}
                      />
                      <Box paddingBlockStart="300">
                        <Button
                          variant="primary"
                          submit
                          loading={importStates.product_meta_fields.isLoading}
                          disabled={
                            isAnyProcessing ||
                            !directKnowledgeData.product_meta_fields?.trim()
                          }
                        >
                          {hasMetaField
                            ? "商品メタフィールドのナレッジを更新"
                            : "商品メタフィールドのナレッジを作成"}
                        </Button>
                      </Box>
                      {importStates.product_meta_fields.status ===
                        "processing" && (
                        <Box paddingBlockStart="300">
                          <ProgressBar
                            progress={importStates.product_meta_fields.progress}
                          />
                        </Box>
                      )}
                      {importStates.product_meta_fields.status ===
                        "completed" &&
                        showSuccessMessage.product_meta_fields && (
                          <Box paddingBlockStart="300">
                            <Banner title="作成完了" tone="success">
                              <p>
                                商品メタフィールドのナレッジが正常に作成されました。
                              </p>
                            </Banner>
                          </Box>
                        )}
                      {importStates.product_meta_fields.status === "error" &&
                        actionData?.type === "product_meta_fields" && (
                          <Box paddingBlockStart="300">
                            <Banner
                              title="エラーが発生しました"
                              tone="critical"
                            >
                              <p>
                                {(actionData as { error: string })?.error ||
                                  "ナレッジの作成中にエラーが発生しました。"}
                              </p>
                            </Banner>
                          </Box>
                        )}
                    </Form>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
