const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediPulse Hospital User Management API v1',
      version: '1.0.0',
      description: 'User Management System Backend API v1 providing Authentication (Login, Logout, Refresh, Google OAuth 2.0), User Profile retrieval by token, User CRUD (SuperAdmin manages all users; Admin manages only users created by them), and Health Check.',
      contact: {
        name: 'MediPulse Hospital IT Support',
        email: 'support@medipulse.hospital'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Express Development Server'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints for staff login, Google OAuth 2.0, token refresh, and logout'
      },
      {
        name: 'User Profile',
        description: 'Endpoint for fetching details of logged-in user via token'
      },
      {
        name: 'User Management',
        description: 'CRUD operations for staff accounts (SuperAdmin sees all users; Admin manages only users created by them)'
      },
      {
        name: 'Health Check',
        description: 'System operational status checks'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT Access Token stored securely in httpOnly cookie'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Authorization header Bearer token (Format: `Bearer <token>`)'
        }
      }
    },
    paths: {
      '/api/v1/health': {
        get: {
          summary: 'Check API server health status',
          tags: ['Health Check'],
          responses: {
            200: {
              description: 'Server is healthy and responsive',
              content: {
                'application/json': {
                  example: {
                    status: 'ok',
                    message: 'Hospital User Management API v1 is running'
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/auth/login': {
        post: {
          summary: 'Authenticate superadmin or staff with email and password',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: {
                  email: 'superadmin@hospital.com',
                  password: 'SuperAdmin123!'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Login successful',
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    user: {
                      _id: '65c8f1e29a34b2811a45d0f1',
                      name: 'Chief Medical Director',
                      email: 'superadmin@hospital.com',
                      role: 'superadmin',
                      designation: 'Administrator',
                      department: 'Executive Board',
                      phone: '+1 (555) 000-0001',
                      authProvider: 'local',
                      isActive: true
                    }
                  }
                }
              }
            },
            401: {
              description: 'Invalid email or password',
              content: {
                'application/json': {
                  example: {
                    success: false,
                    message: 'Invalid email or password'
                  }
                }
              }
            },
            403: {
              description: 'Account deactivated',
              content: {
                'application/json': {
                  example: {
                    success: false,
                    message: 'Your account has been deactivated.'
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/auth/google': {
        get: {
          summary: 'Trigger Google OAuth 2.0 authentication flow',
          tags: ['Authentication'],
          responses: {
            302: { description: 'Redirects to Google OAuth 2.0 consent screen' }
          }
        }
      },
      '/api/v1/auth/google/callback': {
        get: {
          summary: 'Google OAuth 2.0 callback endpoint',
          tags: ['Authentication'],
          responses: {
            200: {
              description: 'Google authentication successful',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Google authentication successful',
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                  }
                }
              }
            },
            302: { description: 'Redirects to frontend OAuth callback route' }
          }
        }
      },
      '/api/v1/auth/refresh': {
        post: {
          summary: 'Refresh access token using httpOnly refresh token cookie',
          tags: ['Authentication'],
          responses: {
            200: {
              description: 'Token refreshed successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Token refreshed successfully',
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/auth/logout': {
        post: {
          summary: 'Sign out user and clear auth cookies',
          tags: ['Authentication'],
          responses: {
            200: {
              description: 'Logged out successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Logged out successfully'
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/users/me': {
        get: {
          summary: 'Get logged-in user details by token',
          tags: ['User Profile'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            200: {
              description: 'User profile retrieved successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    user: {
                      _id: '65c8f1e29a34b2811a45d0f1',
                      name: 'Chief Medical Director',
                      email: 'superadmin@hospital.com',
                      role: 'superadmin'
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/users': {
        post: {
          summary: 'Create a new user (SuperAdmin can create any role; Admin creates users owned by them)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: {
                  name: 'Dr. Sarah Jenkins',
                  email: 'doctor@hospital.com',
                  password: 'Doctor123!',
                  role: 'user',
                  designation: 'Doctor',
                  department: 'Cardiology',
                  phone: '+1 (555) 000-0003'
                }
              }
            }
          },
          responses: {
            201: {
              description: 'User created successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'User created successfully',
                    user: {
                      _id: '65c8f1e29a34b2811a45d0f2',
                      name: 'Dr. Sarah Jenkins',
                      email: 'doctor@hospital.com',
                      role: 'user',
                      createdBy: '65c8f1e29a34b2811a45d0f1'
                    }
                  }
                }
              }
            },
            400: { description: 'Validation error or email exists' },
            403: { description: 'Permission denied' }
          }
        },
        get: {
          summary: 'List users (SuperAdmin sees ALL users; Admin sees ONLY users created by them)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search term for name, email, department, designation' },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 }, description: 'Page limit' }
          ],
          responses: {
            200: {
              description: 'List of accessible users',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    count: 1,
                    users: [
                      {
                        _id: '65c8f1e29a34b2811a45d0f2',
                        name: 'Dr. Sarah Jenkins',
                        email: 'doctor@hospital.com',
                        role: 'user',
                        createdBy: {
                          _id: '65c8f1e29a34b2811a45d0f1',
                          name: 'Chief Medical Director',
                          email: 'superadmin@hospital.com'
                        }
                      }
                    ]
                  }
                }
              }
            },
            403: { description: 'Forbidden' }
          }
        }
      },
      '/api/v1/users/{id}': {
        get: {
          summary: 'Get user details by ID (Admin can only view users created by them)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'User profile retrieved' },
            403: { description: 'Permission denied: Not created by this Admin' },
            404: { description: 'User not found' }
          }
        },
        patch: {
          summary: 'Update user details (Admin can only update users created by them)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            content: {
              'application/json': {
                example: {
                  name: 'Dr. Sarah Jenkins',
                  designation: 'Senior Cardiologist'
                }
              }
            }
          },
          responses: {
            200: { description: 'User updated successfully' },
            403: { description: 'Permission denied: Not created by this Admin' },
            404: { description: 'User not found' }
          }
        },
        delete: {
          summary: 'Delete user account (Admin can only delete users created by them)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'User deleted successfully' },
            403: { description: 'Permission denied: Not created by this Admin' },
            404: { description: 'User not found' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/config/swagger.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
