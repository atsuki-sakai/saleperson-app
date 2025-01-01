# デプロイ手順

## 1. 準備作業
1. GitHubリポジトリの作成とShopifyアプリのプッシュ
2. Dockerfileの編集
3. cloudbuild.yamlの作成

## 2. GCPプロジェクトのセットアップ
1. 必要なAPIの有効化
   - Cloud Build
   - Artifact Registry
   - 課金の有効化

2. 環境変数の設定
   ```bash
   # 環境変数の確認
   npm run shopify app env show
   ```

   Cloud Runに設定が必要な環境変数:
   - SHOPIFY_API_KEY
   - SHOPIFY_API_SECRET
   - SCOPES
   - SHOPIFY_APP_URL

   注意: Dockerで指定したPORT=3000に合わせて設定

## 3. デプロイ
1. Cloud RunでGitHubリポジトリからプロジェクトをデプロイ

## 4. Shopify設定の更新
1. ShopifyアプリのURLをCloud RunのURLに更新