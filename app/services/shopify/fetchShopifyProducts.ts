import { authenticate } from "../../shopify.server";
import { Product } from "./types";

/**
 * 商品データを取得する関数
 */
export const fetchShopifyProducts = async (
  request: Request,
  cursor?: string
): Promise<{ products: Product[], hasMore: boolean, nextCursor?: string }> => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query getProducts($cursor: String) {
      products(first: 100, after: $cursor) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            vendor
            status
            totalInventory
            createdAt
            updatedAt
            options {
              id
              name
              values
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantCompareAtPrice {
                amount
                currencyCode
              }
              maxVariantCompareAtPrice {
                amount
                currencyCode
              }
            }
            metafields(first: 10) {
              edges {
                node {
                  namespace
                  key
                  value
                  type
                }
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  sku
                  inventoryQuantity
                  price
                  compareAtPrice
                  selectedOptions {
                    name
                    value
                  }
                  metafields(first: 5) {
                    edges {
                      node {
                        namespace
                        key
                        value
                        type
                      }
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
      variables: { cursor }
    }
  );
  

  const { data } = await response.json();
  const products = data.products.edges.map((edge: any) => edge.node);
  

  return {
    products,
    hasMore: data.products.pageInfo.hasNextPage,
    nextCursor: data.products.pageInfo.endCursor
  };
};