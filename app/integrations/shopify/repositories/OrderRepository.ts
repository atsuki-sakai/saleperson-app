import { q_FetchOrders } from "../query";
import { Order } from "../types";
import { safeShopifyGraphQLCall } from "../common";
import { SHOPIFY_PAGE_SIZE } from "app/lib/constants";

export class OrderRepository {
    
    constructor(private shopDomain: string, private accessToken: string) {
        this.shopDomain = shopDomain;
        this.accessToken = accessToken;
    }
    /**
     * 全注文をページネーションで取得する例
     */
    async fetchAllOrders(): Promise<Order[]> {
        const allOrders: Order[] = [];
        let cursor: string | null = null;
        let hasNextPage = true;

        while (hasNextPage) {
            const variables = { cursor, pageSize: SHOPIFY_PAGE_SIZE };

            const result = await safeShopifyGraphQLCall(this.shopDomain, this.accessToken, q_FetchOrders, variables) as any;

            const edges = result.data?.orders?.edges || [];
            for (const edge of edges) {
                allOrders.push(edge.node);
            }

            hasNextPage = result.data?.orders?.pageInfo?.hasNextPage;
            cursor = result.data?.orders?.pageInfo?.endCursor || null;
        }

        return allOrders;
    } 
}