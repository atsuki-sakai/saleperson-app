import { q_fetchPolicies } from "../query";
import { shopifyGraphQLCall } from "../common";

export class FaqRepository {
    constructor(private shopDomain: string, private accessToken: string) {
        this.shopDomain = shopDomain;
        this.accessToken = accessToken;
    }

    /**
     * ポリシーを取得する
     * @returns 
     */
    async fetchAllFaqs(): Promise<any> {
        const result = await shopifyGraphQLCall(this.shopDomain, this.accessToken, {
            query: q_fetchPolicies,
            variables: {
                cursor: null,
                pageSize: 250,
            },
        }) as any;

        console.log("policies", result.data?.shop?.shopPolicies);

        return result.data?.shop?.shopPolicies || [];
    }

}