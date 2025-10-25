# 42-matcha

Web Matcha（出会い系サイト）課題の実装リポジトリです。要件の概要と実装計画は以下を参照してください。

- 要約: PDF「Web Matcha」の日本語要約はチャット履歴参照
- 実装計画: `docs/IMPLEMENTATION_PLAN.md`

## すぐ見たい人向け

- フロント: React + Vite（提案）
- サーバ: Node.js + Express + Socket.IO、DB は PostgreSQL（手書き SQL: node-postgres）
- セキュリティ: パスワードハッシュ、XSS/SQLi/アップロード対策、.env 秘匿
- リアルタイム: チャット/通知 ≤10 秒、全ページで新着に気付ける UI

詳細は `docs/IMPLEMENTATION_PLAN.md` をご覧ください。
