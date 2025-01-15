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

## 5. GCP CloudSQLとの連携

1.	Cloud SQLインスタンスを作成
•	Google Cloud Console上でPostgreSQLインスタンスを立ち上げる
•	リージョンやマシンスペックを選択し、接続方法（パブリックIP/プライベートIP/Unixソケット）を決める。すべてのIPアドレスから許可する場合(0.0.0.0/0)※開発時のみ
2.	ローカル環境からCloud SQLに接続できるかテスト
•	一時的にパブリックIPとホワイトリスト設定を使って、自分のPCから直接接続する
•	もしくはCloud SQL Auth Proxy をローカルで動かしてUnixソケット的に接続する方法もある
3.	ShopifyアプリのPrismaのスキーマををPostgreSQLに切り替え以下参照

    '''bash
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    '''
•	sqlite3 → pg に変更して connection 情報をPostgreSQL向けに書き換える
•	すでにSQLite用のマイグレーションファイルやデータがある場合、必要に応じてPostgreSQLのスキーマへ変換/移行する
4.	Shopifyアプリの.envや設定ファイルを更新
•	DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/DB_NAME?..." の形式で設定
•	Cloud Runを使う場合はUnixソケット（?host=/cloudsql/PROJECT_ID:REGION:INSTANCE）接続に切り替える
5.	データ移行とテスト
•	SQLiteに溜まっていたデータがあれば、CSVエクスポート・インポートなどでPostgreSQLへ移行
•	アプリを起動して、問題なく接続・CRUD処理が動くか確認
6.	本番デプロイ
•	Cloud Runやどこかの環境にアプリをデプロイし、Cloud SQL(PostgreSQL)と連携
•	GCPのIAMロールを正しく設定（Cloud SQL Client権限など）し、認証エラーを回避する

※開発環境のDBはprisma.schemeのDATABASE_URLをLOCALのものを使用する