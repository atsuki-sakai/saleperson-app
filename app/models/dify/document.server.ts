
// import { fetchOrders } from "../../integrations/shopify/fetchOrders";
// import { fetchPolicies } from "../../integrations/shopify/fetchPolicys";
// import { convertOrdersToText, convertPolicyToText } from "./document.utils";

// // 既存のDify関連ユーティリティ

// // import {
// //   upsertOrders,
// //   upsertPolicy,
// //   upsertFaq,
// //   upsertProductMeta,
// // } from "./dataset.server";

// /**
//  * 注文データのアップサート処理
//  * - 引数で除外したいメールアドレスを指定すると、その顧客メールを含む注文を除外
//  */
// export async function importOrders(shop: string, request: Request, excludeEmails: string[] = []) {
//   // 1. 注文取得
//   const { orders } = await fetchOrders(request, {
//     excludeEmails,
//   });
//   // 2. クリーニング
//   const formattedContent = convertOrdersToText(orders);

//   // 3. DifyへドキュメントをUpsertし、Prisma上でもstore.documentsを更新
//   const store = await upsertOrders(shop, formattedContent);

//   return store;
// }

// /**
//  * ポリシーデータのアップサート処理
//  */
// export async function importPolicies(shop: string, request: Request) {
//   // 1. ポリシー取得
//   //   fetchPolicies(...) は GraphQL呼び出し後に { data: { shop: { shopPolicies: [...]} } } という形で返る想定
//   const response = await fetchPolicies(request);
//   const data = await response.json();

//   // 2. ポリシーをテキストデータに変換
//   const convertedPolicyText = convertPolicyToText(data);

//   // 3. DifyへUpsert
//   const store = await upsertPolicy(shop, convertedPolicyText);
//   return store;
// }

// /**
//  * FAQのアップサート処理
//  * - 事前にフォームなどから受け取ったFAQコンテンツをDifyへ連携
//  */
// export async function importFaq(shop: string, faqContent: string) {
//   const store = await upsertFaq(shop, faqContent);
//   return store;
// }

// /**
//  * 商品メタフィールド説明文のアップサート
//  */
// export async function importProductMeta(shop: string, metaFieldDescription: string) {
//   const store = await upsertProductMeta(shop, metaFieldDescription);
//   return store;
// }
