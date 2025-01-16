import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 1) OAuthフローを実行
  //    認証が完了すると afterAuth が呼ばれ、DBにアクセストークンが保存される
  const { session, redirect } = await authenticate.admin(request);

  // 2) OAuthフロー後のリダイレクト先 (例: "/app")
  if (redirect) return redirect;

  return null;
};
