
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
  