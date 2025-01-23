import { OrderRepository } from "./repositories/OrderRepository";
import { ProductRepository } from "./repositories/ProductRepository";

export class ShopifyService {

  public order: OrderRepository;
  public product: ProductRepository;

  constructor(accessToken: string, shopDomain: string) {
    this.order = new OrderRepository(accessToken, shopDomain);
    this.product = new ProductRepository(accessToken, shopDomain);
  }
}
