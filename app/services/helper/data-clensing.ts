import { CHUNK_SEPARATOR_SYMBOL } from "../dify/const";
import { Order, Product } from "../../services/shopify/types";

export function convertOrdersToText(orders: Order[]): string {
    return orders
      .map((order: Order) => {
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
      })
      .filter(Boolean) // 空の文字列を除去
      .join(CHUNK_SEPARATOR_SYMBOL);
}

export function convertProductsToText(products: Product[], shop: string) {
    // 更新日時順にソート
    const sortedProducts = products.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  
    const productTexts = sortedProducts.map((product) => {
      // オプション
      const options = product.options
        .map((option: any) => `${option.name}: ${option.values.join(", ")}`)
        .filter(Boolean)
        .join(",");
  
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
        const sku = variantNode.sku?.replaceAll("-", "") || null;
  
        return `商品名: ${variantNode.title}
        オプション: ${selectedOptions}
        価格: ${variantNode.price} ${variantNode.currencyCode || "JPY"}
        SKU: ${sku}
        在庫数: ${variantNode.inventoryQuantity || 0}`;
      });
  
      return `${product.title == "商品名: Default Title" ? null : `商品名: ${product.title}`}
      商品ID: ${product.id.replace("gid://shopify/Product/", "")}
      商品URL: https://${shop}/products/${product.handle}
      商品タイプ: ${product.productType || ""}
      販売元: ${product.vendor || ""}
      公開ステータス: ${product.status}
      総在庫数: ${product.totalInventory || 0}
      最終更新日時: ${product.updatedAt}
      商品説明: ${
        product.description?.replace(/<[^>]*>/g, "").replace(/\n/g, " ") || ""
      }
      オプション:${options || ""}
      価格情報: ${priceRange}
      バリエーション:${variants}
      ${metafields || ""}`;
    });
  
    return productTexts.join(CHUNK_SEPARATOR_SYMBOL);
}