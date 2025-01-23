import { q_fetchPolicies } from "../query";
import { shopifyGraphQLCall } from "../common";
import { ShopPolicies } from "../types/Policies";
export class PoliciesRepository {
    constructor(private shopDomain: string, private accessToken: string) {
        this.shopDomain = shopDomain;
        this.accessToken = accessToken;
    }

    /**
     * ポリシーを取得する
     * @returns 
     */
    async fetchAllPolicies(): Promise<ShopPolicies> {
        const result = await shopifyGraphQLCall(this.shopDomain, this.accessToken, {
            query: q_fetchPolicies,
            variables: {
                cursor: null,
                pageSize: 100,
            },
        });
        if (!result.data?.shop?.shopPolicies) {
            return [];
        }

        return result.data.shop.shopPolicies;
    }

}
