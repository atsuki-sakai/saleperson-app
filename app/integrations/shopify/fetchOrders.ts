import { authenticate } from "../../shopify.server";
import { q_FetchOrders } from "./query/q_fetchOrders";
import { Order } from "./types";

interface FetchOrdersOptions {
  customerId?: string;
  cursor?: string;
  excludeEmails?: string[];
}

/**
 * 注文データを取得する関数
 */
export const fetchOrders = async (
  request: Request, 
  options: FetchOrdersOptions = {}
): Promise<{ orders: Order[], hasMore: boolean, nextCursor?: string }> => {
  const { admin, session } = await authenticate.admin(request);
  const accessToken = session.accessToken;

  // クエリフィルターの構築
  let queryFilters = [];
  
  if (options.customerId) {
    queryFilters.push(`customer_id:${options.customerId}`);
  }

  if (options.excludeEmails?.length) {
    const emailFilters = options.excludeEmails.map(email => `NOT email:${email}`);
    queryFilters.push(emailFilters.join(" AND "));
  }

  const queryString = queryFilters.length > 0 ? queryFilters.join(" AND ") : "";

  const response = await admin.graphql(
    q_FetchOrders,
    {
      variables: {
        cursor: options.cursor,
        query: queryString
      },
    }
  );

  const { data } = await response.json();
  const orders = data.orders.edges.map((edge: any) => edge.node);

  return {
    orders,
    hasMore: data.orders.pageInfo.hasNextPage,
    nextCursor: data.orders.pageInfo.endCursor
  };
};
