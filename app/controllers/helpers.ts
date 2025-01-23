
import { Product } from "app/integrations/shopify/types";
import { Order } from "app/integrations/shopify/types";
import { CHUNK_SEPARATOR_SYMBOL } from "app/lib/constants";


export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * 注文をテキスト化する
 */
export function convertOrdersToText(orders:Order[]) {
    const convertedOrders = orders.map((order: Order)=>{
      return buildFullOrderText(order).concat(CHUNK_SEPARATOR_SYMBOL);
    });
    return convertedOrders.join("");
  }
  
  /**
   * Difyへ送ってサマリーを生成し、最終的に連結したテキストを返す
   * （商品数が多いと時間がかかります）
   */
  export async function convertProductsToText(products: Product[], shop: string) {
    const productTexts = await Promise.all(products.map(async (product: any) => {
      const productText = buildFullProductText(product, shop);
      return productText.concat(CHUNK_SEPARATOR_SYMBOL);
    }));
    return productTexts.join("");
  }
  
  /**
   * 商品オブジェクトの全プロパティをテキスト化するサンプル
   * ShopifyのGraphQL構造に基づいて多くのフィールドを列挙
   */
  function buildFullProductText(product: Product, shopDomain: string): string {
    // 基本情報
    const handle = product.handle || "";
    const productUrl = `https://${shopDomain}/products/${handle}`;
    const productId = product.id.replace("gid://shopify/Product/", "");
    const vendor = product.vendor || "";
    const productType = product.productType || "";
    const createdAt = product.createdAt || "";
    const updatedAt = product.updatedAt || "";
    const status = product.status || "";
    const title = product.title || "";
    const description = product.description
      ? removeHtml(product.description)
      : "";
    const tags = product.tags || "";
    const totalInventory = product.totalInventory || 0;
  
    // 商品オプション
    const optionsText = product.options
      .map((opt) => {
        const optName = opt.name;
        const optValues = opt.values.join(", ");
        return `  - ${optName}: ${optValues}`;
      })
      .join("\n");
  
    // バリエーション
    let variantsText = "";
    if (product.variants?.edges?.length) {
      variantsText = product.variants.edges
        .map((edge) => {
          const v = edge.node;
          const titleV = v.title || "";
          const priceV = v.price || "";
          const currencyV = v.currencyCode || "JPY";
          const skuV = v.sku || "";
          const invQty = v.inventoryQuantity || 0;
          const selectedOpts = v.selectedOptions
            .map((so: any) => `${so.name}: ${so.value}`)
            .join(", ");
  
          return `  ▼ バリエーション
      タイトル: ${titleV}
      価格: ${priceV} ${currencyV}
      SKU: ${skuV}
      在庫数: ${invQty}
      選択オプション: ${selectedOpts}`;
        })
        .join("\n\n");
    }
  
    // メタフィールド
    let metafieldsText = "";
    if (product.metafields?.edges?.length) {
      metafieldsText = product.metafields.edges
        .map((mf) => {
          const node = mf.node;
          const key = node.key;
          let val = node.value;
          // JSON配列の場合パース
          try {
            if (val.startsWith("[")) {
              val = JSON.parse(val).join(", ");
            }
          } catch {}
          val = removeHtml(val);
          return `  - ${key}: ${val}`;
        })
        .join("\n");
    }
  
    // コレクション
    const collectionTitles = product.collections?.edges?.map((c) => c.node?.title) || [];
    const collectionText = collectionTitles.join(", ");
  
    // カテゴリ
    const categoryFullName = product.category?.fullName || "";
  
    // featuredMedia
    let featuredMediaUrl = "";
    if (product.featuredMedia?.preview?.image?.url) {
      featuredMediaUrl = product.featuredMedia.preview.image.url;
    }
  
    // priceRange
    let priceRangeText = "";
    if (product.priceRangeV2) {
      const minP = product.priceRangeV2.minVariantPrice;
      const maxP = product.priceRangeV2.maxVariantPrice;
      priceRangeText = `${minP.amount} ${minP.currencyCode} ～ ${maxP.amount} ${maxP.currencyCode}`;
    }
  
    return `
  商品名: ${title}
  商品ID: ${productId}
  ステータス: ${status}
  URL: ${productUrl}
  作成日時: ${createdAt}
  最終更新日時: ${updatedAt}
  商品説明: ${description}
  販売元(Vendor): ${vendor}
  商品タイプ(ProductType): ${productType}
  在庫数(TotalInventory): ${totalInventory}
  タグ: ${tags}
  コレクション: ${collectionText}
  カテゴリ: ${categoryFullName}
  商品画像URL: ${featuredMediaUrl}
  価格帯: ${priceRangeText}
  
  【オプション一覧】
  ${optionsText}
  
  【バリエーション一覧】
  ${variantsText}
  
  【メタフィールド一覧】
  ${metafieldsText}
  `.trim();
  }
  
  /**
   * 注文をテキスト化する
   */
  function buildFullOrderText(order: Order): string {
    return `注文日:${order.createdAt.toLocaleString()}
    注文番号: ${order.name || "不明"}
    注文ID: ${order.id.replace("gid://shopify/Order/", "")}
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
      ).join(", ")}`;
  }
  
  /**
   * シンプルなHTMLタグ除去
   */
  function removeHtml(text: string) {
    return text.replace(/<[^>]*>/g, "").replace(/\n/g, " ");
  }
  
  
/**
 * Difyで返却されるSummary JSONに"```json"が存在するパターンがあるので取り除く。
 * 稀に生成AIが違うパターンを返すことがあるので実装している。
 */
  export function transformDifyResponseToString(apiResponse: any): string {
    if (!apiResponse?.answer) {
      return "No answer found in response.";
    }
  
    const codeBlockRegex = /```(?:json)?\n([\s\S]*?)\n```/;
    const match = codeBlockRegex.exec(apiResponse.answer);
    if (!match) {
      return apiResponse.answer;
    }
  
    let parsed: any;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      return apiResponse.answer;
    }
  
    // 例として JSONをきれいに表示
    return JSON.stringify(parsed, null, 2);
  }
  

  /**
   * ポリシー本文を結合しつつHTMLタグ除去
   */
  export function convertPolicyToText(responseData: any): string {
    return responseData.data.shop.shopPolicies
    .map((p: any) => `${p.title}\n\n${removeHtml(p.body)}\n${CHUNK_SEPARATOR_SYMBOL}`)
    .join("\n")
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, "")
    .trim();
  }


  /**
   * Difyで返却されるSummary JSONを、改行区切りのテキストへ変換する関数。
   * 以下のようなフィールド構造を想定：
   * {
   *   "productInfo": {...},
   *   "targets": [...],
   *   "features": [...],
   *   "benefits": [...],
   *   "useCases": [...],
   *   "faq": [...],
   *   "callToAction": "..."
   * }
   *
   * @param apiResponse DifyのgenerateSummaryAndTargets(text: string)のレスポンスを適切に処理する
   * @returns 整形したテキスト
   */
  export function summaryObjectToText(apiResponse: any): string {

    if (!apiResponse?.answer) {
    return "No answer found in response.";
    }

    const codeBlockRegex = /```(?:json)?\n([\s\S]*?)\n```/;
    const match = codeBlockRegex.exec(apiResponse.answer);
    if (!match) {
    return apiResponse.answer;
    }

    let parsed: any;
    try {
    parsed = JSON.parse(match[1]);
    } catch {
    return apiResponse.answer;
    }
    const summaryObj = JSON.stringify(parsed, null, 2) as any;

    if (typeof summaryObj !== "object" || !summaryObj) {
      return "No valid summary object provided.";
    }
  
    const lines: string[] = [];
  
    // -----------------------------
    // 1) productInfo
    // -----------------------------
    if (summaryObj.productInfo) {
      const { name, type, category, priceRange, imageUrl, sku } = summaryObj.productInfo;
      lines.push("【商品情報】");
      if (name)       lines.push(`・商品名: ${name}`);
      if (type)       lines.push(`・商品タイプ: ${type}`);
      if (category)   lines.push(`・カテゴリ: ${category}`);
      if (priceRange) lines.push(`・価格帯: ${priceRange}`);
      if (imageUrl)   lines.push(`・商品画像URL: ${imageUrl}`);
      if (sku)        lines.push(`・SKU: ${sku}`);
      lines.push("");
    }
  
    // -----------------------------
    // 2) targets
    // -----------------------------
    if (Array.isArray(summaryObj.targets) && summaryObj.targets.length > 0) {
      lines.push("【ターゲット】");
      summaryObj.targets.forEach((t: any, i: number) => {
        lines.push(`ターゲット#${i + 1}`);
        if (t.persona)     lines.push(`  - ペルソナ: ${t.persona}`);
        if (t.gender)      lines.push(`  - 性別: ${t.gender}`);
        if (t.age)         lines.push(`  - 年齢: ${t.age}`);
        if (t.income)      lines.push(`  - 収入: ${t.income}`);
        if (t.location)    lines.push(`  - 居住地: ${t.location}`);
        if (t.interests)   lines.push(`  - 興味: ${t.interests}`);
        if (t.lifestyle)   lines.push(`  - ライフスタイル: ${t.lifestyle}`);
        if (t.behavior)    lines.push(`  - 行動パターン: ${t.behavior}`);
        if (t.description) lines.push(`  - 説明: ${t.description}`);
        lines.push("");
      });
    }
  
    // -----------------------------
    // 3) features
    // -----------------------------
    if (Array.isArray(summaryObj.features) && summaryObj.features.length > 0) {
      lines.push("【特徴】");
      summaryObj.features.forEach((f: any, i: number) => {
        lines.push(`特徴#${i + 1}`);
        if (f.feature)     lines.push(`  - 名称: ${f.feature}`);
        if (f.description) lines.push(`  - 詳細: ${f.description}`);
        lines.push("");
      });
    }
  
    // -----------------------------
    // 4) benefits
    // -----------------------------
    if (Array.isArray(summaryObj.benefits) && summaryObj.benefits.length > 0) {
      lines.push("【メリット】");
      summaryObj.benefits.forEach((b: any, i: number) => {
        lines.push(`メリット#${i + 1}`);
        if (b.benefit)     lines.push(`  - 項目: ${b.benefit}`);
        if (b.description) lines.push(`  - 詳細: ${b.description}`);
        lines.push("");
      });
    }
  
    // -----------------------------
    // 5) useCases
    // -----------------------------
    if (Array.isArray(summaryObj.useCases) && summaryObj.useCases.length > 0) {
      lines.push("【使用例】");
      summaryObj.useCases.forEach((u: any, i: number) => {
        lines.push(`使用例#${i + 1}`);
        if (u.title)       lines.push(`  - タイトル: ${u.title}`);
        if (u.description) lines.push(`  - 詳細: ${u.description}`);
        lines.push("");
      });
    }
  
    // -----------------------------
    // 6) faq
    // -----------------------------
    if (Array.isArray(summaryObj.faq) && summaryObj.faq.length > 0) {
      lines.push("【よくある質問(FAQ)】");
      summaryObj.faq.forEach((q: any, i: number) => {
        lines.push(`Q&A#${i + 1}`);
        if (q.question) lines.push(`  - 質問: ${q.question}`);
        if (q.answer)   lines.push(`  - 回答: ${q.answer}`);
        lines.push("");
      });
    }
  
    // -----------------------------
    // 7) callToAction
    // -----------------------------
    if (summaryObj.callToAction) {
      lines.push("【購入アクション】");
      lines.push(summaryObj.callToAction);
      lines.push("");
    }
  
    // 仕上げ
    return lines.join("\n");
  }
