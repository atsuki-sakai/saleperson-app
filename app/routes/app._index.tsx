import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  Form,
  useNavigation,
} from "@remix-run/react";
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
import { updateDocumentSegment } from "../services/dify/api/documents";
import { htmlTagRemove } from "../lib/helper";
import type { Order, Product } from "../services/shopify/types";
import { LOCAL_MODE } from "../lib/const";
import { prisma } from "../db.server";
import { ArchiveIcon, CartIcon, CheckCircleIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { fetchShopifyProducts } from "../services/shopify/fetchShopifyProducts";
import { fetchOrders } from "../services/shopify/fetchOrders";
import { fetchPolicies } from "../services/shopify/fetchPolicys";
import {
  CHUNK_SEPARATOR_SYMBOL,
  CHUNK_MAX_TOKENS,
  KNOWLEDGE_TYPE_TO_STATE_KEY,
} from "../lib/const";
import { createKnowledge } from "../services/dify/api/datasets";
import {
  createDocumentFromText,
  updateDocumentByText,
  getDocumentSegments,
} from "../services/dify/api/documents";
import type { KnowledgeType } from "../services/dify/api/types";
import type { Store } from "../lib/types";
import { k } from "node_modules/vite/dist/node/types.d-aGj9QkWt";

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
 *  データ変換用関数
 * ------------------------------------------- */

function convertProductsToText(products: Product[], shop: string) {
  // 更新日時順にソート
  const sortedProducts = products.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const productTexts = sortedProducts.map((product) => {
    // オプション
    const options = product.options
      .map((option: any) => `${option.name}: ${option.values.join(", ")}`)
      .filter(Boolean)
      .join("\n");

    // 価格範囲
    const priceRange = `${product.priceRangeV2.minVariantPrice.amount} ${product.priceRangeV2.minVariantPrice.currencyCode} ～ ${product.priceRangeV2.maxVariantPrice.amount} ${product.priceRangeV2.maxVariantPrice.currencyCode}`;

    // メタフィールド
    const metafields = product.metafields.edges
      .map((meta: any) => {
        const metaNode = meta.node;
        if (metaNode.key === "badge" || metaNode.key === "widget") return null;

        let value = metaNode.value;
        try {
          if (value.startsWith("[")) {
            value = JSON.parse(value).join(", ");
          }
        } catch (e) {
          /* JSON解析に失敗した場合はそのままのvalueを使用 */
        }
        // HTMLタグを削除
        value = value.replace(/<[^>]*>/g, "").replace(/\n/g, " ");
        return `${metaNode.key.replace("_", "")}: ${value}`;
      })
      .filter(Boolean)
      .join("\n");

    // バリエーション
    const variants = product.variants.edges.map((variant: any) => {
      const variantNode = variant.node;
      const selectedOptions = variantNode.selectedOptions
        .map((o: any) => `${o.name}: ${o.value}`)
        .join("\n");
      const sku = variantNode.sku?.replaceAll("-", "") || "なし";

      return `商品名: ${variantNode.title}
      オプション: ${selectedOptions}
      価格: ${variantNode.price} ${variantNode.currencyCode || "JPY"}
      SKU: ${sku}
      在庫数: ${variantNode.inventoryQuantity || 0}`;
    });

    return `\n## 商品情報
    ${product.title == "Default Title" ? null : `商品名: ${product.title}`}
    商品ID: ${product.id.replace("gid://shopify/Product/", "")}
    商品URL: https://${shop}/products/${product.handle}
    商品タイプ: ${product.productType || "なし"}
    販売元: ${product.vendor || "なし"}
    公開ステータス: ${product.status}
    総在庫数: ${product.totalInventory || 0}
    最終更新日時: ${product.updatedAt}
    商品説明: ${
      product.description?.replace(/<[^>]*>/g, "").replace(/\n/g, " ") || "なし"
    }
    オプション:
    ${options || "なし"}
    価格情報: ${priceRange}
    バリエーション:
    ${variants}
    ## メタフィールド
    ${metafields || "なし"}`;
  });

  return productTexts.join(CHUNK_SEPARATOR_SYMBOL);
}
function convertOrdersToText(orders: Order[]): string {
  return orders
    .map((order) => {
      // nullチェックを追加

      if (!order?.createdAt) return "";

      return `\n## 注文データ
      注文日: ${order.createdAt}
      注文番号: ${order.name || "不明"}
      注文ID: ${order.id.replace("gid://shopify/Order/", "不明")}
      注文金額: ${order.currentTotalPriceSet?.presentmentMoney.amount || "不明"} ${order.currentTotalPriceSet.presentmentMoney.currencyCode}
      注文者: ${order.customer?.displayName || "不明"}
      注文者メールアドレス: ${order.customer?.email || "不明"}
      注文者ID: ${order.customer?.id.replace("gid://shopify/Customer/", "") || "不明な注文者ID"}
      注文者電話番号: ${order.customer?.phone || "不明"}
      注文タグ: ${order.customer?.tags || "なし"}
      注文メモ: ${order.note || "なし"}
      商品: ${order.lineItems?.edges
        ?.map((edge: any) => edge.node)
        .filter(Boolean)
        .map(
          (item: any) =>
            `${item.title} x ${item.quantity}点 (${item.originalTotalSet?.presentmentMoney.amount}円)`,
        )

        .join(", ")}
${CHUNK_SEPARATOR_SYMBOL}`;
    })
    .filter(Boolean) // 空の文字列を除去
    .join("\n");
}

/* -------------------------------------------
 *  Action / Loader
 * ------------------------------------------- */

type ActionResponse =
  | {
      success: true;
      type: KnowledgeType;
      store?: Store;
    }
  | {
      success: false;
      type: KnowledgeType;
      error: string;
      store?: Store;
    };

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
      const { products } = await fetchShopifyProducts(request);
      if (!products || products.length === 0) {
        return {
          success: false,
          type,
          error:
            "商品データの取得に失敗しました。商品が存在しないか、アクセス権限がない可能性があります。",
        };
      }

      // 商品データを変換してドキュメント登録
      const formattedContent = convertProductsToText(products, session.shop);

      const store = await handleProductUpsert({
        shop: session.shop,
        newProductData: formattedContent,
        key: type,
      });

      return json({ success: true, type, store });
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || "不明なエラーが発生しました";
      return {
        success: false,
        type,
        store: null,
        error: `インポート処理中にエラーが発生しました: ${errorMessage}`,
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

      console.log("orders: ", orders[0].customer?.email);

      const formattedContent = convertOrdersToText(orders);

      const store = await handleOrderUpsert({
        shop: session.shop,
        newOrderData: formattedContent,
        key: type,
      });

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

      const store = await handlePolicyUpsert({
        shop: session.shop,
        newPolicy: convertedNewPolicy,
        key: type,
      });

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

      const store = await handleFaqUpsert({
        shop: session.shop,
        currentFaq,
        key: type,
      });

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

      const store = await handleProductMetaFieldUpsert({
        shop: session.shop,
        newMetaFieldDescription: metaFieldDescription,
        key: type,
      });

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

  const [importStates, setImportStates] = useState<
    Record<
      keyof typeof KNOWLEDGE_TYPE_TO_STATE_KEY,
      {
        isLoading: boolean;
        progress: number;
        status: "idle" | "processing" | "completed" | "error";
      }
    >
  >({
    products: {
      isLoading: false,
      progress: 0,
      status: "idle",
    },
    orders: {
      isLoading: false,
      progress: 0,
      status: "idle",
    },
    policy: {
      isLoading: false,
      progress: 0,
      status: "idle",
    },
    faq: {
      isLoading: false,
      progress: 0,
      status: "idle",
    },
    product_meta_fields: {
      isLoading: false,
      progress: 0,
      status: "idle",
    },
  });
  // Actionからの結果を反映
  useEffect(() => {
    if (
      actionData &&
      ["products", "orders", "policy", "faq", "product_meta_fields"].includes(
        actionData.type,
      )
    ) {
      const { type, success } = actionData;
      setImportStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          isLoading: false,
          status: success ? "completed" : "error",
          progress: success ? 100 : 0,
        },
      }));

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
        setImportStates((prev) => ({
          ...prev,
          [KNOWLEDGE_TYPE_TO_STATE_KEY[type]]: {
            ...prev[KNOWLEDGE_TYPE_TO_STATE_KEY[type]],
            isLoading: true,
            status: "processing",
            progress: 75,
          },
        }));
      }
    }
  }, [navigation.state, navigation.formData]);

  // いずれかの処理が実行中かどうか
  const isAnyProcessing = Object.values(importStates).some(
    (state) => state.isLoading || state.status === "processing",
  );

  console.log("currentStore", currentStore);

  return (
    <Page>
      <BlockStack gap="800">
        <Layout>
          <Layout.Section>
            <Box paddingBlockEnd="800">
              <Box paddingBlockEnd="400">
                <BlockStack gap="200">
                  <Card background="bg-surface-critical" padding="200">
                    <Text
                      as="h4"
                      alignment="center"
                      variant="headingMd"
                      tone="subdued"
                    >
                      {LOCAL_MODE ? "ローカルモード" : "テスト中"}
                    </Text>
                  </Card>
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

/* -------------------------------------------
 *  UI部品（ImportCard, SyncCard など）
 * ------------------------------------------- */

interface IncludeData {
  title: string;
}

interface ImportCardProps {
  title: string;
  description: string;
  icon: React.FunctionComponent;
  isLoading: boolean;
  status: "idle" | "processing" | "completed" | "error";
  progress: number;
  type: KnowledgeType;
  store?: Store;
  isCreated: boolean;
  includeDatas: IncludeData[];
  importStates: {
    [key: string]: {
      isLoading: boolean;
      progress: number;
      status: "idle" | "processing" | "completed" | "error";
    };
  };
}

function ImportCard({
  title,
  description,
  isLoading,
  includeDatas,
  status,
  progress,
  type,
  store,
  importStates,
}: ImportCardProps) {
  const actionData = useActionData<typeof action>();
  const [showSuccess, setShowSuccess] = useState(false);
  const [excludeEmails, setExcludeEmails] = useState("");
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const isAnyProcessing = Object.values(importStates).some(
    (state) => state.isLoading || state.status === "processing",
  );
  const errorMessage =
    actionData?.success === false && actionData?.type === type
      ? (actionData as { error: string }).error
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
      <Box minWidth="300px">
        <BlockStack gap="400">
          <InlineStack gap="400" align="start">
            <Text as="h3" variant="headingMd">
              {title}
            </Text>
          </InlineStack>
          <Box>
            <BlockStack gap="200">
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
                  submit
                  loading={isLoading}
                  disabled={isAnyProcessing}
                  size="slim"
                >
                  インポート開始
                </Button>
              </Form>
              {status === "processing" && (
                <ProgressBar progress={animatedProgress} />
              )}
              {status === "completed" && showSuccess && (
                <Banner title="インポート完了" tone="success">
                  <p>データのインポートが正常に完了しました。</p>
                </Banner>
              )}
              {status === "error" && (
                <Banner title="エラーが発生しました" tone="critical">
                  <p>
                    {errorMessage ||
                      "データのインポート中にエラーが発生しました。もう一度お試しください。"}
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

interface SyncCardProps {
  title: string;
  icon: React.FunctionComponent;
  description: string;
  includeDatas: IncludeData[];
  type: KnowledgeType;
  store?: Store;
  isLoading: boolean;
  status: "idle" | "processing" | "completed" | "error";
  progress: number;
  importStates: {
    [key: string]: {
      isLoading: boolean;
      progress: number;
      status: "idle" | "processing" | "completed" | "error";
    };
  };
}

function SyncCard({
  title,
  type,
  store,
  isLoading,
  status,
  progress,
  description,
  includeDatas,
  importStates,
}: SyncCardProps) {
  const actionData = useActionData<typeof action>();
  const [showSuccess, setShowSuccess] = useState(false);
  const [excludeEmails, setExcludeEmails] = useState("");
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const isAnyProcessing = Object.values(importStates).some(
    (state) => state.isLoading || state.status === "processing",
  );
  const errorMessage =
    actionData?.success === false && actionData?.type === type
      ? (actionData as { error: string }).error
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

// FAQ更新に特化したロジック
async function handleFaqUpsert(params: {
  shop: string;
  currentFaq: string;
  key: string;
}) {
  const { shop, currentFaq, key } = params;

  const FaqDataName = "よくある質問";
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { documents: true },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  let datasetId;
  if (store.datasetId) {
    datasetId = store.datasetId;
  } else {
    const knowledgeResponse = await createKnowledge({
      name: shop,
      permission: "only_me",
    });
    datasetId = knowledgeResponse.id;
  }

  const existingFaqDoc = store.documents.find((doc) => doc.type === key);

  // 3. Difyでドキュメントを作成 or 更新
  const documentResponse = !existingFaqDoc
    ? await createDocumentFromText(datasetId, {
        name: FaqDataName,
        text: currentFaq,
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
            },
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
              { id: "remove_urls_emails", enabled: true },
            ],
          },
        },
        indexing_technique: "high_quality",
      })
    : await updateDocumentByText(datasetId, existingFaqDoc.id, {
        name: FaqDataName,
        text: currentFaq,
      });

  const documentId = documentResponse.id;
  if (!documentId) {
    throw new Error("ドキュメントIDの取得に失敗しました。");
  }

  // 4. PrismaでDB更新
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    create: {
      storeId: shop,
      datasetId: datasetId,
      faqContent: currentFaq,
      documents: {
        create: {
          id: documentId,
          name: FaqDataName,
          text: currentFaq,
          type: key,
          datasetId: datasetId,
        },
      },
    },
    update: {
      datasetId: datasetId,
      faqContent: currentFaq,
      documents: {
        upsert: {
          where: { id: documentId },
          create: {
            id: documentId,
            name: FaqDataName,
            text: currentFaq,
            type: key,
            datasetId: datasetId,
          },
          update: {
            text: currentFaq,
          },
        },
      },
    },
    include: { documents: true },
  });

  return updatedStore;
}

// 商品メタフィールド更新に特化したロジック
async function handleProductMetaFieldUpsert(params: {
  shop: string;
  newMetaFieldDescription: string;
  key: string;
}) {
  const { shop, newMetaFieldDescription, key } = params;

  const ProductMetaFieldName = "商品メタフィールド";
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { documents: true },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  let datasetId;
  if (store.datasetId) {
    datasetId = store.datasetId;
  } else {
    const knowledgeResponse = await createKnowledge({
      name: shop,
      permission: "only_me",
    });
    datasetId = knowledgeResponse.id;
  }

  const existingProductMetaFieldDoc = store?.documents.find(
    (doc) => doc.type === key,
  );

  // 3. Difyでドキュメントを作成 or 更新
  const documentResponse = !existingProductMetaFieldDoc
    ? await createDocumentFromText(datasetId, {
        name: ProductMetaFieldName,
        text: newMetaFieldDescription,
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
            },
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
              { id: "remove_urls_emails", enabled: true },
            ],
          },
        },
        indexing_technique: "high_quality",
      })
    : await updateDocumentByText(datasetId, existingProductMetaFieldDoc.id, {
        name: ProductMetaFieldName,
        text: newMetaFieldDescription,
      });

  const documentId = documentResponse.id;
  if (!documentId) {
    throw new Error("ドキュメントIDの取得に失敗しました。");
  }

  // 4. PrismaでDB更新
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    create: {
      storeId: shop,
      datasetId: datasetId,
      metaFieldDescription: newMetaFieldDescription,
      documents: {
        create: {
          id: documentId,
          name: ProductMetaFieldName,
          text: newMetaFieldDescription,
          datasetId: datasetId,
          type: key,
        },
      },
    },
    update: {
      datasetId: datasetId,
      metaFieldDescription: newMetaFieldDescription,
      documents: {
        upsert: {
          where: { id: documentId },
          create: {
            id: documentId,
            name: ProductMetaFieldName,
            text: newMetaFieldDescription,
            type: key,
            datasetId: datasetId,
          },
          update: {
            text: newMetaFieldDescription,
          },
        },
      },
    },
    include: { documents: true },
  });

  return updatedStore;
}

// 注文データ更新に特化したロジック
async function handleOrderUpsert(params: {
  shop: string;
  newOrderData: string;
  key: string;
}) {
  const { shop, newOrderData, key } = params;

  const OrderDataName = "注文データ";
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { documents: true },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  let datasetId;
  if (store.datasetId) {
    datasetId = store.datasetId;
  } else {
    const knowledgeResponse = await createKnowledge({
      name: shop,
      permission: "only_me",
    });
    datasetId = knowledgeResponse.id;
  }

  const existingOrderDoc = store?.documents.find((doc) => doc.type === key);

  // 3. Difyでドキュメントを作成 or 更新
  const documentResponse = !existingOrderDoc
    ? await createDocumentFromText(datasetId, {
        name: OrderDataName,
        text: newOrderData,
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
            },
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
              { id: "remove_urls_emails", enabled: true },
            ],
          },
        },
        indexing_technique: "high_quality",
      })
    : await updateDocumentByText(datasetId, existingOrderDoc.id, {
        name: OrderDataName,
        text: newOrderData,
      });

  const documentId = documentResponse.id;
  if (!documentId) {
    throw new Error("ドキュメントIDの取得に失敗しました。");
  }

  // 4. PrismaでDB更新
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    create: {
      storeId: shop,
      datasetId: datasetId,
      documents: {
        create: {
          id: documentId,
          name: OrderDataName,
          text: newOrderData,
          type: key,
          datasetId: datasetId,
        },
      },
    },
    update: {
      datasetId: datasetId,
      documents: {
        upsert: {
          where: { id: documentId },
          create: {
            id: documentId,
            name: OrderDataName,
            text: newOrderData,
            type: key,
            datasetId: datasetId,
          },
          update: {
            text: newOrderData,
          },
        },
      },
    },
    include: { documents: true },
  });

  const orderSegments = await getDocumentSegments(datasetId, documentId);

  await Promise.all(
    orderSegments.map(async (segment: any) => {
      console.log("segment: ", segment);

      const content = segment.content.split("## 注文データ")[1];
      const allKeywords = content
        .split(`\n`)
        .map((keyword: string) => keyword && keyword.trim());

      const availableKeywords = [
        "注文日",
        "注文番号",
        "注文金額",
        "注文者",
        "注文者メールアドレス",
        "注文タグ",
      ];

      const filteredKeywords = allKeywords.filter((keyword: string) =>
        availableKeywords.includes(keyword.split(`:`)[0]),
      );

      const productKeywords = segment.content
        .split("商品: ")[1]
        .split(`,`)
        .map((keyword: string) => keyword && keyword.split(`x`)[0].trim());

      const updatedSegment = await updateDocumentSegment(
        datasetId,
        documentId,
        segment.id,
        {
          content: segment.content,
          answer: segment.answer,
          enabled: true,
          keywords: productKeywords.concat(filteredKeywords),
        },
      );

      console.log("updatedSegment: ", updatedSegment);
    }),
  );

  return updatedStore;
}

// 商品データ更新に特化したロジック
async function handleProductUpsert(params: {
  shop: string;
  newProductData: string;
  key: string;
}) {
  const { shop, newProductData, key } = params;

  const ProductDataName = "商品データ";
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { documents: true },
  });

  let datasetId;
  if (store?.datasetId) {
    datasetId = store.datasetId;
  } else {
    const knowledgeResponse = await createKnowledge({
      name: shop,
      permission: "only_me",
    });
    datasetId = knowledgeResponse.id;
  }

  const existingProductDoc = store?.documents.find((doc) => doc.type === key);

  // 3. Difyでドキュメントを作成 or 更新
  const documentResponse = !existingProductDoc
    ? await createDocumentFromText(datasetId, {
        name: ProductDataName,
        text: newProductData,
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
            },
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
              { id: "remove_urls_emails", enabled: true },
            ],
          },
        },
        indexing_technique: "high_quality",
      })
    : await updateDocumentByText(datasetId, existingProductDoc.id, {
        name: ProductDataName,
        text: newProductData,
      });

  const documentId = documentResponse.id;
  if (!documentId) {
    throw new Error("ドキュメントIDの取得に失敗しました。");
  }

  // 4. PrismaでDB更新
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    create: {
      storeId: shop,
      datasetId: datasetId,
      documents: {
        create: {
          id: documentId,
          name: ProductDataName,
          text: newProductData,
          datasetId: datasetId,
          type: key,
        },
      },
    },
    update: {
      datasetId: datasetId,
      documents: {
        upsert: {
          where: { id: documentId },
          create: {
            id: documentId,
            name: ProductDataName,
            text: newProductData,
            type: key,
            datasetId: datasetId,
          },
          update: {
            text: newProductData,
          },
        },
      },
    },
    include: { documents: true },
  });

  const productSegments = await getDocumentSegments(datasetId, documentId);

  await Promise.all(
    productSegments.map(async (segment: any) => {
      console.log("segment: ", segment);

      // ここでセグメントのコンテンツからキーワードを抽出
      const mainContent = segment.content
        .split("## 商品情報")[1]
        .split("## メタフィールド")[0];
      const keywords = mainContent
        .split(`\n`)
        .map((keyword: string) =>
          !keyword.includes("商品説明") ? keyword.trim() : null,
        )
        .filter((keyword: string | null) => keyword && keyword.trim());

      const metaContent = segment.content.split("## メタフィールド")[1];
      const metaKeywords = metaContent
        .split(`\n`)
        .map((keyword: string) => keyword && keyword.trim())
        .filter(Boolean)
        .flat();

      const allKeywords = [...keywords, ...metaKeywords];

      const updatedSegment = await updateDocumentSegment(
        datasetId,
        documentId,
        segment.id,
        {
          content: segment.content,
          answer: segment.answer,
          enabled: true,
          keywords: allKeywords,
        },
      );

      console.log("updatedSegment: ", updatedSegment);
    }),
  );

  return updatedStore;
}

// ポリシー更新に特化したロジック
async function handlePolicyUpsert(params: {
  shop: string;
  newPolicy: string;
  key: string;
}) {
  const { shop, newPolicy, key } = params;

  // 現在のストア情報を取得
  const store = await prisma.store.findUnique({
    where: { storeId: shop },
    include: { documents: true },
  });

  if (!newPolicy?.trim()) {
    throw new Error("ポリシーデータが空です。");
  }

  const policyName = "ストアポリシー";

  // 1. Difyでナレッジ(データセット)の作成 or 既存IDを使用
  let datasetId = store?.datasetId;
  if (!datasetId) {
    const knowledgeResponse = await createKnowledge({
      name: shop,
      permission: "only_me",
    });
    datasetId = knowledgeResponse.id;
  }

  // 2. 既存のポリシードキュメントを検索
  const existingPolicyDoc = store?.documents.find((doc) => doc.type === key);

  // 3. Difyでドキュメントを作成 or 更新
  const documentResponse = !existingPolicyDoc
    ? await createDocumentFromText(datasetId, {
        name: policyName,
        text: newPolicy,
        process_rule: {
          mode: "custom",
          rules: {
            segmentation: {
              separator: CHUNK_SEPARATOR_SYMBOL,
              max_tokens: CHUNK_MAX_TOKENS,
            },
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
              { id: "remove_urls_emails", enabled: true },
            ],
          },
        },
        indexing_technique: "high_quality",
      })
    : await updateDocumentByText(datasetId, existingPolicyDoc.id, {
        name: policyName,
        text: newPolicy,
      });

  const documentId = documentResponse.id;
  if (!documentId) {
    throw new Error("ドキュメントIDの取得に失敗しました。");
  }

  // 4. PrismaでDB更新
  const updatedStore = await prisma.store.upsert({
    where: { storeId: shop },
    create: {
      storeId: shop,
      datasetId: datasetId,
      documents: {
        create: {
          id: documentId,
          name: policyName,
          text: newPolicy,
          type: key,
          datasetId: datasetId,
        },
      },
    },
    update: {
      datasetId: datasetId,
      documents: {
        upsert: {
          where: { id: documentId },
          create: {
            id: documentId,
            name: policyName,
            text: newPolicy,
            type: key,
            datasetId: datasetId,
          },
          update: {
            text: newPolicy,
          },
        },
      },
    },
    include: { documents: true },
  });

  const policySegments = await getDocumentSegments(datasetId, documentId);

  await Promise.all(
    policySegments.map(async (segment: any) => {
      console.log("segment: ", segment);

      // ここでセグメントのコンテンツからキーワードを抽出
      const title = segment.content.split(`##`)[0].trim();
      const keywords = titleForKeywords(title);

      await updateDocumentSegment(datasetId, documentId, segment.id, {
        content: segment.content,
        answer: segment.answer,
        enabled: true,
        keywords: keywords,
      });
    }),
  );

  return updatedStore;
}

function titleForKeywords(policyTitle: string) {
  switch (policyTitle) {
    case "Legal notice":
      return ["特定商法取引法に基づく表記"];
    case "Privacy policy":
      return ["プライバシーポリシー"];
    case "Terms of service":
      return ["利用規約"];
    case "Refund policy":
      return ["返品について"];
    case "Shipping policy":
      return ["配送について"];
    default:
      return [];
  }
}