# フロントエンド実装者向け API 利用ガイド

このドキュメントは、フロントエンドからバックエンド API を安全かつ確実に呼び出すための手順とベストプラクティスをまとめたものです。Swagger UI の場所、認証（Cookie）、CSRF 取り扱い、画像アップロード、エラー形式、Socket.IO などをカバーします。

- API ドキュメント（Swagger UI）: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/openapi.json
- バックエンド起動手順: `docs/VERIFICATION.md` を参照

## 前提
- バックエンドは http://localhost:3000 で起動
- CORS_ORIGIN にフロントのオリジン（例: http://localhost:5173）が設定されていること
- フロントからの fetch/XHR は必ず `credentials: 'include'`（Cookie を送るため）

## 認証と CSRF の基本
バックエンドは Cookie-JWT を採用し、変更系リクエスト（POST/PUT/PATCH/DELETE）には CSRF（ダブルサブミット）を要求します。

- ログイン/登録成功時、HttpOnly Cookie `access_token` が付与されます。
- ログイン済みで安全なメソッド（GET/HEAD/OPTIONS）を叩くと、`csrf_token` Cookie が発行され、同時にレスポンスヘッダ `X-CSRF-Token` にも値が乗ります。
- 変更系リクエストは `X-CSRF-Token` ヘッダに同じ値を付ける必要があります（Cookie とヘッダの一致を検証）。

実装のコツ:
- 変更系 API の前に、軽い GET（例: `/api/health`）を呼び、レスポンスヘッダ `X-CSRF-Token` を取得してから本命のリクエストを送る。
- アプリ側で CSRF トークンを短期間キャッシュし、変更系 API 前に更新する運用が安全です。

### フロント側の fetch ヘルパ例（TypeScript）
```ts
const BASE = 'http://localhost:3000';

async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${BASE}/api/health`, { credentials: 'include' });
  const tok = res.headers.get('x-csrf-token');
  if (!tok) throw new Error('Missing CSRF token');
  return tok;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw await res.json().catch(() => new Error('GET failed'));
  return res.json();
}

export async function apiMutate<T>(path: string, init: RequestInit = {}): Promise<T> {
  const csrf = await getCsrfToken();
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'X-CSRF-Token': csrf,
      Accept: 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  });
  if (!res.ok) throw await res.json().catch(() => new Error('Mutation failed'));
  return res.json().catch(() => ({} as any));
}
```

### 認証フロー例
```ts
// register
await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ email, username, password }),
});

// me
const me = await apiGet<{ user: { id: number; email: string; username: string }; avatar: any }>(
  '/api/auth/me'
);
```

## プロフィール API
- GET `/api/me/profile`: 自分のプロフィール
- PATCH `/api/me/profile`: 自分のプロフィール更新（CSRF 必須）

```ts
// 更新例
await apiMutate('/api/me/profile', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bio: 'Hello', gender: 'other' }),
});
```

## 画像アップロード（avatar / gallery）
- POST `/api/me/avatar`: multipart/form-data（フィールド名 `file`）
- POST `/api/me/photos`: multipart/form-data（フィールド名 `file`）
- GET `/api/me/photos`: 一覧（`avatar` と `gallery`）
- DELETE `/api/me/photos/:id`: 写真削除（CSRF 必須）

注意:
- 合計5枚（avatar を含む）まで
- 並べ替えは現在サポートされていません（`PATCH /api/me/photos/reorder` は 410 Gone）

```ts
// アップロード例（avatar）
const fd = new FormData();
fd.append('file', file); // File from input
await apiMutate('/api/me/avatar', { method: 'POST', body: fd });

// 一覧
const photos = await apiGet<{ avatar: any; gallery: any[] }>('/api/me/photos');

// 削除
await apiMutate(`/api/me/photos/${photoId}`, { method: 'DELETE' });
```

## エラー応答形式
すべてのエラーは以下の形式で返ります。
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid credentials",
    "details": {}
  }
}
```
- code: 機械可読のコード
- message: 簡潔な説明
- details: 任意の追加情報（zodのバリデーション詳細など）

## Socket.IO（認証付き）
- パス: `/ws`
- クッキー `access_token` を用いてハンドシェイク認証

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/ws',
  withCredentials: true,
});

socket.on('connect', () => console.log('connected'));
socket.on('hello', (p) => console.log('hello', p));
socket.on('connect_error', (e) => console.log('connect_error', e.message));
```

## Swagger UI の活用
- http://localhost:3000/api/docs
- Cookie/CSRF 前提のため Try it Out はデフォルト無効です。
  - 仕様の確認・型の共有用途に活用し、実行はアプリまたは `docs/api.http`/curl 等を推奨

## Postman/Insomnia/VS Code REST Client での確認
- Cookie を有効（Cookie Jar 使用）し、まず GET `/api/health` を叩いて `X-CSRF-Token` を取得
- 変更系リクエストに `X-CSRF-Token` を付与
- VS Code REST Client 用のサンプルは `docs/api.http` を参照

## CORS/フェッチの注意
- fetch には必ず `credentials: 'include'` を指定
- サーバ側は `CORS_ORIGIN` にフロントのオリジンが含まれている必要があります
- 画像 URL（`/uploads/...`）はそのまま `<img src>` で利用可能

---
必要があれば、OpenAPI から型定義やクライアント SDK を生成するワークフローも追加できます（将来対応）。
