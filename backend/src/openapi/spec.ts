export function buildOpenAPIDocument() {
  const doc: any = {
    openapi: '3.1.0',
    info: {
      title: 'Matcha Backend API',
      version: '0.1.0',
      description: 'Cookie-JWT + CSRF (double-submit). Mutating endpoints require X-CSRF-Token.',
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token', description: 'JWT in HttpOnly cookie' },
      },
      parameters: {
        CsrfHeader: {
          name: 'X-CSRF-Token', in: 'header', required: true,
          description: 'Double-submit CSRF token (must match csrf_token cookie)',
          schema: { type: 'string' },
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {},
              },
              required: ['code', 'message'],
            },
          },
          required: ['error'],
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            uptime: { type: 'number' },
            timestamp: { type: 'string' },
          },
          required: ['status', 'uptime', 'timestamp'],
        },
        RegisterDto: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 30 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
          required: ['email', 'username', 'password'],
        },
        LoginDto: {
          type: 'object',
          properties: {
            emailOrUsername: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
          required: ['emailOrUsername', 'password'],
        },
        MeResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string', format: 'email' },
                username: { type: 'string' },
              },
              required: ['id', 'email', 'username'],
            },
            avatar: {
              oneOf: [
                {
                  type: 'object',
                  properties: { url: { type: 'string' }, thumbUrl: { type: 'string' } },
                  required: ['url', 'thumbUrl'],
                },
                { type: 'null' },
              ],
            },
          },
          required: ['user'],
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['system'], summary: 'Health check',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['auth'],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterDto' } } } },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } } } },
            409: { description: 'Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['auth'],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginDto' } } } },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['auth'], security: [{ cookieAuth: [] }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['auth'], security: [{ cookieAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
          responses: {
            204: { description: 'No Content' },
            403: { description: 'CSRF Invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
    },
  };
  return doc;
}
