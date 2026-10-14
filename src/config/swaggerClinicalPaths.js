/**
 * OpenAPI 3.0 Path Definitions for Clinical & Patient Operations (Document 3 Specification)
 * Provides complete parameters, request body schemas, and runnable examples for Swagger UI.
 */

const swaggerClinicalPaths = {
  // ==========================================
  // 1. MULTI-BRANCH CONTEXT & CROSS-BRANCH OPS
  // ==========================================
  '/api/v1/branches': {
    get: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'List hospital branches',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Returns array of branches with codes (e.g. MPH-CEN, MPH-SOU)' } }
    },
    post: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'Create hospital branch (Superadmin only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'code'],
              properties: {
                name: { type: 'string', example: 'MediPulse Central Campus' },
                code: { type: 'string', example: 'MPH-CEN' },
                isMain: { type: 'boolean', example: true }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Branch created' } }
    }
  },
  '/api/v1/auth/switch-branch': {
    post: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'Switch active hospital branch context in token',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['branchId'],
              properties: {
                branchId: { type: 'string', example: '6acfe10f404812432abadc09' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'New JWT access token issued carrying activeBranchId' } }
    }
  },
  '/api/v1/inter-branch/stock-transfers': {
    post: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'Initiate inter-branch stock transfer',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fromBranchId', 'toBranchId', 'items'],
              properties: {
                fromBranchId: { type: 'string', example: '6acfe10f404812432abadc09' },
                toBranchId: { type: 'string', example: '6acfe10f404812432abadc0a' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      itemCode: { type: 'string', example: 'MED-GLV-01' },
                      quantity: { type: 'number', example: 50 }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Transfer order initiated with in_transit status' } }
    }
  },
  '/api/v1/inter-branch/transfers/{id}/receive': {
    patch: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'Receive inter-branch stock transfer (idempotent; 409 on duplicate)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        200: { description: 'Stock received and restocked at target branch' },
        409: { description: 'Conflict: Transfer has already been received' }
      }
    }
  },

  // ==========================================
  // 2. PATIENT REGISTRATION & IDENTITY
  // ==========================================
  '/api/v1/patients': {
    post: {
      tags: ['Clinical: Patients & Identity'],
      summary: 'Register patient with duplicate check preview & automatic UHID',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'phone'],
              properties: {
                name: { type: 'string', example: 'Vikram Malhotra' },
                gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
                dob: { type: 'string', example: '1985-06-12' },
                phone: { type: 'string', example: '+91-9876543210' },
                email: { type: 'string', example: 'vikram.m@example.com' },
                bloodGroup: { type: 'string', example: 'O+' }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Patient registered with globally unique UHID (e.g. MPH-CEN-2026-000001)' },
        409: { description: 'Potential duplicates found by phone/name' }
      }
    },
    get: {
      tags: ['Clinical: Patients & Identity'],
      summary: 'Search patients by UHID, name, phone, or DOB',
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'q', schema: { type: 'string' }, description: 'Search term' }
      ],
      responses: { 200: { description: 'Returns matching patients' } }
    }
  },
  '/api/v1/patients/{id}/wristband': {
    get: {
      tags: ['Clinical: Patients & Identity'],
      summary: 'Generate patient wristband barcode payload & QR code string',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Returns barcodePayload, printFormat, and patient summary' } }
    }
  },
  '/api/v1/patients/{id}/allergies': {
    post: {
      tags: ['Clinical: Patients & Identity'],
      summary: 'Record drug, food, or environmental allergy',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['allergen'],
              properties: {
                allergen: { type: 'string', example: 'Penicillin' },
                category: { type: 'string', example: 'drug' },
                severity: { type: 'string', enum: ['mild', 'moderate', 'severe'], example: 'severe' },
                reaction: { type: 'string', example: 'Anaphylaxis' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Allergy recorded and indexed for CDS order checks' } }
    }
  },
  '/api/v1/care-teams': {
    post: {
      tags: ['Clinical: Access & Care Teams'],
      summary: 'Assign doctor or nurse to patient care team episode',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'staffId'],
              properties: {
                patientId: { type: 'string' },
                staffId: { type: 'string' },
                role: { type: 'string', example: 'primary_doctor' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Staff assigned to patient care team' } }
    }
  },
  '/api/v1/break-glass': {
    post: {
      tags: ['Clinical: Access & Care Teams'],
      summary: 'Emergency break-glass access grant (time-limited 2 hours, fully audited)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'reason'],
              properties: {
                patientId: { type: 'string' },
                reason: { type: 'string', example: 'Emergency acute trauma resuscitation outside ward schedule' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Break-glass granted until expiresAt timestamp' } }
    }
  },

  // ==========================================
  // 3. FACILITY, BEDS & TARIFFS
  // ==========================================
  '/api/v1/facility/tree': {
    get: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'Get complete facility hierarchy tree (Building -> Floor -> Ward -> Room -> Bed)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Hierarchical tree of facilities' } }
    }
  },
  '/api/v1/beds/census': {
    get: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'Aggregate bed census by ward (occupied, free, cleaning, maintenance)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Aggregated bed census metrics' } }
    }
  },
  '/api/v1/beds/{id}/status': {
    patch: {
      tags: ['Clinical: Branches & Facility'],
      summary: 'Update bed status (cleaning -> available restricted to Support & Nursing)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'] },
                remarks: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Bed status updated' }, 403: { description: 'Unauthorized role transition' } }
    }
  },
  '/api/v1/services/{id}/price': {
    get: {
      tags: ['Clinical: Billing & Revenue'],
      summary: 'Resolve dynamic service price by payer and branch override',
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        { in: 'query', name: 'payerId', schema: { type: 'string' } },
        { in: 'query', name: 'branchId', schema: { type: 'string' } }
      ],
      responses: { 200: { description: 'Returns resolved unit price' } }
    }
  },

  // ==========================================
  // 4. APPOINTMENTS, QUEUES & EMR
  // ==========================================
  '/api/v1/doctor-schedules': {
    post: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Configure doctor weekly OPD slots',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['doctorId', 'dayOfWeek', 'startTime', 'endTime'],
              properties: {
                doctorId: { type: 'string' },
                dayOfWeek: { type: 'string', example: 'Wednesday' },
                startTime: { type: 'string', example: '09:00' },
                endTime: { type: 'string', example: '13:00' },
                slotDurationMinutes: { type: 'number', example: 15 },
                maxPatients: { type: 'number', example: 16 }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Weekly slot template configured' } }
    }
  },
  '/api/v1/queues/display': {
    get: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Public queue feed for waiting room TV screens (token numbers only, NO PHI, NO AUTH)',
      parameters: [{ in: 'query', name: 'branchId', schema: { type: 'string' } }],
      responses: { 200: { description: 'Publicly safe queue status' } }
    }
  },
  '/api/v1/appointments': {
    post: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Book doctor appointment with double-booking slot protection',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'doctorId', 'appointmentDate', 'slotTime'],
              properties: {
                patientId: { type: 'string' },
                doctorId: { type: 'string' },
                appointmentDate: { type: 'string', example: '2026-10-20' },
                slotTime: { type: 'string', example: '10:00' },
                type: { type: 'string', example: 'consultation' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Appointment scheduled' }, 409: { description: 'Slot already booked' } }
    }
  },
  '/api/v1/appointments/{id}/check-in': {
    post: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Check in patient, issue daily queue token, and post consultation fee charge',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Queue token issued and consultation fee posted to billing ledger' } }
    }
  },
  '/api/v1/visits/{id}/notes': {
    post: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Record doctor SOAP note for visit',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                subjective: { type: 'string', example: 'Patient reports progressive dyspnea.' },
                objective: { type: 'string', example: 'S1/S2 heard, lungs clear.' },
                assessment: { type: 'string', example: 'Suspected Angina Pectoris.' },
                plan: { type: 'string', example: 'Advise ECG and start Beta-Blocker.' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'SOAP note created' } }
    }
  },
  '/api/v1/notes/{id}/sign': {
    patch: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Digitally lock SOAP note with SHA-256 cryptographic signature (immutable)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Note digitally locked with signatureHash' } }
    }
  },
  '/api/v1/notes/{id}/addendum': {
    post: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Attach audited addendum to locked note',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: { content: { type: 'string', example: 'ECG reviewed: Normal sinus rhythm.' } }
            }
          }
        }
      },
      responses: { 200: { description: 'Addendum attached' } }
    }
  },
  '/api/v1/patients/{id}/emr': {
    get: {
      tags: ['Clinical: OPD & Appointments'],
      summary: 'Get longitudinal patient EMR summary (visits, notes, allergies, prescriptions)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Longitudinal clinical history' } }
    }
  },

  // ==========================================
  // 5. CPOE ORDERS & CLINICAL DECISION SUPPORT
  // ==========================================
  '/api/v1/clinical/checks/drug-interactions': {
    post: {
      tags: ['Clinical: CPOE & Safety Checks'],
      summary: 'Evaluate drug-drug interactions before ordering',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['drugs'],
              properties: { drugs: { type: 'array', items: { type: 'string' }, example: ['Warfarin', 'Aspirin'] } }
            }
          }
        }
      },
      responses: { 200: { description: 'Returns interaction severity and risk description' } }
    }
  },
  '/api/v1/clinical/checks/allergy': {
    post: {
      tags: ['Clinical: CPOE & Safety Checks'],
      summary: 'Check medication against patient recorded allergies',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'drugName'],
              properties: { patientId: { type: 'string' }, drugName: { type: 'string', example: 'Penicillin V' } }
            }
          }
        }
      },
      responses: { 200: { description: 'Allergy match warnings' } }
    }
  },
  '/api/v1/orders': {
    post: {
      tags: ['Clinical: CPOE & Safety Checks'],
      summary: 'Create unified CPOE order (lab, radiology, procedure, diet, pharmacy)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'orderType', 'items'],
              properties: {
                patientId: { type: 'string' },
                orderType: { type: 'string', enum: ['lab', 'radiology', 'procedure', 'diet', 'pharmacy'] },
                items: { type: 'array', items: { type: 'object', properties: { testCode: { type: 'string' }, testName: { type: 'string' } } } },
                priority: { type: 'string', enum: ['routine', 'urgent', 'stat'] }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Order created with unique orderNo' } }
    }
  },
  '/api/v1/orders/{id}/complete': {
    patch: {
      tags: ['Clinical: CPOE & Safety Checks'],
      summary: 'Complete order and publish billing charge event via Outbox Bus',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Order completed and charge posted to patient billing account' } }
    }
  },

  // ==========================================
  // 6. DIAGNOSTICS (LAB & RADIOLOGY)
  // ==========================================
  '/api/v1/lab/orders/{id}/collect-sample': {
    post: {
      tags: ['Clinical: Diagnostics & Lab'],
      summary: 'Collect diagnostic sample and generate unique barcode label',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { sampleType: { type: 'string', example: 'EDTA Whole Blood' } }
            }
          }
        }
      },
      responses: { 201: { description: 'Sample logged with barcode label SMP-XXXXXX-XXXX' } }
    }
  },
  '/api/v1/lab/results': {
    post: {
      tags: ['Clinical: Diagnostics & Lab'],
      summary: 'Enter lab test parameters with critical value auto-alert triggers',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['sampleId', 'patientId'],
              properties: {
                sampleId: { type: 'string' },
                orderId: { type: 'string' },
                patientId: { type: 'string' },
                testName: { type: 'string', example: 'Complete Blood Count (CBC)' },
                parameterResults: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      parameter: { type: 'string', example: 'Hemoglobin' },
                      value: { type: 'string', example: '14.2' },
                      unit: { type: 'string', example: 'g/dL' },
                      isCritical: { type: 'boolean', example: false }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Test parameters saved. Critical alerts triggered if out-of-range.' } }
    }
  },
  '/api/v1/lab/results/{id}/validate': {
    patch: {
      tags: ['Clinical: Diagnostics & Lab'],
      summary: 'Validate lab result (Pathologist sign-off)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Results certified by Pathologist' } }
    }
  },
  '/api/v1/lab/results/{id}/release': {
    patch: {
      tags: ['Clinical: Diagnostics & Lab'],
      summary: 'Release verified result to Patient Portal & EMR',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Result made visible on patient portal' } }
    }
  },

  // ==========================================
  // 7. IPD ADMISSIONS & BED MANAGEMENT
  // ==========================================
  '/api/v1/admissions': {
    post: {
      tags: ['Clinical: IPD & Nursing'],
      summary: 'Admit inpatient (marks bed occupied, opens billing account, alerts nursing & diet)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'doctorId', 'bedId'],
              properties: {
                patientId: { type: 'string' },
                doctorId: { type: 'string' },
                bedId: { type: 'string' },
                admissionType: { type: 'string', enum: ['elective', 'emergency', 'transfer'] },
                diagnosis: { type: 'string', example: 'Acute Coronary Syndrome' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Inpatient admitted with unique admissionNo' }, 409: { description: 'Bed not available' } }
    }
  },
  '/api/v1/admissions/{id}/bed-transfer': {
    post: {
      tags: ['Clinical: IPD & Nursing'],
      summary: 'Transfer inpatient bed (old bed set to cleaning, room rent split by timestamp)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['targetBedId'],
              properties: { targetBedId: { type: 'string' }, reason: { type: 'string', example: 'Step-down telemetry transfer' } }
            }
          }
        }
      },
      responses: { 200: { description: 'Bed transferred, old bed released to cleaning' } }
    }
  },
  '/api/v1/admissions/{id}/discharge/clearance/{dept}': {
    patch: {
      tags: ['Clinical: IPD & Nursing'],
      summary: 'Approve discharge clearance by department (doctor, nursing, pharmacy, billing)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'dept', required: true, schema: { type: 'string', enum: ['doctor', 'nursing', 'pharmacy', 'billing'] } }
      ],
      responses: { 200: { description: 'Department clearance granted' } }
    }
  },
  '/api/v1/admissions/{id}/discharge': {
    post: {
      tags: ['Clinical: IPD & Nursing'],
      summary: 'Finalize discharge (blocked until all 4 clearances complete or SA override)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Discharge finalized, bed released to cleaning, invoice unlocked' } }
    }
  },

  // ==========================================
  // 8. ACUTE CARE (EMERGENCY & OT)
  // ==========================================
  '/api/v1/emergency/cases': {
    post: {
      tags: ['Clinical: Acute Care & Emergency'],
      summary: 'Register emergency case with ESI 1-5 triage (never blocked by payment or ID)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'triageLevel', 'complaint'],
              properties: {
                patientId: { type: 'string' },
                triageLevel: { type: 'number', enum: [1, 2, 3, 4, 5], example: 2 },
                complaint: { type: 'string', example: 'Crushing chest pain radiating to jaw' },
                arrivalMode: { type: 'string', example: 'ambulance' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Emergency case triaged and assigned' } }
    }
  },
  '/api/v1/emergency/code-alerts': {
    post: {
      tags: ['Clinical: Acute Care & Emergency'],
      summary: 'Broadcast Code Blue/Red emergency alert hospital-wide via Firebase FCM',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['codeType', 'location'],
              properties: {
                codeType: { type: 'string', example: 'code_blue' },
                location: { type: 'string', example: 'Trauma Bay 1' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Alert broadcasted to all resuscitation teams via FCM' } }
    }
  },
  '/api/v1/ot/bookings': {
    post: {
      tags: ['Clinical: Acute Care & Emergency'],
      summary: 'Book surgical OT slot with automated conflict checks on theatre, surgeon, and anesthetist',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['theatreId', 'patientId', 'procedureName'],
              properties: {
                theatreId: { type: 'string' },
                patientId: { type: 'string' },
                surgeonId: { type: 'string' },
                procedureName: { type: 'string', example: 'Percutaneous Coronary Intervention (PCI)' },
                scheduledStart: { type: 'string', example: '2026-10-22T08:00:00.000Z' },
                durationMinutes: { type: 'number', example: 90 }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Surgical slot reserved' }, 409: { description: 'Theatre or surgeon collision detected' } }
    }
  },

  // ==========================================
  // 9. BILLING, INVOICES & PAYMENTS
  // ==========================================
  '/api/v1/billing/invoices': {
    post: {
      tags: ['Clinical: Billing & Revenue'],
      summary: 'Draft sequential non-gap branch invoice per financial year (e.g. INV-CEN-2026-00001)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['billingAccountId'],
              properties: { billingAccountId: { type: 'string' } }
            }
          }
        }
      },
      responses: { 201: { description: 'Non-gap financial invoice generated' } }
    }
  },
  '/api/v1/billing/invoices/{id}/finalize': {
    post: {
      tags: ['Clinical: Billing & Revenue'],
      summary: 'Finalize and lock financial invoice (immutable against edits)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Invoice sealed and locked' } }
    }
  },
  '/api/v1/billing/payments': {
    post: {
      tags: ['Clinical: Billing & Revenue'],
      summary: 'Record payment and issue official receipt with sequential numbering',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['billingAccountId', 'amount'],
              properties: {
                billingAccountId: { type: 'string' },
                invoiceId: { type: 'string' },
                amount: { type: 'number', example: 1200 },
                paymentMode: { type: 'string', enum: ['cash', 'card', 'upi', 'cheque', 'online'], example: 'cash' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Payment recorded and receipt RCP-XXXXXX issued' } }
    }
  },
  '/api/v1/billing/discounts': {
    post: {
      tags: ['Clinical: Billing & Revenue'],
      summary: 'Apply role-tiered discount (Clerk <= 5%, Admin <= 15%, SA > 15%)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['billingAccountId', 'discountPercent', 'reason'],
              properties: {
                billingAccountId: { type: 'string' },
                discountPercent: { type: 'number', example: 20 },
                reason: { type: 'string', example: 'Compassionate care discount' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Authorized discount applied' }, 403: { description: 'Exceeds role discount authorization limit' } }
    }
  },

  // ==========================================
  // 10. SUPPORT OPS & CERTIFICATES
  // ==========================================
  '/api/v1/certificates': {
    post: {
      tags: ['Clinical: Support Services'],
      summary: 'Issue tamper-evident medical/birth/death certificate with QR verification code',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patientId', 'type'],
              properties: {
                patientId: { type: 'string' },
                type: { type: 'string', enum: ['medical_fitness', 'birth', 'death', 'sick_leave'] },
                details: { type: 'object', properties: { remarks: { type: 'string', example: 'Fit for employment duty' } } }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Certificate issued with verificationCode' } }
    }
  },
  '/api/v1/certificates/verify/{code}': {
    get: {
      tags: ['Clinical: Support Services'],
      summary: 'Public verification of certificates without auth token (scanned by authorities/employers)',
      parameters: [{ in: 'path', name: 'code', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Returns validity and certifying doctor metadata' } }
    }
  },

  // ==========================================
  // 11. PATIENT PORTAL & TOKEN ISOLATION
  // ==========================================
  '/api/v1/patient-auth/register': {
    post: {
      tags: ['Clinical: Patient Portal'],
      summary: 'Register patient portal account with OTP verification',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['uhid', 'phone'],
              properties: { uhid: { type: 'string', example: 'MPH-CEN-2026-000001' }, phone: { type: 'string', example: '+91-9876543210' } }
            }
          }
        }
      },
      responses: { 200: { description: 'OTP dispatched to registered mobile number' } }
    }
  },
  '/api/v1/patient-auth/login': {
    post: {
      tags: ['Clinical: Patient Portal'],
      summary: 'Patient login via OTP (issues portal token with aud: patient_portal)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['uhid', 'otp'],
              properties: { uhid: { type: 'string', example: 'MPH-CEN-2026-000001' }, otp: { type: 'string', example: '123456' } }
            }
          }
        }
      },
      responses: { 200: { description: 'Returns portal accessToken (isolated from staff endpoints)' } }
    }
  },
  '/api/v1/portal/me': {
    get: {
      tags: ['Clinical: Patient Portal'],
      summary: 'Get patient dashboard & profile from portal',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Patient demographic profile' }, 401: { description: 'Staff token rejected' } }
    }
  },
  '/api/v1/portal/reports': {
    get: {
      tags: ['Clinical: Patient Portal'],
      summary: 'View only doctor-released diagnostic test results',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Released lab and radiology reports' } }
    }
  },

  // ==========================================
  // 12. FHIR R4 INTEROPERABILITY FACADE
  // ==========================================
  '/api/v1/fhir/Patient': {
    get: {
      tags: ['Clinical: FHIR R4 Facade'],
      summary: 'FHIR R4 Patient search (returns Bundle of Patient resources)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'application/fhir+json Patient searchset Bundle' } }
    }
  },
  '/api/v1/fhir/Encounter': {
    get: {
      tags: ['Clinical: FHIR R4 Facade'],
      summary: 'FHIR R4 Encounter search (returns Bundle of Encounter resources)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'application/fhir+json Encounter searchset Bundle' } }
    }
  },
  '/api/v1/fhir/Observation': {
    get: {
      tags: ['Clinical: FHIR R4 Facade'],
      summary: 'FHIR R4 Observation search (returns Bundle of Vitals/Lab Observation resources)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'application/fhir+json Observation searchset Bundle' } }
    }
  }
};

module.exports = swaggerClinicalPaths;
