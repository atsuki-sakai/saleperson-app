import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { LITE_PLAN, MONTHLY_PLAN, ANNUAL_PLAN } from "../constants";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session, redirect } = await authenticate.admin(request);
  const shop = session.shop.split(".myshopify.com")[0];

  // Get current subscription status
  const billingCheck = await billing.check();
  const currentSubscription = billingCheck.appSubscriptions[0];

  if (!currentSubscription) {
    // If no subscription exists, redirect to plan selection
    return redirect("/app/select-plan");
  }

  // Cancel the current subscription
  const cancelledSubscription = await billing.cancel({
    subscriptionId: currentSubscription.id,
    isTest: true,
    prorate: true,
  });

  // Redirect back to plan selection after cancellation
  return redirect("/app/select-plan");
};
