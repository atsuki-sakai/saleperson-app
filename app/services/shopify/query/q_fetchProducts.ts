export const quantityFetchProducts = `
    #graphql
    query getProducts($cursor: String, $pageSize: Int) {
      products(first: $pageSize, after: $cursor) {
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
    }
`;

