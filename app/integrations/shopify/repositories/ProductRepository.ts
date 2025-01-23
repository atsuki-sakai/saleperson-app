
import { q_FetchProducts } from "../query";
import { Product } from "../types";
import { safeShopifyGraphQLCall } from "../common";
import { SHOPIFY_PAGE_SIZE } from "app/lib/constants";

export class ProductRepository {
    constructor(private shopDomain: string, private accessToken: string) {
        this.shopDomain = shopDomain;
        this.accessToken = accessToken;
    }

    async fetchAllProducts(): Promise<Product[]> {
        const allProducts: Product[] = [];
        let cursor: string | null = null;
        let hasNextPage = true;

        while (hasNextPage) {
            const variables = { cursor, pageSize: SHOPIFY_PAGE_SIZE };

            const result = await safeShopifyGraphQLCall(this.shopDomain, this.accessToken, q_FetchProducts, variables) as any;

            const edges = result.data?.orders?.edges || [];
            for (const edge of edges) {
                allProducts.push(edge.node);
            }

            hasNextPage = result.data?.products?.pageInfo?.hasNextPage;
            cursor = result.data?.products?.pageInfo?.endCursor || null;
        }

        return allProducts;
    } 
}