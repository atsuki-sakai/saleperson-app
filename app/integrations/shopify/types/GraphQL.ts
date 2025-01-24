export interface IShopifyGraphQLOptions {
    query: string;
    variables: { cursor: string | null; pageSize: number };
  }