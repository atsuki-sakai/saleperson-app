import axios, { AxiosInstance } from 'axios';
import { GraphQLRepository } from './repositories/GraphQLRepository';

export class ShopifyService {

  public graphQL: GraphQLRepository;

  private apiClient: AxiosInstance;

  constructor(accessToken: string, endPoint: string) {
    this.apiClient = axios.create({
      baseURL: endPoint,
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },  
    });

    this.graphQL = new GraphQLRepository(this.apiClient);
  }
}
