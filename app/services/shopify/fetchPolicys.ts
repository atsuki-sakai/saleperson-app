import { authenticate } from "../../shopify.server";


export const fetchPolicies = async (request: Request): Promise<Response> => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query getPolicies{
        shop {
            shopPolicies {
                title
                body
            }
        }
    }`
  );

  return response;
};
