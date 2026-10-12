const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediPulse Hospital User & Attendance Management API v1',
      version: '1.0.0',
      description: 'User Management System Backend API v1 featuring 8 Department Admins, HR Hiring & Cross-Department Authority, Password Reset APIs, and 9-Hour Work Policy Punch-In/Punch-Out Attendance System.',
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
        description: 'CRUD operations & Password Reset for staff (SuperAdmin can reset password for any user; HR Admin cross-dept; Dept Admin for their department/self)'
      },
      {
        name: 'Attendance Management',
        description: 'Dedicated Punch-In and Punch-Out APIs with 9-Hour Work Policy tracking (Visible to Superadmin, HR Admin, & HR Supervisors)'
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
          summary: 'Authenticate superadmin, HR admin, department admin, supervisor, or staff',
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
                      department: 'executive'
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/users/{id}/reset-password': {
        post: {
          summary: 'Reset Password (SuperAdmin resets any user; HR Admin cross-dept; Dept Admin resets their department staff or self)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: {
                  newPassword: 'NewPassword123!'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Password reset successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Password reset successfully for user doctor@hospital.com'
                  }
                }
              }
            },
            403: { description: 'Permission denied' },
            404: { description: 'User not found' }
          }
        }
      },
      '/api/v1/attendance/punch-in': {
        post: {
          summary: 'Punch-In / Start 9-hour work shift',
          tags: ['Attendance Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                example: {
                  workMode: 'on_site',
                  notes: 'Morning shift arrival'
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Punched in successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Punched in successfully. 9-hour shift started.',
                    attendance: {
                      _id: '65c8f1e29a34b2811a45d0a1',
                      date: '2026-10-08',
                      punchIn: '2026-10-08T09:00:00.000Z',
                      status: 'punched_in',
                      shiftRequiredHours: 9
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/attendance/punch-out': {
        post: {
          summary: 'Punch-Out / Calculate 9-hour shift work duration and status',
          tags: ['Attendance Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            200: {
              description: 'Punched out successfully',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    message: 'Punched out successfully. 9-hour shift completed (9.2 hrs).',
                    attendance: {
                      _id: '65c8f1e29a34b2811a45d0a1',
                      punchIn: '2026-10-08T09:00:00.000Z',
                      punchOut: '2026-10-08T18:12:00.000Z',
                      totalWorkHours: 9.2,
                      isShiftCompleted: true,
                      status: 'present'
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/attendance': {
        get: {
          summary: 'Get attendance records (Visible to Superadmin, HR Admin, HR Supervisors & Dept Admins)',
          tags: ['Attendance Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'department', schema: { type: 'string' }, description: 'Filter by department (hr, pharmacy, technical, security, support, legal, accounts)' },
            { in: 'query', name: 'date', schema: { type: 'string' }, description: 'Filter by date (YYYY-MM-DD)' },
            { in: 'query', name: 'status', schema: { type: 'string' }, description: 'Filter by status (present, late, half_day, short_hours, punched_in)' }
          ],
          responses: {
            200: {
              description: 'Attendance list',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    count: 1,
                    data: [
                      {
                        _id: '65c8f1e29a34b2811a45d0a1',
                        user: { name: 'Michael Chang', email: 'pharmacist@hospital.com', department: 'pharmacy' },
                        date: '2026-10-08',
                        punchIn: '2026-10-08T09:00:00.000Z',
                        punchOut: '2026-10-08T18:00:00.000Z',
                        totalWorkHours: 9,
                        isShiftCompleted: true,
                        status: 'present'
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/users': {
        post: {
          summary: 'Create user (HR Admin & HR Supervisor can create users under ANY department admin; Dept Admin creates for their department)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                example: {
                  name: 'Michael Chang',
                  email: 'pharmacist@hospital.com',
                  password: 'User123!',
                  role: 'user',
                  designation: 'Pharmacist',
                  department: 'pharmacy',
                  phone: '+1 (555) 000-0203'
                }
              }
            }
          },
          responses: {
            201: { description: 'User created successfully' }
          }
        },
        get: {
          summary: 'List users (HR Admin & HR Supervisor see all users across all departments; Dept Admin sees their department)',
          tags: ['User Management'],
          security: [{ cookieAuth: [] }, { bearerAuth: [] }],
          responses: {
            200: {
              description: 'Users list',
              content: {
                'application/json': {
                  example: {
                    success: true,
                    count: 1,
                    data: [
                      {
                        _id: '65c8f1e29a34b2811a45d0f2',
                        name: 'Michael Chang',
                        email: 'pharmacist@hospital.com',
                        role: 'user',
                        department: 'pharmacy'
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/config/swagger.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
