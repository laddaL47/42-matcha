# 42-matcha

Web Matcha（出会い系サイト）課題の実装リポジトリです。要件の概要と実装計画は以下を参照してください。

- 要約: PDF「Web Matcha」の日本語要約はチャット履歴参照
- 実装計画: `docs/IMPLEMENTATION_PLAN.md`
- 検証手順: `docs/VERIFICATION.md`

## すぐ見たい人向け

- フロント: React + Vite（提案）
- サーバ: Node.js + Express + Socket.IO、DB は PostgreSQL（手書き SQL: node-postgres）
- セキュリティ: パスワードハッシュ、XSS/SQLi/アップロード対策、.env 秘匿
	- CSRF: ログイン後の変更系 API は二重送信トークン（X-CSRF-Token ヘッダ）で保護。詳しくは `docs/VERIFICATION.md` の CSRF 節。
- リアルタイム: チャット/通知 ≤10 秒、全ページで新着に気付ける UI

詳細は `docs/IMPLEMENTATION_PLAN.md` をご覧ください。
