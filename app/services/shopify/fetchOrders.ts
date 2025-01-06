import { authenticate } from "../../shopify.server";
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
  const { admin } = await authenticate.admin(request);

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
    `#graphql
    query getOrders($cursor: String, $query: String) {
      orders(first: 50, after: $cursor, query: $query) {
        edges {
          node {
            id
            createdAt
            note
            name
            customer {
              id
              displayName
              email
              phone
              note
            }
            currentTotalPriceSet {
              presentmentMoney {
                amount
                currencyCode
              }
            }
            currentSubtotalLineItemsQuantity
            tags
            lineItems(first: 100) {
              edges {
                node {
                  id
                  title
                  quantity
                  variantTitle
                  originalTotalSet {
                    presentmentMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
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
