# Web Matcha 実装計画（ドラフト）

この文書は 42-"Web Matcha" 課題の実装たたき台です。要件を満たしつつ、拡張しやすく、評価観点（セキュリティ・安定性）に強い構成を目指します。

## 0. 前提・方針
- ブラウザ: Firefox / Chrome 対応、モバイルフレンドリー（レスポンシブ）。
- セキュリティ最優先: 平文パスワード禁止、XSS/SQLi/不正アップロード禁止、入力/ファイル検証必須、秘密は `.env` に格納（Git 追跡外）。
- DB: リレーショナル（PostgreSQL 推奨）。クエリは「手書きのパラメータ化 SQL」を使用（ORM 非依存）。
- リアルタイム: WebSocket（Socket.IO 等）で ≤10 秒遅延を保証。フォールバックはロングポーリング。
- 500+ プロフィール: シードスクリプトで生成（現実的な分布・タグ・位置情報）。
- 探索/検索の優先度: 地理的近接 > 共通タグ > Fame Rating。
- under-spec の補完: 課題文にない詳細は一般的実装慣行で補います（CSRF、Rate-limit 等）。

## 1. 技術選定（提案）
- Backend: Node.js + Express（Router/ミドルウェア中心のマイクロフレームワーク）
  - 認証: JWT（HttpOnly/SameSite=Lax/Secure）+ メールリンク検証
  - DB 接続: `pg`（node-postgres）+ 手書き SQL
  - Realtime: Socket.IO（WS + フォールバック）
  - メール: Nodemailer（開発は MailHog/Mailtrap）
  - 画像処理: Sharp（リサイズ/EXIF 除去/フォーマット制限）
  - 入力検証: zod or joi（サーバ側）
  - ログ: pino など構造化ログ
- Frontend: React + Vite + TypeScript
  - UI: Mantine（既存）
  - 状態管理: React Query + Zustand（または Redux Toolkit）
  - ルーティング: React Router
  - リアルタイム: socket.io-client
  - Lint/Format: Biome（既存）
- Infra（開発時）
  - Docker Compose（PostgreSQL、MailHog、MinIO（オプション））
  - 画像保存: 開発はローカル `uploads/`、本番想定は S3 互換（MinIO/S3）

> 注: フレームワークは提案であり、他言語/フレームワークにも置換可能（Flask/Sinatra 等）。

## 2. アーキテクチャ概要
- クライアント（SPA）: 認証・UI・通知バナー・チャット UI・検索/一覧/プロフィール画面
- API サーバ: REST + WS
  - REST: 認証・プロフィール CRUD・探索/検索・いいね/ブロック/通報・通知取得・画像アップロード
  - WebSocket: チャット、通知（新着メッセージ、いいね、相互いいね、閲覧、解除）
- データベース: 正規化 + インデックス + 制約
- ファイルストレージ: ユーザー画像（最大 5 枚）

## 3. データモデル（PostgreSQL; 主キーは `BIGSERIAL`）
```
users(id, email UNIQUE, username UNIQUE, first_name, last_name, password_hash, email_verified BOOLEAN, created_at, updated_at)
email_verification_tokens(id, user_id FK, token UNIQUE, expires_at, used_at NULLABLE)
password_reset_tokens(id, user_id FK, token UNIQUE, expires_at, used_at NULLABLE)
profiles(user_id PK/FK, gender, sexual_pref, bio, fame_rating NUMERIC(5,2) DEFAULT 0, birthdate, is_online BOOLEAN, last_seen_at)
photos(id, user_id FK, url, is_profile BOOLEAN, created_at)
tags(id, name UNIQUE)
user_tags(user_id FK, tag_id FK, PRIMARY KEY(user_id, tag_id))
likes(id, liker_id FK, likee_id FK, created_at, UNIQUE(liker_id, likee_id))
blocks(id, blocker_id FK, blockee_id FK, created_at, UNIQUE(blocker_id, blockee_id))
reports(id, reporter_id FK, reported_id FK, reason TEXT, created_at)
views(id, viewer_id FK, viewed_id FK, created_at)
connections(id, user_a_id, user_b_id, created_at, UNIQUE(user_a_id, user_b_id))  -- 相互いいね成立時
messages(id, connection_id FK, sender_id FK, body TEXT, created_at, read_at NULLABLE)
notifications(id, user_id FK, type, payload JSONB, created_at, read_at NULLABLE)
locations(user_id PK/FK, lat NUMERIC(9,6), lon NUMERIC(9,6), geohash TEXT, updated_at)
```
- インデックス例
  - `likes(likee_id)`、`views(viewed_id)`、`messages(connection_id, created_at)`
  - `profiles(fame_rating)`、`profiles(birthdate)`
  - `locations(geohash)` or `locations(lat, lon)`（ハバサイン距離計算用）
- 距離検索
  - シンプル: Haversine を SQL で計算（近距離は geohash 前方一致で絞り込み → 距離昇順）
  - 拡張: PostGIS/earthdistance/cube を採用可（任意）
- Fame Rating（例）
  - `fame =  base + w_like * (#likes_received) + w_view * (#profile_views) + w_conn * (#mutual_connections) - w_block * (#blocked_by)`
  - 正規化のため週次/総合でスケーリング

## 4. 主なユースケースと API（抜粋）
- 認証
  - POST /auth/register → メール送信
  - POST /auth/login → HttpOnly Cookie に JWT セット
  - POST /auth/logout
  - GET /auth/verify-email?token=...
  - POST /auth/forgot-password → リセットメール
  - POST /auth/reset-password
- プロフィール
  - GET /me, PATCH /me
  - POST /me/photos（最大 5・画像検証）/ DELETE /me/photos/:id
  - GET /users/:username（公開情報）
  - GET /me/visitors, /me/likers
- 位置情報
  - POST /me/location（lat/lon または IP 推定）
- 探索/検索
  - GET /suggestions?sort=distance|fame|tags&...（近接>共通タグ>評判で内部スコアリング）
  - GET /search?age_min&age_max&fame_min&fame_max&location&tags=tag1,tag2 ...
- アクション
  - POST /users/:id/like, DELETE /users/:id/like
  - POST /users/:id/block, DELETE /users/:id/block
  - POST /users/:id/report
- チャット（WS/REST）
  - WS: `chat:join {connectionId}` / `chat:message {text}` / `chat:typing` / 既読通知
  - REST: GET /connections, GET /connections/:id/messages?cursor=...
- 通知（WS/REST）
  - WS: `notif:subscribe`, push で events（like/view/message/mutual/unlike）
  - REST: GET /notifications?unread=true, PATCH /notifications/:id/read

## 5. リアルタイム要件
- ≤10 秒: WS 常時接続、フォールバックで 10 秒ポーリング。
- どのページでも気付ける UI: SPA のグローバルヘッダーにバッジ/トースト表示。
- オンライン表示: WS 接続管理 + last_seen_at 更新、数分以内でオフライン化。

## 6. バリデーション/アップロード/セキュリティ
- 入力検証: サーバ側（zod/joi）とクライアント側（フォームバリデーション）両方。
- 認証/セッション
  - HttpOnly/SameSite=Lax/Secure Cookie に短命アクセストークン + 長命リフレッシュ（サーバ保管可）
  - パスワード: Argon2id もしくは bcrypt（適切なコスト）
- CSRF: Cookie 認証のエンドポイントは CSRF トークン必須（または SameSite 厳格運用）
- XSS: 出力エスケープ、React のサニタイズ、富豪入力のサーバ側ストリップ
- SQLi: すべての SQL はパラメータ化、LIKE などもエスケープ
- Rate limit: 認証/メール/検索などに IP/ユーザー単位のレート制限
- 画像アップロード
  - 拡張子/Content-Type/シグネチャチェック（MIME sniff）
  - サイズ上限、寸法上限、EXIF 除去、危険ファイル拒否
  - 保存先: `uploads/{userId}/{uuid}.jpg`、DB にメタ保持
- 通報/ブロック
  - ブロック状態なら相互に: プロフィール非表示、通知/チャット不可、検索/推薦から除外

## 7. 位置情報
- 取得順序
  1) HTML5 Geolocation（高精度）
  2) 許可されない/失敗時は IP ジオロケーション（概算）
  3) ユーザーによる手動調整（地図 UI）
- 検索/推薦では地理優先（市区町村/近隣単位の geohash 前方一致 → 半径絞り込み）

## 8. UI 画面（最低限）
- 認証: 登録/ログイン/メール認証完了/パスワード再設定
- プロフィール: 編集（基本/写真/タグ/位置）、閲覧（公開）
- 推薦一覧/検索: フィルタ/ソート、カード/リスト表示
- 詳細: いいね/解除、通報、ブロック、評判/オンライン表示
- チャット: スレッド一覧 + メッセージビュー、既読、入力中表示
- 通知: グローバルバッジ、タイムライン、既読管理
- 設定: 位置手動編集、通知設定、アカウント削除

## 9. シード/ダミーデータ（500+）
- 名前/年齢/性別/性的指向/タグ/写真/位置の擬似データを生成（Faker）。
- 熱量バイアスを与えて likes/views を生成 → 現実的な fame を作成。

## 10. ログ/監視
- 監査ログ: 認証、いいね/解除、ブロック/解除、通報、メッセージ送信
- 構造化ログ + 相関 ID、エラーレポート（開発はコンソール、後で Sentry 等）

## 11. テスト戦略
- ユニット: バリデーション、サービス層（like 成立→通知発火 など）
- 統合: 主要 REST エンドポイント、SQL 実行、認証フロー
- E2E: 主要ユーザーフロー（登録→認証→プロフィール→推薦→相互いいね→チャット）
- セキュリティ: SQLi/XSS/CSRF/ファイル検証のネガティブテスト

## 12. マイルストーン（目安）
1. 基盤整備（Day 1-2）
   - リポジトリ構成、環境変数、DB 立ち上げ、ベーシック CI
2. 認証/メール（Day 3-5）
   - 登録/ログイン/メール検証/リセット、.env 秘匿
3. プロフィール/写真/タグ/位置（Day 6-8）
   - CRUD、アップロード、ジオロケ基盤
4. 推薦/検索（Day 9-11）
   - ソート/フィルタ/距離計算/共通タグ
5. いいね/相互/ブロック/通報/閲覧記録（Day 12-13）
6. チャット & 通知（Day 14-16）
   - WS、既読、トースト、全ページ通知
7. 仕上げ（Day 17-18）
   - 500+ シード、レスポンシブ、アクセシビリティ、監査ログ
8. バッファ & ボーナス（Day 19-21）
   - OmniAuth、写真 DnD、地図、音声/映像、デート調整

## 13. ディレクトリ構成（提案）
```
matcha/
  backend/
    src/
      app.ts
      routes/
      controllers/
      services/
      repositories/   # 手書き SQL と DB アクセス
      sockets/
      middlewares/
      schemas/        # 入力検証
      utils/
    migrations/
    seed/
    .env.example
  frontend/
    src/
      components/
      pages/
      features/
      hooks/
      lib/
    public/
    .env.example
  uploads/            # dev 用（Git 追跡外）
  docs/
    IMPLEMENTATION_PLAN.md
  README.md
  .gitignore
```

## 14. リスクと対策
- 画像アップロードによる攻撃: MIME/拡張/シグネチャ検証、変換保存、直リンク禁止
- 位置情報の不正/粗さ: 手動調整 + 表示は概算、内部は丸めた精度で保存
- リアルタイム接続の不安定さ: 再接続/バックオフ/フォールバック
- 500+ データでの検索性能: 適切なインデックスとページネーション、クエリ計画確認
- メール配信失敗: 再送キュー、開発は MailHog で検証

---
この計画はドラフトです。技術選定の変更（例: Flask + SQLAlchemy/原則手書きSQL、Go + chi など）や UI ライブラリの差し替えにも対応できます。次ステップは、最小スケルトンのリポジトリ初期化と DB スキーマ設計の確定です。

## 15. フロントエンド（現状）とのすり合わせ事項
- 構成の確認
  - UI ライブラリは Mantine を採用済み（`MantineProvider` でテーマ適用）。
  - Lint/Formatter は Biome（`biome.json`）を使用。ESLint/Prettier は不要。
  - まだ導入していないもの: `react-router-dom`, `socket.io-client`, データ取得ラッパ（`fetch`/`axios` など）。
- API 接続方針（開発時）
  - 選択肢A: Vite の dev サーバ proxy を使用し、`/api` を backend（例: http://localhost:3000）へプロキシ。
    - 期待設定例: `server.proxy['/api'] = 'http://localhost:3000'`
  - 選択肢B: 環境変数 `VITE_API_BASE_URL` を使い、`fetch(`${import.meta.env.VITE_API_BASE_URL}/api/...`)` で呼び出し。
  - 認証 Cookie を使う場合は `credentials: 'include'` を徹底（CORS は `Access-Control-Allow-Credentials: true`、オリジンは `http://localhost:5173` を許可）。
- 認証と CORS
  - Cookie: `HttpOnly; Secure; SameSite=Lax` を基本。CSRF トークンも併用。
  - CORS（開発）: Origin=`http://localhost:5173`、Credentials=true、必要なヘッダのみ許可。
- WebSocket の取り決め（案）
  - 接続パス/ネームスペース: `/ws`（例）。
  - イベント（通知）: `notif:like`, `notif:view`, `notif:message`, `notif:mutual`, `notif:unlike`。
  - イベント（チャット）: `chat:join`, `chat:message`, `chat:typing`, `chat:read`。
  - 再接続と退避: エクスポネンシャルバックオフ、オフライン検知、`last_seen_at` 更新。
- ルーティング（予定）
  - `react-router-dom` を導入し、`/login`, `/register`, `/profile/:username`, `/chat`, `/search`, `/settings` などを定義。
- 型と契約
  - フロント/バックで DTO の齟齬を避けるため、OpenAPI もしくは zod スキーマ共有のいずれかを導入検討。
