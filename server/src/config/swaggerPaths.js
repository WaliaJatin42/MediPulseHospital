/**
 * Comprehensive OpenAPI 3.0 Path Definitions for MediPulse Hospital Backend
 * Supplies complete requestBody schemas, parameter definitions, and pre-populated
 * runnable JSON examples so users can directly test POST/PUT/PATCH/GET in Swagger UI.
 */

const swaggerPaths = {
  // ==========================================
  // 1. AUTHENTICATION & MFA
  // ==========================================
  '/api/v1/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Sign in with email and password',
      description: 'Authenticates user, sets HTTP-only cookie, and returns JWT access token.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'superadmin@hospital.com' },
                password: { type: 'string', example: 'SuperAdmin123!' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Authentication successful. Returns accessToken and user profile.' },
        401: { description: 'Invalid credentials or account locked.' }
      }
    }
  },
  '/api/v1/auth/mfa/setup': {
    post: {
      tags: ['Authentication'],
      summary: 'Generate TOTP MFA secret and QR setup URI',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Returns base32 secret and otpauth URI for Google Authenticator' }
      }
    }
  },
  '/api/v1/auth/mfa/verify': {
    post: {
      tags: ['Authentication'],
      summary: 'Verify 6-digit TOTP code and enable MFA',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code'],
              properties: {
                code: { type: 'string', example: '123456', description: '6-digit TOTP code' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'MFA enabled. Returns 10 emergency recovery codes.' }
      }
    }
  },
  '/api/v1/auth/mfa/disable': {
    post: {
      tags: ['Authentication'],
      summary: 'Disable MFA protection',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password', 'code'],
              properties: {
                password: { type: 'string', example: 'Hospital123!' },
                code: { type: 'string', example: '123456' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'MFA disabled successfully.' }
      }
    }
  },
  '/api/v1/auth/sessions': {
    get: {
      tags: ['Authentication'],
      summary: 'List own active login sessions',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Array of active sessions with IP, user-agent, and last activity.' }
      }
    }
  },
  '/api/v1/auth/sessions/{id}': {
    delete: {
      tags: ['Authentication'],
      summary: 'Revoke specific session',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: '6ac68c5f03cc8b3163b3c0db' }
      ],
      responses: {
        200: { description: 'Session revoked.' }
      }
    }
  },
  '/api/v1/auth/logout-all': {
    post: {
      tags: ['Authentication'],
      summary: 'Revoke all sessions and force re-login across all devices',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'All sessions terminated.' }
      }
    }
  },
  '/api/v1/auth/unlock/{userId}': {
    post: {
      tags: ['Authentication'],
      summary: 'Unlock a locked account (SA, HRA)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' }, example: '6ac68c5f03cc8b3163b3c0db' }
      ],
      responses: {
        200: { description: 'Account unlocked successfully.' }
      }
    }
  },

  // ==========================================
  // 2. SUPERADMIN GOVERNANCE
  // ==========================================
  '/api/v1/superadmins': {
    post: {
      tags: ['Superadmin Governance'],
      summary: 'Create additional Superadmin (SA only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'Executive Director' },
                email: { type: 'string', example: 'superadmin2@hospital.com' },
                password: { type: 'string', example: 'SuperAdminPass123!' },
                phone: { type: 'string', example: '+91 9876543210' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Superadmin created.' }
      }
    }
  },
  '/api/v1/superadmins/{id}/demote': {
    patch: {
      tags: ['Superadmin Governance'],
      summary: 'Demote Superadmin (Requires >=2 active Superadmins)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', example: 'Executive leadership re-assignment' },
                newRole: { type: 'string', example: 'admin' },
                newDepartment: { type: 'string', example: 'hr' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Demoted successfully.' },
        409: { description: 'Cannot demote when only 1 active Superadmin remains.' }
      }
    }
  },

  // ==========================================
  // 3. USER MANAGEMENT & ACCESS CONTROL
  // ==========================================
  '/api/v1/users': {
    get: {
      tags: ['User Management'],
      summary: 'List users with scope projection (Dept Admins see public fields only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'department', in: 'query', schema: { type: 'string', example: 'pharmacy' } },
        { name: 'role', in: 'query', schema: { type: 'string', example: 'user' } },
        { name: 'search', in: 'query', schema: { type: 'string', example: 'John' } }
      ],
      responses: {
        200: { description: 'Paginated user list.' }
      }
    },
    post: {
      tags: ['User Management'],
      summary: 'Create new user/supervisor/admin (SA, HRA, HRS)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password', 'role', 'department'],
              properties: {
                name: { type: 'string', example: 'Dr. Sarah Connor' },
                email: { type: 'string', example: 'sarah.connor@hospital.com' },
                password: { type: 'string', example: 'Hospital123!' },
                role: { type: 'string', enum: ['admin', 'supervisor', 'user'], example: 'user' },
                department: { type: 'string', example: 'doctors' },
                designation: { type: 'string', example: 'Consultant Cardiologist' },
                salary: { type: 'number', example: 120000 },
                bankAccount: { type: 'string', example: '987654321098' },
                taxId: { type: 'string', example: 'ABCDE1234F' },
                payType: { type: 'string', enum: ['monthly', 'hourly', 'perVisit'], example: 'monthly' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'User created successfully.' }
      }
    }
  },
  '/api/v1/users/{id}/sensitive': {
    get: {
      tags: ['User Management'],
      summary: 'Read unmasked sensitive financial and personal data (SA and Creator HR only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Full decrypted bankAccount, taxId, nationalId, and salary.' },
        403: { description: 'Forbidden: Caller is not the creator or Superadmin.' }
      }
    }
  },
  '/api/v1/users/orphaned': {
    get: {
      tags: ['User Management'],
      summary: 'List staff whose creator HR is inactive or terminated',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Orphaned user list.' }
      }
    }
  },
  '/api/v1/users/reassign': {
    post: {
      tags: ['User Management'],
      summary: 'Reassign user creator ownership (SA, HRA)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fromUserId', 'toUserId'],
              properties: {
                fromUserId: { type: 'string', example: '6ac68c5f03cc8b3163b3c0db' },
                toUserId: { type: 'string', example: '6ac68c5f03cc8b3163b3c0dc' },
                userIds: { type: 'array', items: { type: 'string' }, example: [] }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Ownership reassigned with audit trail.' }
      }
    }
  },
  '/api/v1/users/{id}/transfer': {
    post: {
      tags: ['User Management'],
      summary: 'Transfer user to a new department with assignment timeline',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['toDepartment', 'newRole'],
              properties: {
                toDepartment: { type: 'string', example: 'pharmacy' },
                newRole: { type: 'string', example: 'user' },
                effectiveDate: { type: 'string', example: '2026-11-01' },
                reason: { type: 'string', example: 'Inter-department rotational transfer' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Transfer logged in assignments timeline.' }
      }
    }
  },
  '/api/v1/users/{id}/assignment-history': {
    get: {
      tags: ['User Management'],
      summary: 'Get historical timeline of department & role assignments',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Array of historical assignments with effective dates.' }
      }
    }
  },

  // ==========================================
  // 4. NOTIFICATIONS & FIREBASE PUSH (FCM)
  // ==========================================
  '/api/v1/notifications': {
    get: {
      tags: ['Notifications & FCM Push'],
      summary: 'Get current user notifications inbox (paginated)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'unreadOnly', in: 'query', schema: { type: 'boolean', default: false } }
      ],
      responses: {
        200: { description: 'Inbox notifications list.' }
      }
    }
  },
  '/api/v1/notifications/broadcast': {
    post: {
      tags: ['Notifications & FCM Push'],
      summary: 'Broadcast message hospital-wide or department with Firebase FCM push',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'message'],
              properties: {
                title: { type: 'string', example: 'Emergency Drill Announcement' },
                message: { type: 'string', example: 'Mandatory hospital-wide fire evacuation drill today at 15:00 UTC.' },
                department: { type: 'string', example: 'all', description: 'all or specific department e.g. pharmacy' },
                eventType: { type: 'string', example: 'broadcast' },
                data: { type: 'object', example: { priority: 'high', location: 'Main Hospital Tower' } }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Broadcast stored in-app and pushed to FCM devices.' }
      }
    }
  },
  '/api/v1/notifications/fcm-token': {
    post: {
      tags: ['Notifications & FCM Push'],
      summary: 'Register FCM device registration token for push notifications',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: {
                token: { type: 'string', example: 'f-c-m-device-registration-token-sample-xyz123' },
                deviceId: { type: 'string', example: 'device-uuid-9988' },
                platform: { type: 'string', enum: ['web', 'android', 'ios'], example: 'web' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'FCM push registration token saved.' }
      }
    },
    delete: {
      tags: ['Notifications & FCM Push'],
      summary: 'Unregister FCM push token on logout',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: {
                token: { type: 'string', example: 'f-c-m-device-registration-token-sample-xyz123' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Token unregistered.' }
      }
    }
  },
  '/api/v1/notifications/test-fcm': {
    post: {
      tags: ['Notifications & FCM Push'],
      summary: 'Test FCM push notification dispatch (SA, Admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'MediPulse Test Push Alert' },
                body: { type: 'string', example: 'Live verification test of Firebase Cloud Messaging push delivery.' },
                token: { type: 'string', example: '' },
                userId: { type: 'string', example: '' },
                topic: { type: 'string', example: 'hospital_all' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Push notification dispatch tested.' }
      }
    }
  },
  '/api/v1/notifications/read-all': {
    patch: {
      tags: ['Notifications & FCM Push'],
      summary: 'Mark all inbox notifications as read',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'All marked as read.' }
      }
    }
  },
  '/api/v1/notifications/{id}/read': {
    patch: {
      tags: ['Notifications & FCM Push'],
      summary: 'Mark single notification as read',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Notification updated.' }
      }
    }
  },

  // ==========================================
  // 5. ATTENDANCE, FRAUD & WORK LOCATIONS
  // ==========================================
  '/api/v1/attendance/check-in': {
    post: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'Staff check-in with GPS geofencing & device verification',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 12.9716 },
                longitude: { type: 'number', example: 77.5946 },
                deviceId: { type: 'string', example: 'hardware-mac-or-uuid' },
                photoRef: { type: 'string', example: 'https://storage/photos/checkin_01.jpg' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Check-in recorded.' }
      }
    }
  },
  '/api/v1/attendance/check-out': {
    post: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'Staff check-out and calculate 9-hour work duration',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 12.9716 },
                longitude: { type: 'number', example: 77.5946 },
                deviceId: { type: 'string', example: 'hardware-mac-or-uuid' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Check-out recorded and hours computed.' }
      }
    }
  },
  '/api/v1/attendance/corrections': {
    get: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'List attendance correction requests (scope-filtered)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } },
        { name: 'userId', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Correction tickets list.' }
      }
    },
    post: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'Request attendance correction for missing or faulty punch',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['date', 'correctedIn', 'correctedOut', 'reason'],
              properties: {
                date: { type: 'string', example: '2026-10-10' },
                correctedIn: { type: 'string', example: '2026-10-10T09:00:00Z' },
                correctedOut: { type: 'string', example: '2026-10-10T18:00:00Z' },
                reason: { type: 'string', example: 'Biometric kiosk network outage during morning check-in' },
                evidence: { type: 'string', example: 'https://storage/logs/supervisor_witness.pdf' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Correction ticket submitted.' }
      }
    }
  },
  '/api/v1/attendance/corrections/{id}/decision': {
    patch: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'Decide attendance correction (DS/DA level 1, HRA level 2; carry-forward if locked)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
                remarks: { type: 'string', example: 'Approved after verification with CCTV roster logs' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Correction decision applied.' }
      }
    }
  },
  '/api/v1/work-locations': {
    get: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'List authorized hospital work locations with geofence radius',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Work locations list.' }
      }
    },
    post: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'Define new hospital geofenced work location (SA, HRA)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'lat', 'lng', 'radiusMeters'],
              properties: {
                name: { type: 'string', example: 'MediPulse Central Hospital Campus' },
                lat: { type: 'number', example: 12.9716 },
                lng: { type: 'number', example: 77.5946 },
                radiusMeters: { type: 'number', example: 250 },
                allowedIpRanges: { type: 'array', items: { type: 'string' }, example: ['10.0.0.0/16', '192.168.1.0/24'] }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Work location registered.' }
      }
    }
  },
  '/api/v1/devices/register': {
    post: {
      tags: ['Attendance & Anti-Fraud'],
      summary: 'Bind trusted mobile or biometric kiosk hardware device',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['deviceId'],
              properties: {
                deviceId: { type: 'string', example: 'device-hardware-uuid-8833' },
                deviceName: { type: 'string', example: 'Samsung Galaxy Tab A8' },
                deviceType: { type: 'string', enum: ['mobile', 'tablet', 'desktop', 'biometric_kiosk'], example: 'tablet' },
                fcmToken: { type: 'string', example: 'fcm-push-token-if-mobile' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Device registered for HR approval.' }
      }
    }
  },

  // ==========================================
  // 6. SHIFTS & ROSTERS
  // ==========================================
  '/api/v1/shifts': {
    get: {
      tags: ['Shifts & Rosters'],
      summary: 'List hospital shift templates',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'List of configured shifts.' }
      }
    },
    post: {
      tags: ['Shifts & Rosters'],
      summary: 'Create shift template (supports midnight-crossing shifts)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'startTime', 'endTime'],
              properties: {
                name: { type: 'string', example: 'Night Emergency ICU' },
                startTime: { type: 'string', example: '22:00' },
                endTime: { type: 'string', example: '07:00' },
                crossesMidnight: { type: 'boolean', example: true },
                breakMinutes: { type: 'number', example: 45 },
                nightAllowance: { type: 'number', example: 750 }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Shift template created.' }
      }
    }
  },
  '/api/v1/rosters': {
    get: {
      tags: ['Shifts & Rosters'],
      summary: 'List department staff shift rosters',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'department', in: 'query', schema: { type: 'string' } },
        { name: 'startDate', in: 'query', schema: { type: 'string' } },
        { name: 'endDate', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Rosters array.' }
      }
    },
    post: {
      tags: ['Shifts & Rosters'],
      summary: 'Assign shift to staff member for a date range (DA, DS)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['userId', 'shiftId', 'startDate', 'endDate'],
              properties: {
                userId: { type: 'string', example: '6ac68c5f03cc8b3163b3c0db' },
                shiftId: { type: 'string', example: '6ac68c5f03cc8b3163b3c0de' },
                startDate: { type: 'string', example: '2026-11-01' },
                endDate: { type: 'string', example: '2026-11-07' },
                notes: { type: 'string', example: 'Weekly trauma ward rotation' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Roster scheduled.' }
      }
    }
  },
  '/api/v1/rosters/me': {
    get: {
      tags: ['Shifts & Rosters'],
      summary: 'Get own upcoming shift roster schedule',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Own upcoming rosters.' }
      }
    }
  },
  '/api/v1/rosters/swap-requests': {
    post: {
      tags: ['Shifts & Rosters'],
      summary: 'Request peer roster shift swap',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['requestedRosterId', 'targetUserId', 'reason'],
              properties: {
                requestedRosterId: { type: 'string', example: '6ac68c5f03cc8b3163b3c0df' },
                targetUserId: { type: 'string', example: '6ac68c5f03cc8b3163b3c0db' },
                reason: { type: 'string', example: 'Medical appointment conflict on Sunday shift' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Swap ticket submitted for supervisor review.' }
      }
    }
  },

  // ==========================================
  // 7. LEAVE MANAGEMENT
  // ==========================================
  '/api/v1/leave-types': {
    get: {
      tags: ['Leave Management'],
      summary: 'List available leave types & annual quotas',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Leave types array.' }
      }
    },
    post: {
      tags: ['Leave Management'],
      summary: 'Define new leave policy type (SA, HRA)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'code', 'annualQuota'],
              properties: {
                name: { type: 'string', example: 'Maternity Leave' },
                code: { type: 'string', example: 'ML' },
                paid: { type: 'boolean', example: true },
                annualQuota: { type: 'number', example: 180 },
                carryForward: { type: 'boolean', example: false },
                maxCarryForward: { type: 'number', example: 0 },
                requiresDocument: { type: 'boolean', example: true }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Leave type created.' }
      }
    }
  },
  '/api/v1/leaves': {
    get: {
      tags: ['Leave Management'],
      summary: 'List staff leave applications (scope-filtered)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] } },
        { name: 'department', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Leave applications array.' }
      }
    },
    post: {
      tags: ['Leave Management'],
      summary: 'Apply for leave',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['leaveType', 'startDate', 'endDate', 'reason'],
              properties: {
                leaveType: { type: 'string', example: 'CL' },
                startDate: { type: 'string', example: '2026-11-15' },
                endDate: { type: 'string', example: '2026-11-17' },
                reason: { type: 'string', example: 'Family wedding event' },
                documentUrl: { type: 'string', example: '' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Leave submitted.' }
      }
    }
  },
  '/api/v1/leaves/{id}/decision': {
    patch: {
      tags: ['Leave Management'],
      summary: 'Approve or reject leave application (DS, DA, HRA)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
                remarks: { type: 'string', example: 'Cover duty arranged with Dr. Rao' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Leave decision saved and balance deducted if approved.' }
      }
    }
  },
  '/api/v1/leaves/balance/me': {
    get: {
      tags: ['Leave Management'],
      summary: 'Get own remaining leave balances',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Balance breakdown by leave type.' }
      }
    }
  },
  '/api/v1/leaves/balance/{userId}/adjust': {
    post: {
      tags: ['Leave Management'],
      summary: 'Manually adjust staff leave balance with mandatory audit reason (HRA, SA)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['leaveTypeCode', 'adjustment', 'reason'],
              properties: {
                leaveTypeCode: { type: 'string', example: 'CL' },
                adjustment: { type: 'number', example: 3, description: 'Positive to add, negative to subtract' },
                reason: { type: 'string', example: 'Special compensatory balance credited for working during cyclone duty' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Balance adjusted and audited.' }
      }
    }
  },

  // ==========================================
  // 8. PAYROLL BUSINESS RULES & POLICIES
  // ==========================================
  '/api/v1/payroll-policies': {
    get: {
      tags: ['Payroll Policies & Calculation'],
      summary: 'List all versioned payroll policies (SA, HRA)',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Payroll policies list.' }
      }
    },
    post: {
      tags: ['Payroll Policies & Calculation'],
      summary: 'Create new versioned payroll policy configuration (SA)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'effectiveDate'],
              properties: {
                name: { type: 'string', example: 'FY2026-Hospital-Policy' },
                effectiveDate: { type: 'string', example: '2026-04-01' },
                workingHoursPerDay: { type: 'number', example: 9 },
                fullDayMinHours: { type: 'number', example: 8 },
                halfDayMinHours: { type: 'number', example: 4 },
                graceMinutes: { type: 'number', example: 15 },
                lateMarksPerHalfDay: { type: 'number', example: 3 },
                weeklyOffDays: { type: 'array', items: { type: 'string' }, example: ['Sunday'] },
                payableDaysFormula: { type: 'string', enum: ['calendarDays', 'workingDays'], example: 'calendarDays' },
                overtime: {
                  type: 'object',
                  example: {
                    enabled: true,
                    thresholdHours: 9,
                    rateMultiplier: 1.5,
                    weeklyOffMultiplier: 2.0,
                    holidayMultiplier: 2.0,
                    maxOvertimeHoursPerMonth: 40,
                    requiresApproval: true
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Versioned policy created.' }
      }
    }
  },
  '/api/v1/payroll-policies/active': {
    get: {
      tags: ['Payroll Policies & Calculation'],
      summary: 'Get currently active payroll policy',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Active policy document.' }
      }
    }
  },
  '/api/v1/payroll-policies/{id}/activate': {
    post: {
      tags: ['Payroll Policies & Calculation'],
      summary: 'Activate a payroll policy version (SA only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Policy activated as hospital standard.' }
      }
    }
  },
  '/api/v1/payroll/run': {
    post: {
      tags: ['Payroll Policies & Calculation'],
      summary: 'Execute monthly payroll engine with distributed lock & idempotency',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['month'],
              properties: {
                month: { type: 'string', example: '2026-10', description: 'YYYY-MM format' },
                isDryRun: { type: 'boolean', example: false }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Payroll calculated, deductions applied, payslips generated.' }
      }
    }
  },
  '/api/v1/payroll/{runId}/lock': {
    post: {
      tags: ['Payroll Policies & Calculation'],
      summary: 'Lock payroll run after final approval (SA only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'runId', in: 'path', required: true, schema: { type: 'string' }, example: 'payroll-2026-10-run' }
      ],
      responses: {
        200: { description: 'Payroll locked. Subsequent corrections generate carry-forward adjustments.' }
      }
    }
  },
  '/api/v1/payroll/{runId}/payslips/publish': {
    post: {
      tags: ['Payroll Policies & Calculation'],
      summary: 'Publish payslips and dispatch staff notifications (SA)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'runId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Payslips published to staff portal.' }
      }
    }
  },

  // ==========================================
  // 9. SALARY EXTRAS (INCREMENTS, BONUSES, ADVANCES)
  // ==========================================
  '/api/v1/salaries/{userId}/increments': {
    post: {
      tags: ['Salary Extras & Components'],
      summary: 'Grant salary revision / increment with reason (HRA, SA)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['newAmount', 'effectiveFrom', 'reason'],
              properties: {
                newAmount: { type: 'number', example: 85000 },
                effectiveFrom: { type: 'string', example: '2026-11-01' },
                reason: { type: 'string', example: 'Annual performance evaluation grade promotion' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Salary revision appended to history.' }
      }
    }
  },
  '/api/v1/bonuses': {
    post: {
      tags: ['Salary Extras & Components'],
      summary: 'Award one-off bonus or festive incentive (HRA, SA)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['userId', 'amount', 'type', 'payMonth'],
              properties: {
                userId: { type: 'string', example: '6ac68c5f03cc8b3163b3c0db' },
                amount: { type: 'number', example: 15000 },
                type: { type: 'string', enum: ['performance', 'festival', 'retention', 'statutory'], example: 'performance' },
                payMonth: { type: 'string', example: '2026-10' },
                reason: { type: 'string', example: 'Exemplary clinical care during emergency disaster surge' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Bonus recorded for monthly payroll.' }
      }
    }
  },
  '/api/v1/advances': {
    post: {
      tags: ['Salary Extras & Components'],
      summary: 'Apply for salary advance with auto-installment repayment schedule',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['amount', 'installments', 'startMonth'],
              properties: {
                amount: { type: 'number', example: 60000 },
                installments: { type: 'number', example: 6, description: 'Number of monthly auto-deductions' },
                startMonth: { type: 'string', example: '2026-11' },
                reason: { type: 'string', example: 'Family medical emergency' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Advance request submitted.' }
      }
    }
  },
  '/api/v1/advances/{id}/decision': {
    patch: {
      tags: ['Salary Extras & Components'],
      summary: 'Approve or reject salary advance (HRA, SA, Finance Admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['decision'],
              properties: {
                decision: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
                remarks: { type: 'string', example: 'Approved under emergency welfare provision' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Advance approved and repayment schedule generated.' }
      }
    }
  },
  '/api/v1/advances/{id}/schedule': {
    get: {
      tags: ['Salary Extras & Components'],
      summary: 'Get monthly repayment installment schedule',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Array of monthly installment dues.' }
      }
    }
  },
  '/api/v1/reimbursements': {
    post: {
      tags: ['Salary Extras & Components'],
      summary: 'Submit expense claim with receipt URL',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['amount', 'category', 'description'],
              properties: {
                amount: { type: 'number', example: 3450 },
                category: { type: 'string', enum: ['travel', 'medical_supplies', 'food', 'training', 'other'], example: 'medical_supplies' },
                description: { type: 'string', example: 'Urgent emergency sutures purchase from local distributor' },
                receiptUrl: { type: 'string', example: 'https://storage/receipts/bill_4499.pdf' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Reimbursement ticket submitted.' }
      }
    }
  },

  // ==========================================
  // 10. CALENDAR & WORKING DAYS
  // ==========================================
  '/api/v1/calendar/holidays': {
    get: {
      tags: ['Calendar & Working Days'],
      summary: 'List hospital holidays for a given year',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'year', in: 'query', schema: { type: 'integer', default: 2026 } }
      ],
      responses: {
        200: { description: 'Holidays list.' }
      }
    },
    post: {
      tags: ['Calendar & Working Days'],
      summary: 'Create public or departmental holiday (SA, HRA)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'date'],
              properties: {
                name: { type: 'string', example: 'National Hospital Day' },
                date: { type: 'string', example: '2026-12-25' },
                type: { type: 'string', enum: ['public', 'restricted'], example: 'public' },
                departments: { type: 'array', items: { type: 'string' }, example: [] }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Holiday saved.' }
      }
    }
  },
  '/api/v1/calendar/working-days': {
    get: {
      tags: ['Calendar & Working Days'],
      summary: 'Dynamic working days calculator combining holidays, weekly-offs, shifts & approved leaves',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'month', in: 'query', required: true, schema: { type: 'string', example: '2026-10' } },
        { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Computed totalWorkingDays, holidaysCount, weeklyOffCount, and payableDays.' }
      }
    }
  },

  // ==========================================
  // 11. AUDIT LOGS & INTEGRITY
  // ==========================================
  '/api/v1/audit-logs': {
    get: {
      tags: ['Audit Logging'],
      summary: 'Query immutable audit trail (SA hospital-wide, others own actions)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        { name: 'action', in: 'query', schema: { type: 'string' } },
        { name: 'resource', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        200: { description: 'Audit logs.' }
      }
    }
  },
  '/api/v1/audit-logs/verify': {
    get: {
      tags: ['Audit Logging'],
      summary: 'Verify SHA-256 cryptographic hash chain integrity (detects database tampering)',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Cryptographic verification status (chain unbroken / broken).' }
      }
    }
  },
  '/api/v1/audit-logs/export': {
    post: {
      tags: ['Audit Logging'],
      summary: 'Generate HMAC-SHA256 signed audit export for statutory regulatory auditors',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Signed audit export package.' }
      }
    }
  },

  // ==========================================
  // 12. SYSTEM SETTINGS & BACKGROUND JOBS
  // ==========================================
  '/api/v1/settings/system': {
    get: {
      tags: ['System & Engineering'],
      summary: 'Get hospital timezone, currency, and calculation policies',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'System settings.' }
      }
    },
    put: {
      tags: ['System & Engineering'],
      summary: 'Update hospital timezone, currency, or financial year (SA only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                hospital: {
                  type: 'object',
                  example: {
                    timezone: 'Asia/Kolkata',
                    currency: 'INR',
                    financialYearStart: '04-01'
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Settings updated.' }
      }
    }
  },
  '/api/v1/jobs': {
    get: {
      tags: ['System & Engineering'],
      summary: 'List background scheduled jobs & execution status (SA)',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Jobs list.' }
      }
    }
  },
  '/api/v1/jobs/{name}/trigger': {
    post: {
      tags: ['System & Engineering'],
      summary: 'Trigger scheduled job manually via distributed TTL lock (SA)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'name', in: 'path', required: true, schema: { type: 'string' }, example: 'payroll_scheduler' }
      ],
      responses: {
        200: { description: 'Job executed under lock protection.' }
      }
    }
  },
  '/api/v1/health': {
    get: {
      tags: ['Health Check'],
      summary: 'Server liveness probe',
      responses: {
        200: { description: 'Server operational.' }
      }
    }
  },
  '/api/v1/health/ready': {
    get: {
      tags: ['Health Check'],
      summary: 'Server readiness probe (checks MongoDB connection)',
      responses: {
        200: { description: 'Readiness status.' }
      }
    }
  },
  '/api/v1/version': {
    get: {
      tags: ['Health Check'],
      summary: 'Get API version & environment info',
      responses: {
        200: { description: 'Version metadata.' }
      }
    }
  }
};

module.exports = swaggerPaths;
