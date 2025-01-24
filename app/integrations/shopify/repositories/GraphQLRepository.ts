
import { SHOPIFY_API_VERSION } from 'app/lib/constants';
import axios, { AxiosInstance } from 'axios';
import { delay } from 'app/lib/helpers';

export class GraphQLRepository {
    private apiClient: AxiosInstance;
    constructor(apiClient: AxiosInstance) {
        this.apiClient = apiClient;
    }

    public async shopifyGraphQLCall(
        shopDomain: string,
        query: string,
        variables: { cursor: string | null; pageSize: number },
    ) {
        const endpoint = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

        const res = await this.apiClient.post(endpoint, {
            query,
            variables,
        });

        if (res.status !== 200) {
            throw new Error(`GraphQL request failed: ${res.status} - ${res.data}`);
        }

        return res.data;
    }

    // APIのレートリミットで429が返ってきた場合にリトライするラッパー
    public async safeShopifyGraphQLCall(
        shopDomain: string,
        query: string,
        variables: { cursor: string | null; pageSize: number },
        baseSleepMs = 3000,
    ): Promise<any> {
        let retryCount = 0;
        let sleepTime = baseSleepMs;

        while (true) {
            try {
            const data = await this.shopifyGraphQLCall(shopDomain, query, variables);
            return data;
            } catch (error: any) {
            if (
                typeof error.message === "string" &&
                (error.message.includes("429") ||
                error.message.includes("Too Many Requests"))
            ) {
                console.error(
                `[WARN] Throttled error detected. Retry count=${retryCount}`,
                );
                retryCount += 1;
                sleepTime = sleepTime * 1.5; // Exponential backoff
                await delay(sleepTime);
                console.log("sleepTime", sleepTime);
                continue;
            } else {
                throw error;
            }
            }
        }
    }
}
