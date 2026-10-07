const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediPulse Hospital User Management API',
      version: '1.0.0',
      description: 'Full-stack User Management System for Hospital Staff (SuperAdmin, Admin, Doctor, Compounder, Pharmacist, Nurse, Lab Technician) with Google OAuth 2.0 & JWT Authentication, Winston Daily Rotating Logging, and Role Hierarchy Security.',
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
        description: 'Endpoints for staff signup, login, Google OAuth 2.0, token refresh, and logout'
      },
      {
        name: 'User Profile',
        description: 'Endpoints for viewing and updating logged-in staff profile details and changing passwords'
      },
      {
        name: 'Admin Management',
        description: 'Role hierarchy management for Admin / SuperAdmin to view, update, and manage staff accounts'
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
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65c8f1e29a34b2811a45d0f1' },
            name: { type: 'string', example: 'Dr. Sarah Jenkins' },
            email: { type: 'string', example: 'doctor@hospital.com' },
            role: { type: 'string', enum: ['user', 'admin', 'superadmin'], example: 'user' },
            designation: {
              type: 'string',
              enum: ['Doctor', 'Compounder', 'Pharmacist', 'Nurse', 'Lab Technician', 'Administrator', 'Staff', 'Other'],
              example: 'Doctor'
            },
            department: { type: 'string', example: 'Cardiology' },
            phone: { type: 'string', example: '+1 (555) 000-0003' },
            avatar: { type: 'string', example: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150' },
            authProvider: { type: 'string', enum: ['local', 'google'], example: 'local' },
            isActive: { type: 'boolean', example: true },
            lastLogin: { type: 'string', format: 'date-time', nullable: true, example: '2026-10-07T22:45:00.000Z' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-10-07T22:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-10-07T22:30:00.000Z' }
          }
        },
        UserSignup: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Dr. Sarah Jenkins' },
            email: { type: 'string', format: 'email', example: 'doctor@hospital.com' },
            password: { type: 'string', format: 'password', example: 'Doctor123!' },
            designation: { type: 'string', example: 'Doctor' },
            department: { type: 'string', example: 'Cardiology' },
            phone: { type: 'string', example: '+1 (555) 000-0003' }
          }
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@hospital.com' },
            password: { type: 'string', format: 'password', example: 'Admin123!' }
          }
        },
        UserUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Dr. Sarah Jenkins' },
            designation: { type: 'string', example: 'Doctor' },
            department: { type: 'string', example: 'Pediatrics' },
            phone: { type: 'string', example: '+1 (555) 000-9999' },
            avatar: { type: 'string', example: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d' },
            currentPassword: { type: 'string', example: 'Doctor123!' },
            newPassword: { type: 'string', example: 'NewDoctor456!' }
          }
        },
        AdminUserUpdate: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['user', 'admin', 'superadmin'], example: 'admin' },
            designation: { type: 'string', example: 'Administrator' },
            department: { type: 'string', example: 'Management' },
            isActive: { type: 'boolean', example: true }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Authentication successful' },
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        PaginatedUsersResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            count: { type: 'integer', example: 10 },
            totalUsers: { type: 'integer', example: 45 },
            totalPages: { type: 'integer', example: 5 },
            currentPage: { type: 'integer', example: 1 },
            users: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' }
            }
          }
        },
        PaginatedLogsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            count: { type: 'integer', example: 10 },
            totalLogs: { type: 'integer', example: 120 },
            totalPages: { type: 'integer', example: 12 },
            currentPage: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            date: { type: 'string', example: '2026-10-07' },
            filtersApplied: {
              type: 'object',
              properties: {
                level: { type: 'string', example: 'all' },
                search: { type: 'string', nullable: true, example: null }
              }
            },
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  level: { type: 'string', example: 'info' },
                  message: { type: 'string', example: '[Auth Controller] User logged in successfully...' },
                  timestamp: { type: 'string', example: '2026-10-07 22:45:00' }
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error description message' },
            stack: { type: 'string', nullable: true, example: null }
          }
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Please provide a valid email address' }
                }
              }
            }
          }
        },
        HealthCheckResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            message: { type: 'string', example: 'Hospital User Management API is running' }
          }
        }
      }
    },
    paths: {
      '/api/admin/logs': {
        get: {
          summary: 'Retrieve system application logs in JSON format with pagination (Default 10 per page)',
          tags: ['Admin Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 }, description: 'Number of logs per page (Default 10, user configurable)' },
            { in: 'query', name: 'pageSize', schema: { type: 'integer' }, description: 'Alias for limit' },
            { in: 'query', name: 'level', schema: { type: 'string', enum: ['all', 'info', 'warn', 'error', 'debug'] }, description: 'Log level filter' },
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Text search in message or timestamp' },
            { in: 'query', name: 'date', schema: { type: 'string' }, description: 'Log date YYYY-MM-DD (Default today)' }
          ],
          responses: {
            200: {
              description: 'Paginated JSON log entries',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaginatedLogsResponse' }
                }
              }
            },
            403: { description: 'Forbidden' }
          }
        }
      },
      '/api/health': {
        get: {
          summary: 'Check API server health status',
          tags: ['Health Check'],
          responses: {
            200: {
              description: 'Server is healthy and responsive',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthCheckResponse' }
                }
              }
            }
          }
        }
      },
      '/api/auth/signup': {
        post: {
          summary: 'Register new hospital staff member',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserSignup' }
              }
            }
          },
          responses: {
            201: {
              description: 'User registered successfully with httpOnly cookies set',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            400: {
              description: 'Validation failure or email already exists',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'Authenticate staff member with email and password',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserLogin' }
              }
            }
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            401: {
              description: 'Invalid email or password',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            403: {
              description: 'Account deactivated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            429: {
              description: 'Too many authentication attempts',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/auth/google': {
        get: {
          summary: 'Trigger Google OAuth 2.0 authentication flow',
          tags: ['Authentication'],
          responses: {
            302: { description: 'Redirects to Google OAuth 2.0 consent screen' }
          }
        }
      },
      '/api/auth/google/callback': {
        get: {
          summary: 'Google OAuth 2.0 callback endpoint',
          tags: ['Authentication'],
          responses: {
            200: {
              description: 'Google authentication successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            302: { description: 'Redirects to frontend OAuth callback route' },
            401: { description: 'Google authentication failed' }
          }
        }
      },
      '/api/auth/refresh': {
        post: {
          summary: 'Refresh access token using httpOnly refresh token cookie',
          tags: ['Authentication'],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Token refreshed successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            401: {
              description: 'Invalid or expired refresh token',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/auth/logout': {
        post: {
          summary: 'Sign out user and clear auth cookies',
          tags: ['Authentication'],
          responses: {
            200: {
              description: 'Logged out successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' }
                }
              }
            }
          }
        }
      },
      '/api/users/me': {
        get: {
          summary: 'Get currently authenticated user profile',
          tags: ['User Profile'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            200: {
              description: 'User profile retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      user: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized' }
          }
        },
        put: {
          summary: 'Update profile or change password',
          tags: ['User Profile'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserUpdate' }
              }
            }
          },
          responses: {
            200: {
              description: 'Profile updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            400: {
              description: 'Validation error or incorrect current password',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            },
            401: { description: 'Unauthorized' }
          }
        }
      },
      '/api/admin/users': {
        get: {
          summary: 'List hospital staff with pagination and multi-field filters (Admin / SuperAdmin)',
          tags: ['Admin Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Page number for pagination' },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 }, description: 'Number of users per page' },
            { in: 'query', name: 'name', schema: { type: 'string' }, description: 'Filter by user name (partial match regex)' },
            { in: 'query', name: 'role', schema: { type: 'string', enum: ['user', 'admin', 'superadmin'] }, description: 'Filter by staff role' },
            { in: 'query', name: 'designation', schema: { type: 'string' }, description: 'Filter by hospital designation (Doctor, Pharmacist, etc.)' },
            { in: 'query', name: 'department', schema: { type: 'string' }, description: 'Filter by hospital department' },
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'General search across name, email, department, designation' }
          ],
          responses: {
            200: {
              description: 'Paginated list of staff members with applied filters',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaginatedUsersResponse' }
                }
              }
            },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden - Admin / SuperAdmin role required' }
          }
        }
      },
      '/api/admin/users/{id}': {
        patch: {
          summary: 'Update staff role, designation, department, or active status (Admin / SuperAdmin)',
          tags: ['Admin Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'User Mongo ObjectId' }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminUserUpdate' }
              }
            }
          },
          responses: {
            200: {
              description: 'User updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            400: { description: 'Self-update restriction violation' },
            403: { description: 'Role hierarchy permission denied' },
            404: { description: 'User not found' }
          }
        },
        delete: {
          summary: 'Delete staff member account (Admin / SuperAdmin)',
          tags: ['Admin Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'User Mongo ObjectId' }
          ],
          responses: {
            200: {
              description: 'User account deleted successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' }
                }
              }
            },
            400: { description: 'Self-deletion restriction violation' },
            403: { description: 'Permission denied by hierarchy rules' },
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

