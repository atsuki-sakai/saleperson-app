import { OrderRepository } from "./repositories/OrderRepository";
import { ProductRepository } from "./repositories/ProductRepository";
import { PoliciesRepository } from "./repositories/PoliciesRepository";
export class ShopifyService {

  public order: OrderRepository;
  public product: ProductRepository;
  public policies: PoliciesRepository;

  constructor(accessToken: string, shopDomain: string) {
    this.order = new OrderRepository(accessToken, shopDomain);
    this.product = new ProductRepository(accessToken, shopDomain);
    this.policies = new PoliciesRepository(accessToken, shopDomain);
  }
}
