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
  category: {
    name: string;
    fullName: string;
  };
  collections: {
    edges: { node: { title: string; handle: string } }[];
  };
  tags: string;
  featuredMedia: {
    preview: {
      image: {
        url: string;
        width: number;
        height: number;
      };
    };
  };
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
    edges: { node: { title: string; quantity: number; originalTotalSet: { presentmentMoney: { amount: string; currencyCode: string } } } }[];
  };
};
