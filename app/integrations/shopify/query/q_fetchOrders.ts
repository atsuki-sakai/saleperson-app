export const q_FetchOrders = `
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
}`;