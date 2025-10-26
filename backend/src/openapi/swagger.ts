import swaggerUi from 'swagger-ui-express';
import { buildOpenAPIDocument } from './spec.js';

export function mountSwagger(app: any) {
  const doc = buildOpenAPIDocument();

  // Serve JSON spec
  app.get('/api/openapi.json', (_req: any, res: any) => res.json(doc));

  // Serve Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(doc, {
      swaggerOptions: {
        displayRequestDuration: true,
        tryItOutEnabled: false, // Cookie/CSRF 前提のためデフォルトは無効
      },
      customSiteTitle: 'Matcha API Docs',
    }),
  );
}
