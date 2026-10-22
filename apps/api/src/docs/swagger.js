import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '../config/env.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'PostPilot API Documentation',
    version: '1.0.0',
    description: 'Enterprise Multi-Brand, Multi-Platform Social Media Post Automation System',
    contact: {
      name: 'PostPilot Engineering',
      url: 'https://postpilot.app',
    },
  },
  servers: [
    {
      url: env.API_URL,
      description: `${env.NODE_ENV} environment`,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT Access Token obtained from /api/v1/auth/login',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for automated n8n workflow integration',
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.schema.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
