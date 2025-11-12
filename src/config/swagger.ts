import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scoreboard API',
      version: '1.0.0',
      description:
        'Real-time scoreboard API service with live updates. This API provides endpoints for user authentication, score management, and leaderboard queries with WebSocket support for real-time updates.',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/login or /auth/register',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'UNAUTHORIZED',
                },
                message: {
                  type: 'string',
                  example: 'Authentication token required',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'player1',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'player1@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'password123',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              example: 'player1',
            },
            password: {
              type: 'string',
              example: 'password123',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  example: 'user_123',
                },
                username: {
                  type: 'string',
                  example: 'player1',
                },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
            message: {
              type: 'string',
              example: 'User registered successfully',
            },
          },
        },
        ScoreUpdateRequest: {
          type: 'object',
          required: ['score_increment'],
          properties: {
            score_increment: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
              example: 10,
              description: 'Amount to increase the score by',
            },
            action_id: {
              type: 'string',
              example: 'action_12345',
              description: 'Optional identifier for the action that triggered the score update',
            },
            timestamp: {
              type: 'integer',
              example: 1699123456789,
              description: 'Optional timestamp to prevent replay attacks',
            },
          },
        },
        ScoreUpdateResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  example: 'user_123',
                },
                previous_score: {
                  type: 'integer',
                  example: 100,
                },
                new_score: {
                  type: 'integer',
                  example: 110,
                },
                rank: {
                  type: 'integer',
                  example: 5,
                },
                is_top_10: {
                  type: 'boolean',
                  example: true,
                },
              },
            },
            message: {
              type: 'string',
              example: 'Score updated successfully',
            },
          },
        },
        LeaderboardEntry: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              example: 'user_456',
            },
            username: {
              type: 'string',
              example: 'player1',
            },
            score: {
              type: 'integer',
              example: 500,
            },
            rank: {
              type: 'integer',
              example: 1,
            },
          },
        },
        LeaderboardResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                leaderboard: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/LeaderboardEntry',
                  },
                },
                userRank: {
                  type: 'integer',
                  nullable: true,
                  example: 5,
                  description: 'User rank if authenticated',
                },
                totalUsers: {
                  type: 'integer',
                  example: 1250,
                },
                lastUpdated: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T10:30:00Z',
                },
              },
            },
          },
        },
        UserScoreResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  example: 'user_123',
                },
                score: {
                  type: 'integer',
                  example: 150,
                },
                rank: {
                  type: 'integer',
                  example: 3,
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Scores',
        description: 'Score management endpoints',
      },
      {
        name: 'Leaderboard',
        description: 'Leaderboard query endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
