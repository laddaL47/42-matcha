# バックエンド検証ガイド

このドキュメントは、macOS 上で Docker（PostgreSQL + MailHog）と Node.js を使って、バックエンドをエンドツーエンドで検証する手順をまとめたものです。環境変数（.env）の設定、DB マイグレーション、サーバ起動、API の動作確認（メール検証・パスワードリセット）までをカバーします。任意で WebSocket の疎通確認も含みます。
## 前提条件

- macOS
  - Docker Desktop がインストール・起動済み
- 空いているポート
  - 3000（バックエンド）
  - 5432（PostgreSQL）
## 1) インフラ起動（Docker Compose）

- Postgres と MailHog を起動します。
```bash
docker compose up -d
```
- Postgres のヘルス（任意）

```bash
docker inspect -f '{{.State.Health.Status}}' matcha-postgres
```
- MailHog の Web UI

- http://localhost:8025
## 2) backend/.env を用意

- `backend/.env` を作成し、必要に応じて値を調整します（例）
```dotenv
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_me
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/matcha
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="Matcha <no-reply@matcha.local>"
```

## 3) 依存インストールとマイグレーション適用
```bash
cd backend
npm install
npm run db:migrate
```

## 4) バックエンド起動とヘルスチェック
```bash
npm run dev
```

## 5) 最小認証フロー（register → me）
- 一意なユーザーで登録し、Cookie を保存

```bash
cd .. # リポジトリルートに戻る場合
CJ=tmp/matcha_cookies.txt
suffix=$(date +%s)
email="tester_${suffix}@example.com"
uname="tester_${suffix}"
printf '{"email":"%s","username":"%s","password":"password123"}' "$email" "$uname" > tmp/reg.json
curl -i -c "$CJ" \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  --data @tmp/reg.json \
  http://localhost:3000/api/auth/register
- Cookie を付与して /me を取得

```bash
curl -sS -b "$CJ" -H 'Accept: application/json' http://localhost:3000/api/auth/me | jq .
```

## 6) CSRF 保護（セッションがある変更系 API）

ログイン後など、セッション Cookie（access_token）が付与されている状態での変更系 API（POST/PUT/PATCH/DELETE）は CSRF 対策として二重送信トークン（double-submit）を要求します。

- サーバは「安全なメソッド（GET/HEAD/OPTIONS）」に対し、ログイン済みであれば `csrf_token` Cookie を発行し、同時にレスポンスヘッダ `X-CSRF-Token` にも値を乗せます。
- 変更系 API を叩く際は、`X-CSRF-Token` ヘッダに `csrf_token` Cookie と同じ値を付与してください。
- 不一致 or 欠落時は 403 になります。

例: ログアウト API の検証（403 → 204）

```bash
# 1) まずログイン（または register）して Cookie を保存している前提で、CSRF なしのログアウトを試す
curl -i -b "$CJ" -X POST http://localhost:3000/api/auth/logout
# -> HTTP/1.1 403 Forbidden

# 2) 安全な GET で CSRF トークンを取得（ヘッダから取り出す）
csrf=$(curl -sS -D - -o /dev/null -b "$CJ" http://localhost:3000/api/health | awk '/^x-csrf-token:/ {print $2}' | tr -d '\r')
echo "csrf=$csrf"

# 3) ヘッダに X-CSRF-Token を付けてログアウト
curl -i -b "$CJ" -H "X-CSRF-Token: $csrf" -X POST http://localhost:3000/api/auth/logout
# -> HTTP/1.1 204 No Content
```

## 7) メール検証（MailHog）
register 成功時、検証メールが MailHog に届きます。

- UI で確認する場合: http://localhost:8025 を開き、最新の「Verify your email」を開いて検証リンクをクリックします。
- CLI で検証 API を叩く場合（quoted-printable の折り返しに対応）:

```bash
# 最新の検証メール本文から token を抽出 → API で検証
# jq / perl が必要です。
tok=$(curl -fsS http://localhost:8025/api/v2/messages \
  | jq -r '.items | map(select(.Content.Headers.Subject[0] | contains("Verify your email"))) | sort_by(.Created) | last | .Content.Body' \
  | perl -0777 -pe 's/=\r?\n//g; s/=3D/=/g; s/.*token=([A-Za-z0-9]+).*/$1/s')
curl -sS -H 'Accept: application/json' "http://localhost:3000/api/auth/verify-email?token=$tok" | jq .
```

期待される応答:

```json
{ "ok": true }
```
## 8) パスワードリセット（forgot → reset → login）

- リセットリンクを要求（登録済みの email か username を指定）
```bash
curl -sS -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"emailOrUsername":"YOUR_EMAIL_OR_USERNAME"}' \
  http://localhost:3000/api/auth/forgot-password | jq .
```

## 9) オプション: 認証 E2E スクリプト
One-shot end-to-end test that runs: register → verify (MailHog) → forgot → reset → login.

```bash
cd backend
```
npx tsx scripts/auth-e2e.ts
```

期待される出力末尾:

```
AUTH E2E OK
```
## 10) Socket.IO 認証（JWT/Cookie によるハンドシェイク）

バックエンドは WS ハンドシェイク時に Cookie の `access_token` を検証します。未認証の接続は拒否され、クライアントは `connect_error: Unauthorized` を受け取ります。

Node スクリプトで、未認証→失敗、認証→成功の流れを検証できます。

```bash
cd backend
npx tsx scripts/ws-auth-test.ts
```

期待される出力（抜粋）:

```
[unauth] connect_error as expected: Unauthorized
[auth] connected
[server->client] hello { message: 'connected', userId: ... }
[server->client] pong
WS AUTH TEST OK
```

ブラウザから接続する場合（開発時）は、まず HTTP 側でログインして Cookie を取得し、`io("http://localhost:3000", { path: '/ws', withCredentials: true })` で接続してください（Vite プロキシで /ws → 3000 に中継されます）。

## 11) オプション: WebSocket スモークテスト

hello と ping/pong の往復を確認します。

```bash
cd backend
```
npx tsx scripts/ws-test.ts
```

期待される出力（抜粋）:

```
[server->client] hello { message: 'connected' }
[server->client] pong
OK: hello + ping/pong verified
```
## トラブルシューティング

- Docker が起動していない / health が "starting" で止まる
  - Docker Desktop を起動し、`docker compose logs -f postgres` で詳細を確認
- ポート競合（3000 / 5432 / 8025）
  - 使用中のプロセス確認: `lsof -nP -iTCP:3000 -sTCP:LISTEN`
  - 既存を停止 or ポートを変更（docker-compose.yml と .env の `DATABASE_URL` を合わせる）
- `DATABASE_URL` が無効
  - DB ユーザー/パスワード/DB が存在するか確認し、`npm run db:migrate` を再実行
- MailHog にメールが来ない
  - http://localhost:8025 を開き、バックエンドログで送信エラーがないか確認
  - `SMTP_HOST` / `SMTP_PORT` が MailHog を指しているか確認
- quoted-printable の改行でトークンが折り返される
  - 上記 CLI 例では `=\n` と `=3D` を正規化して抽出しています
- Cookie / CORS
  - `CORS_ORIGIN=http://localhost:5173` を維持し、ブラウザからは `credentials: true` で送信
## クリーンアップ

- サービス停止

```bash
docker compose down
```
- ボリュームも削除（DB データ消去・注意）

```bash
docker compose down -v
```
# Backend verification guide

This document explains how to verify the backend end-to-end on macOS using Docker (PostgreSQL + MailHog), .env setup, DB migrations, server startup, and API checks including email verification and password reset. Optional WebSocket checks are included.

## Prerequisites

- macOS with:
  - Docker Desktop installed and running
  - Node.js and npm available (nodebrew or similar)
- Open ports: 3000 (backend), 5432 (Postgres), 8025 (MailHog UI), 1025 (MailHog SMTP)
- Repo cloned and terminal at repository root

## 1) Start infrastructure (Docker Compose)

- Start Postgres and MailHog:

```bash
docker compose up -d
```

- Check Postgres health (optional):

```bash
docker inspect -f '{{.State.Health.Status}}' matcha-postgres
```

- MailHog web UI: http://localhost:8025

## 2) Prepare backend environment

- Copy and edit `.env` in `backend/` as needed (example values shown):

```dotenv
PORT=3000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_me
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/matcha
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM="Matcha <no-reply@matcha.local>"
```

## 3) Install deps and migrate DB

- Install (first time only):

```bash
cd backend
npm install
```

- Apply migrations:

```bash
npm run db:migrate
```

## 4) Start backend

```bash
npm run dev
```

- Health check in another terminal:

```bash
curl -sS http://localhost:3000/api/health | jq .
```

## 5) Minimal auth flow (register → me)

- Register a unique user and store cookies:

```bash
cd .. # repo root if needed
CJ=tmp/matcha_cookies.txt
suffix=$(date +%s)
email="tester_${suffix}@example.com"
uname="tester_${suffix}"
printf '{"email":"%s","username":"%s","password":"password123"}' "$email" "$uname" > tmp/reg.json
curl -i -c "$CJ" \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  --data @tmp/reg.json \
  http://localhost:3000/api/auth/register
```

- Call /me with the cookie:

```bash
curl -sS -b "$CJ" -H 'Accept: application/json' http://localhost:3000/api/auth/me | jq .
```

## 6) Email verification (via MailHog)

When you register, the backend sends a verification email to MailHog. You can:

- Open MailHog UI at http://localhost:8025 and click the latest "Verify your email" message, then click the verify link.

Or via CLI:

```bash
# Extract the latest verify token from MailHog and call the API
tok=$(curl -fsS http://localhost:8025/api/v2/messages \
  | jq -r '.items | map(select(.Content.Headers.Subject[0] | contains("Verify your email"))) | sort_by(.Created) | last | .Content.Body' \
  | perl -0777 -pe 's/=\r?\n//g; s/=3D/=/g; s/.*token=([A-Za-z0-9]+).*/$1/s')
curl -sS -H 'Accept: application/json' "http://localhost:3000/api/auth/verify-email?token=$tok" | jq .
```

Expected:

```json
{ "ok": true }
```

## 7) Forgot/reset password

- Request reset link (use the registered email or username):

```bash
curl -sS -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"emailOrUsername":"YOUR_EMAIL_OR_USERNAME"}' \
  http://localhost:3000/api/auth/forgot-password | jq .
```

- Extract reset token from MailHog and call reset API:

```bash
tok=$(curl -fsS http://localhost:8025/api/v2/messages \
  | jq -r '.items | map(select(.Content.Headers.Subject[0] | contains("Reset your password"))) | sort_by(.Created) | last | .Content.Body' \
  | perl -0777 -pe 's/=\r?\n//g; s/=3D/=/g; s/.*token=([A-Za-z0-9]+).*/$1/s')
curl -sS -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -X POST "http://localhost:3000/api/auth/reset-password?token=$tok" \
  -d '{"newPassword":"NewPass!2345"}' | jq .
```

- Login with the new password:

```bash
curl -sS -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"emailOrUsername":"YOUR_EMAIL_OR_USERNAME","password":"NewPass!2345"}' \
  http://localhost:3000/api/auth/login | jq .
```

## 8) Optional: E2E auth script

One-shot end-to-end test that runs: register → verify (MailHog) → forgot → reset → login.

```bash
cd backend
npx tsx scripts/auth-e2e.ts
```

Expected output ends with:

```
AUTH E2E OK
```

## 9) Optional: WebSocket handshake smoke test

Checks hello and ping/pong round-trip.

```bash
cd backend
npx tsx scripts/ws-test.ts
```

Expected output includes:

```
[server->client] hello { message: 'connected' }
[server->client] pong
OK: hello + ping/pong verified
```

## Troubleshooting

- Docker not running / health stuck in "starting": ensure Docker Desktop is started; `docker compose logs -f postgres` for details.
- Port conflicts (3000/5432/8025):
  - Find: `lsof -nP -iTCP:3000 -sTCP:LISTEN`
  - Stop or change ports (edit docker-compose.yml and .env DATABASE_URL).
- DATABASE_URL invalid: verify user/password/db exist; re-run `npm run db:migrate`.
- No emails in MailHog: open http://localhost:8025; check backend logs for mail send; ensure SMTP_HOST/PORT point to MailHog.
- Quoted-printable line breaks: token lines may wrap with `=\n` and `=3D`; the provided CLI snippets normalize this.
- Cookies/CORS: keep `CORS_ORIGIN=http://localhost:5173` and send cookies from browsers with `credentials: true`.

## Error response format (unified)

All API errors use a unified JSON structure:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid credentials",
    "details": {}
  }
}
```

- code: machine-readable error code
- message: human-readable short description
- details: optional extras (e.g., validation issues from zod)

Common codes:

- VALIDATION_ERROR: invalid request (zod failure)
- UNAUTHORIZED: no/invalid session
- CSRF_INVALID: CSRF token mismatch/missing
- USER_ALREADY_EXISTS: email/username conflict
- INVALID_TOKEN / TOKEN_EXPIRED / TOKEN_ALREADY_USED: verify/reset tokens

## Cleanup

- Stop services:

```bash
docker compose down
```

- Remove volumes/data as well (danger: clears DB):

```bash
docker compose down -v
```
