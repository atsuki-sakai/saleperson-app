export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  vendor: string;
  status: string;
  totalInventory: number;
  createdAt: string;
  updatedAt: string;
  options: { id: string; name: string; values: string[] }[];
  priceRangeV2: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  compareAtPriceRange: {
    minVariantCompareAtPrice: { amount: string; currencyCode: string };
    maxVariantCompareAtPrice: { amount: string; currencyCode: string };
  };
  metafields: {
    edges: { node: { namespace: string; key: string; value: string; type: string } }[];
  };
  variants: {
    edges: { node: any }[];
  };
};


export type Order = {
  id: string;
  createdAt: string;
  note: string;
  name: string;
  customer: {
    id: string;
    displayName: string;
    email: string;
    phone: string;
    note: string;
    tags: string;
  };
  currentTotalPriceSet: {
    presentmentMoney: {
      amount: string;
      currencyCode: string;
    };
  },
  currentSubtotalLineItemsQuantity: number;
  tags: string;
  lineItems: {
    edges: { node: { title: string; quantity: number; originalTotalSet: { shopMoney: { amount: string; currencyCode: string } } } }[];
  };
};
