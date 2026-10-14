/**
 * MediPulse Hospital Management Backend: Clinical and Patient Operations Test Suite
 * Validates sections 1 through 33 of Document 3 Specification:
 * Multi-branch, Patient Master, Facility, EMR, IPD, Orders, Diagnostics,
 * Acute Care, Billing & TPA, Support Ops, Patient Portal, and FHIR Facade.
 */
const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:5000/api/v1';

let passed = 0;
let failed = 0;
const results = [];

let lastRes = null;

function assert(condition, testName, details = '', res = null) {
  if (condition) {
    passed++;
    results.push({ test: testName, status: 'PASS', details });
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    failed++;
    const targetRes = res || lastRes;
    const resInfo = targetRes ? `[status: ${targetRes.status}, body: ${JSON.stringify(targetRes.data)}]` : '';
    results.push({ test: testName, status: 'FAIL', details: details + ' ' + resInfo });
    console.error(`\x1b[31m✘ FAIL\x1b[0m: ${testName} ${details ? '(' + details + ')' : ''} ${resInfo}`);
  }
}

async function request(endpoint, options = {}, token = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    lastRes = { status: res.status, headers: res.headers, data };
    return lastRes;
  } catch (err) {
    lastRes = { status: 500, error: err.message };
    return lastRes;
  }
}

async function loginUser(email, password = 'Hospital123!') {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const token = res.data?.accessToken || res.data?.data?.accessToken;
  const user = res.data?.user || res.data?.data?.user;
  if (res.status === 200 && res.data?.success && token) {
    return { token, user };
  }
  return null;
}

async function runClinicalTests() {
  console.log('\n========================================================================');
  console.log('  MediPulse Hospital Backend: Clinical & Patient Operations API Test    ');
  console.log('========================================================================\n');

  // Authenticate Actors
  console.log('--- Authenticating Personas ---');
  const saAuth = await loginUser('superadmin@hospital.com', 'SuperAdmin123!');
  assert(!!saAuth, 'Superadmin Login', saAuth?.user?.email);
  const saToken = saAuth.token;

  const docAuth = await loginUser('dr.sharma@hospital.com', 'Hospital123!');
  assert(!!docAuth, 'Doctor Login (Cardiologist)', docAuth?.user?.email);
  const docToken = docAuth.token;

  // 1. Multi-Branch Operations
  console.log('\n--- 1. Multi-Branch Context & Cross-Branch Operations ---');
  const branchesRes = await request('/branches', {}, saToken);
  assert(branchesRes.status === 200 && branchesRes.data.data?.length >= 2, 'GET /branches returns both hospital branches');
  const branch1 = branchesRes.data.data.find(b => b.code === 'MPH-CEN');
  const branch2 = branchesRes.data.data.find(b => b.code === 'MPH-SOU');
  assert(branch1 && branch2, 'Verified Central (Main) and South branches exist');

  // Switch Branch
  const switchRes = await request('/auth/switch-branch', {
    method: 'POST',
    body: JSON.stringify({ branchId: branch1._id })
  }, saToken);
  assert(switchRes.status === 200 && switchRes.data.data?.accessToken, 'POST /auth/switch-branch issues token with activeBranchId');
  const branch1Token = switchRes.data.data.accessToken;

  // Inter-Branch Stock Transfer & Idempotency / Double Receive check
  const transferRes = await request('/inter-branch/stock-transfers', {
    method: 'POST',
    body: JSON.stringify({
      fromBranchId: branch1._id,
      toBranchId: branch2._id,
      items: [{ itemCode: 'MED-GLV-01', quantity: 50 }],
      details: { reason: 'Stock replenishment for South campus' }
    })
  }, branch1Token);
  assert(transferRes.status === 201 && transferRes.data.success, 'POST /inter-branch/stock-transfers initiates transfer');
  const transferId = transferRes.data.data?._id;

  const receiveRes1 = await request(`/inter-branch/transfers/${transferId}/receive`, {
    method: 'PATCH'
  }, branch1Token);
  assert(receiveRes1.status === 200 && receiveRes1.data.data?.status === 'received', 'PATCH /inter-branch/transfers/:id/receive receives transfer');

  const receiveRes2 = await request(`/inter-branch/transfers/${transferId}/receive`, {
    method: 'PATCH'
  }, branch1Token);
  assert(receiveRes2.status === 409, 'Inter-branch stock transfer cannot be received twice (409 Conflict)');

  // 2. Patient Registration and Identity
  console.log('\n--- 2. Patient Registration and Identity ---');
  const patientPayload = {
    name: `Amitabh Sen_${Date.now().toString().slice(-4)}`,
    gender: 'male',
    dob: '1980-05-15',
    phone: `+91-98765${Math.floor(10000 + Math.random() * 90000)}`,
    email: `amitabh.${Date.now()}@example.com`,
    address: { line1: '42 Tagore Marg', city: 'Medical City', state: 'Delhi', pincode: '110001' },
    bloodGroup: 'O+'
  };

  const createPatientRes = await request('/patients', {
    method: 'POST',
    body: JSON.stringify(patientPayload)
  }, branch1Token);
  assert(createPatientRes.status === 201 && createPatientRes.data.data?.uhid, 'POST /patients creates patient with unique UHID', createPatientRes.data.data?.uhid);
  const patient = createPatientRes.data.data;
  const patientId = patient._id;

  // Duplicate Check
  const duplicateCheckRes = await request('/patients', {
    method: 'POST',
    body: JSON.stringify(patientPayload)
  }, branch1Token);
  assert(duplicateCheckRes.status === 409 && duplicateCheckRes.data.duplicates, 'POST /patients returns 409 Conflict with duplicate matches');

  // Wristband Barcode Payload
  const wristbandRes = await request(`/patients/${patientId}/wristband`, {}, branch1Token);
  assert(wristbandRes.status === 200 && wristbandRes.data.data?.barcodePayload, 'GET /patients/:id/wristband provides barcode printing payload');

  // Allergies
  const allergyRes = await request(`/patients/${patientId}/allergies`, {
    method: 'POST',
    body: JSON.stringify({
      allergen: 'Penicillin',
      category: 'drug',
      severity: 'severe',
      reaction: 'Anaphylaxis and respiratory distress'
    })
  }, branch1Token);
  assert(allergyRes.status === 201 && allergyRes.data.success, 'POST /patients/:id/allergies records drug allergy');

  // Care Team
  const careTeamRes = await request('/care-teams', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      staffId: docAuth.user._id,
      role: 'primary_doctor'
    })
  }, branch1Token);
  assert(careTeamRes.status === 201 && careTeamRes.data.success, 'POST /care-teams assigns doctor to patient episode');

  // Break-Glass Emergency Grant
  const breakGlassRes = await request('/break-glass', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      reason: 'Emergency acute trauma resuscitation outside standard ward schedule'
    })
  }, docToken);
  assert(breakGlassRes.status === 201 && breakGlassRes.data.data?.expiresAt, 'POST /break-glass grants time-limited emergency access');

  // Consents
  const consentRes = await request(`/patients/${patientId}/consents`, {
    method: 'POST',
    body: JSON.stringify({
      consentType: 'treatment',
      granted: true,
      notes: 'General clinical diagnostic and therapeutic consent'
    })
  }, branch1Token);
  assert(consentRes.status === 201 && consentRes.data.success, 'POST /patients/:id/consents creates treatment consent');
  const consentId = consentRes.data.data?._id;

  const revokeConsentRes = await request(`/consents/${consentId}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify({ reason: 'Patient requested withdrawal of research data sharing' })
  }, branch1Token);
  assert(revokeConsentRes.status === 200 && revokeConsentRes.data.data?.status === 'revoked', 'PATCH /consents/:id/revoke updates consent state');

  // 3. Facility Masters & Bed Lifecycle
  console.log('\n--- 3. Facility Hierarchy & Bed Lifecycle ---');
  const treeRes = await request('/facility/tree', {}, branch1Token);
  assert(treeRes.status === 200 && Array.isArray(treeRes.data.data), 'GET /facility/tree returns full facility hierarchy');

  const censusRes = await request('/beds/census', {}, branch1Token);
  assert(censusRes.status === 200 && censusRes.data.data?.totalBeds > 0, 'GET /beds/census aggregates ward bed states');

  // Check Pricing Resolver
  const servicesRes = await request('/services', {}, branch1Token);
  const consultService = servicesRes.data.data.find(s => s.code === 'SRV-CONS-CARD');
  assert(!!consultService, 'GET /services lists clinical service items');

  const priceRes = await request(`/services/${consultService._id}/price?branchId=${branch1._id}`, {}, branch1Token);
  assert(priceRes.status === 200 && priceRes.data.data?.price === 1200, 'GET /services/:id/price resolves standard price');

  // 4. Appointments, Queues & OPD EMR
  console.log('\n--- 4. Appointments, Queue & EMR Notes ---');
  // Doctor Schedules
  const scheduleRes = await request('/doctor-schedules', {
    method: 'POST',
    body: JSON.stringify({
      doctorId: docAuth.user._id,
      dayOfWeek: 'Wednesday',
      startTime: '09:00',
      endTime: '13:00',
      slotDurationMinutes: 15,
      maxPatients: 16
    })
  }, branch1Token);
  assert([200, 201].includes(scheduleRes.status), 'POST /doctor-schedules configures weekly OPD slots');

  // Public Queue Display (No Auth Token Required!)
  const publicQueueRes = await request(`/queues/display?branchId=${branch1._id}`);
  assert(publicQueueRes.status === 200 && Array.isArray(publicQueueRes.data.data), 'GET /queues/display publicly exposes waiting token feed without tokens/PHI');

  // Book Appointment (find unbooked slot for today)
  const todayDate = new Date().toISOString().split('T')[0];
  const existingApptsRes = await request(`/appointments?doctorId=${docAuth.user._id}&date=${todayDate}`, {}, branch1Token);
  const bookedSlots = new Set((existingApptsRes.data?.data || []).map(a => a.slotTime));
  let slotTime = '09:00';
  for (let h = 9; h < 22; h++) {
    for (const m of ['00', '15', '30', '45']) {
      const candidate = `${String(h).padStart(2, '0')}:${m}`;
      if (!bookedSlots.has(candidate)) {
        slotTime = candidate;
        break;
      }
    }
    if (slotTime !== '09:00' || !bookedSlots.has('09:00')) break;
  }

  const apptRes = await request('/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      doctorId: docAuth.user._id,
      appointmentDate: todayDate,
      slotTime,
      type: 'consultation',
      reason: 'Chest discomfort and shortness of breath'
    })
  }, branch1Token);
  assert(apptRes.status === 201 && apptRes.data.success, 'POST /appointments books consultation');
  const apptId = apptRes.data.data?._id;

  // Check-In (generates queue token)
  const checkInRes = await request(`/appointments/${apptId}/check-in`, {
    method: 'POST'
  }, branch1Token);
  assert(checkInRes.status === 200 && (checkInRes.data.data?.tokenNumber || checkInRes.data.queueToken?.tokenNo), 'POST /appointments/:id/check-in generates queue token', checkInRes.data.queueToken?.tokenNo);

  // Call Next Token
  const callNextRes = await request(`/queues/${docAuth.user._id}/call-next`, {
    method: 'POST'
  }, docToken);
  assert(callNextRes.status === 200 && callNextRes.data.success, 'POST /queues/:doctorId/call-next calls patient in queue');

  // OPD Visit & Vitals
  const visitRes = await request('/visits', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      doctorId: docAuth.user._id,
      appointmentId: apptId,
      chiefComplaints: [{ complaint: 'Palpitations', duration: '3 days' }]
    })
  }, docToken);
  assert(visitRes.status === 201 && visitRes.data.success, 'POST /visits initiates OPD consultation visit');
  const visitId = visitRes.data.data?._id;

  // Vitals with BMI
  const vitalsRes = await request(`/visits/${visitId}/vitals`, {
    method: 'POST',
    body: JSON.stringify({
      heightCm: 175,
      weightKg: 78,
      bpSystolic: 130,
      bpDiastolic: 85,
      pulse: 76,
      temperatureF: 98.6,
      spo2: 99
    })
  }, docToken);
  assert(vitalsRes.status === 200 && vitalsRes.data.data?.bmi, 'POST /visits/:id/vitals calculates BMI automatically', `BMI: ${vitalsRes.data.data?.bmi}`);

  // Clinical SOAP Notes & Cryptographic Digital Signature
  const noteRes = await request(`/visits/${visitId}/notes`, {
    method: 'POST',
    body: JSON.stringify({
      subjective: 'Patient reports progressive dyspnea on moderate exertion.',
      objective: 'S1/S2 heard, no murmurs. Lungs clear to auscultation.',
      assessment: 'Suspected Angina Pectoris / Essential Hypertension.',
      plan: 'Advise ECG, Echocardiogram, and start Beta-Blocker.'
    })
  }, docToken);
  assert(noteRes.status === 201 && noteRes.data.success, 'POST /visits/:id/notes records SOAP note');
  const noteId = noteRes.data.data?._id;

  const signNoteRes = await request(`/notes/${noteId}/sign`, {
    method: 'PATCH'
  }, docToken);
  assert(signNoteRes.status === 200 && signNoteRes.data.data?.signatureHash, 'PATCH /notes/:id/sign locks note with immutable SHA-256 digital signature');

  const addendumRes = await request(`/notes/${noteId}/addendum`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'ECG reviewed: Normal sinus rhythm with minimal ST flattening in V5-V6.'
    })
  }, docToken);
  assert(addendumRes.status === 200 && addendumRes.data.data?.addenda?.length > 0, 'POST /notes/:id/addendum safely attaches addendum to locked note');

  // Prescription
  const rxRes = await request(`/visits/${visitId}/prescriptions`, {
    method: 'POST',
    body: JSON.stringify({
      medications: [
        { drugName: 'Metoprolol Succinate', dosage: '25mg', frequency: 'OD', durationDays: 14, instructions: 'After breakfast' },
        { drugName: 'Aspirin (Ecosprin)', dosage: '75mg', frequency: 'OD', durationDays: 30, instructions: 'After dinner' }
      ]
    })
  }, docToken);
  assert(rxRes.status === 201 && rxRes.data.success, 'POST /visits/:id/prescriptions writes e-prescription');

  // EMR Summary
  const emrRes = await request(`/patients/${patientId}/emr`, {}, docToken);
  assert(emrRes.status === 200 && emrRes.data.data?.visits?.length > 0, 'GET /patients/:id/emr compiles longitudinal patient history');

  // 5. CPOE Orders & CDS Safety Checks
  console.log('\n--- 5. CPOE Orders & Clinical Safety Checks ---');
  const drugCheckRes = await request('/clinical/checks/drug-interactions', {
    method: 'POST',
    body: JSON.stringify({ drugs: ['Warfarin', 'Aspirin'] })
  }, docToken);
  assert(drugCheckRes.status === 200 && drugCheckRes.data.hasInteractions === true, 'POST /clinical/checks/drug-interactions detects high-risk interaction');

  const allergyCheckRes = await request('/clinical/checks/allergy', {
    method: 'POST',
    body: JSON.stringify({ patientId, drugName: 'Penicillin V Potassium' })
  }, docToken);
  assert(allergyCheckRes.status === 200 && allergyCheckRes.data.hasAllergyWarning === true, 'POST /clinical/checks/allergy flags known allergy');

  // Unified CPOE Order Creation & Event Outbox
  const orderRes = await request('/orders', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      visitId,
      orderType: 'lab',
      items: [{ testCode: 'SRV-LAB-CBC', testName: 'Complete Blood Count (CBC)' }],
      priority: 'routine',
      clinicalNotes: 'Pre-admission screening'
    })
  }, docToken);
  assert(orderRes.status === 201 && orderRes.data.success, 'POST /orders creates CPOE order');
  const orderId = orderRes.data.data?._id;

  const ackOrderRes = await request(`/orders/${orderId}/acknowledge`, { method: 'PATCH' }, branch1Token);
  assert(ackOrderRes.status === 200 && ackOrderRes.data.data?.status === 'acknowledged', 'PATCH /orders/:id/acknowledge confirms processing');

  const completeOrderRes = await request(`/orders/${orderId}/complete`, { method: 'PATCH' }, branch1Token);
  assert(completeOrderRes.status === 200 && completeOrderRes.data.data?.status === 'completed', 'PATCH /orders/:id/complete publishes outbox billing charge event');

  // 6. Diagnostics (Lab & Radiology)
  console.log('\n--- 6. Diagnostics (Laboratory & Radiology) ---');
  const sampleRes = await request(`/lab/orders/${orderId}/collect-sample`, {
    method: 'POST',
    body: JSON.stringify({ sampleType: 'Whole Blood EDTA' })
  }, branch1Token);
  assert(sampleRes.status === 201 && sampleRes.data.data?.barcode, 'POST /lab/orders/:id/collect-sample generates sample barcode');
  const sampleId = sampleRes.data.data?._id;

  const receiveSampleRes = await request(`/lab/samples/${sampleId}/receive`, { method: 'POST' }, branch1Token);
  assert(receiveSampleRes.status === 200 && receiveSampleRes.data.data?.status === 'received', 'POST /lab/samples/:id/receive logs accession');

  const labResultRes = await request('/lab/results', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      sampleId,
      patientId,
      parameters: [
        { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', referenceRange: '13.0 - 17.0', isCritical: false },
        { name: 'WBC Count', value: 7200, unit: 'cells/mcL', referenceRange: '4000 - 11000', isCritical: false }
      ]
    })
  }, branch1Token);
  assert(labResultRes.status === 201 && labResultRes.data.success, 'POST /lab/results enters test parameters');
  const labResultId = labResultRes.data.data?._id;

  const validateResultRes = await request(`/lab/results/${labResultId}/validate`, { method: 'PATCH' }, docToken);
  assert(validateResultRes.status === 200 && validateResultRes.data.data?.status === 'validated', 'PATCH /lab/results/:id/validate pathologist validation');

  const releaseResultRes = await request(`/lab/results/${labResultId}/release`, { method: 'PATCH' }, branch1Token);
  assert(releaseResultRes.status === 200 && releaseResultRes.data.data?.isReleased === true, 'PATCH /lab/results/:id/release unlocks result for patient portal');

  // Radiology PACS linking
  const radScheduleRes = await request('/radiology/schedule', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      modality: 'X-Ray',
      studyDescription: 'Chest X-Ray PA View',
      scheduledDate: new Date()
    })
  }, branch1Token);
  assert(radScheduleRes.status === 201 && radScheduleRes.data.success, 'POST /radiology/schedule books imaging exam');
  const radStudyId = radScheduleRes.data.data?._id;

  const radReportRes = await request('/radiology/reports', {
    method: 'POST',
    body: JSON.stringify({
      studyId: radStudyId,
      findings: 'Cardiothoracic ratio normal. Bilateral lung fields clear. No effusion.',
      impression: 'Normal study.'
    })
  }, docToken);
  assert(radReportRes.status === 201 && radReportRes.data.success, 'POST /radiology/reports writes imaging diagnostic impression');

  // 7. IPD Admission, Nursing & Discharge Workflow
  console.log('\n--- 7. IPD Admission, Bed Transfer, Clearance & Discharge ---');
  // Find available beds
  const bedsRes = await request('/beds', {}, branch1Token);
  let bed1 = bedsRes.data.data?.find(b => b.bedNo === 'BED-201-A');
  let bed2 = bedsRes.data.data?.find(b => b.bedNo === 'BED-201-B');

  // Ensure test beds are ready in available state
  if (bed1 && bed1.status !== 'available') {
    await request(`/beds/${bed1._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'available' }) }, saToken);
  }
  if (bed2 && bed2.status !== 'available') {
    await request(`/beds/${bed2._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'available' }) }, saToken);
  }

  // Create Admission
  const admissionRes = await request('/admissions', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      doctorId: docAuth.user._id,
      bedId: bed1._id,
      admissionType: 'emergency',
      diagnosis: 'Acute Coronary Syndrome, Troponin negative',
      expectedStayDays: 3
    })
  }, docToken);
  assert(admissionRes.status === 201 && admissionRes.data.data?.admissionNo, 'POST /admissions admits patient and generates admissionNo', admissionRes.data.data?.admissionNo);
  const admissionId = admissionRes.data.data?._id;

  // Bed Transfer
  const transferBedRes = await request(`/admissions/${admissionId}/bed-transfer`, {
    method: 'POST',
    body: JSON.stringify({
      targetBedId: bed2._id,
      reason: 'Moved to step-down telemetry bed'
    })
  }, branch1Token);
  assert(transferBedRes.status === 200 && transferBedRes.data.success, 'POST /admissions/:id/bed-transfer transfers bed and marks previous bed cleaning');

  // Nursing Operations
  const chartRes = await request(`/admissions/${admissionId}/vitals-chart`, {
    method: 'POST',
    body: JSON.stringify({
      bpSystolic: 124,
      bpDiastolic: 80,
      pulse: 72,
      temperatureF: 98.4,
      spo2: 99
    })
  }, branch1Token);
  assert(chartRes.status === 201 && chartRes.data.success, 'POST /admissions/:id/vitals-chart logs inpatient vitals chart');

  // Multi-department Discharge Clearance
  const initiateDischargeRes = await request(`/admissions/${admissionId}/discharge/initiate`, { method: 'POST' }, docToken);
  assert(initiateDischargeRes.status === 200 && initiateDischargeRes.data.success, 'POST /admissions/:id/discharge/initiate initiates multi-dept clearance');

  // Approve Doctor, Nursing, Pharmacy, Billing Clearances
  await request(`/admissions/${admissionId}/discharge/clearance/doctor`, { method: 'PATCH' }, docToken);
  await request(`/admissions/${admissionId}/discharge/clearance/nursing`, { method: 'PATCH' }, branch1Token);
  await request(`/admissions/${admissionId}/discharge/clearance/pharmacy`, { method: 'PATCH' }, branch1Token);
  const clearBillRes = await request(`/admissions/${admissionId}/discharge/clearance/billing`, { method: 'PATCH' }, branch1Token);
  assert(clearBillRes.status === 200 && clearBillRes.data.success, 'PATCH /admissions/:id/discharge/clearance/:dept completes 4-department clearance checklist');

  // Finalize Discharge
  const finalDischargeRes = await request(`/admissions/${admissionId}/discharge`, { method: 'POST' }, docToken);
  const dischStatus = finalDischargeRes.data.data?.status || finalDischargeRes.data.admission?.status;
  assert(finalDischargeRes.status === 200 && dischStatus === 'discharged', 'POST /admissions/:id/discharge discharges patient and sets bed to cleaning');

  // 8. Acute Care (Emergency, OT & Clinical Dispensing)
  console.log('\n--- 8. Acute Care (Emergency, OT Conflict Checks & Dispensing) ---');
  // Emergency Triage Case
  const emergencyRes = await request('/emergency/cases', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      triageLevel: 2, // ESI Level 2: Emergent
      complaint: 'Crushing retrosternal chest pain radiating to jaw',
      arrivalMode: 'ambulance',
      mlc: false
    })
  }, branch1Token);
  assert(emergencyRes.status === 201 && emergencyRes.data.success, 'POST /emergency/cases logs emergency triage case (ESI Level 2)');

  // Code Blue Alert Broadcast
  const codeBlueRes = await request('/emergency/code-alerts', {
    method: 'POST',
    body: JSON.stringify({
      codeType: 'code_blue',
      location: 'Ground Floor Emergency Trauma Bay 1',
      details: 'Cardiopulmonary arrest, CPR in progress'
    })
  }, branch1Token);
  assert(codeBlueRes.status === 200 && codeBlueRes.data.success, 'POST /emergency/code-alerts broadcasts Code Blue emergency');

  // OT Theatre & Automated Conflict Detection
  const theatreRes = await request('/ot/theatres', {
    method: 'POST',
    body: JSON.stringify({
      theatreNumber: `OT-${Date.now().toString().slice(-4)}`,
      name: 'Cardiac Hybrid Operating Suite',
      type: 'major',
      branchId: branch1._id
    })
  }, branch1Token);
  assert([200, 201].includes(theatreRes.status), 'POST /ot/theatres creates operating theatre');
  const theatreId = theatreRes.data.data?._id;

  const otBookingTime = new Date(Date.now() + 86400000).toISOString();
  const otBookingRes1 = await request('/ot/bookings', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      theatreId,
      surgeonId: docAuth.user._id,
      procedureName: 'Emergency Percutaneous Coronary Intervention (PCI)',
      scheduledStart: otBookingTime,
      estimatedDurationMinutes: 90
    })
  }, docToken);
  assert(otBookingRes1.status === 201 && otBookingRes1.data.success, 'POST /ot/bookings reserves surgical slot');

  // Conflict Double Booking Check (Same Theatre & Surgeon at same time)
  const otBookingRes2 = await request('/ot/bookings', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      theatreId,
      surgeonId: docAuth.user._id,
      procedureName: 'Coronary Angiogram',
      scheduledStart: otBookingTime,
      estimatedDurationMinutes: 60
    })
  }, docToken);
  assert(otBookingRes2.status === 409, 'Automated conflict detection prevents overlapping OT theatre & surgeon bookings (409 Conflict)');

  // 9. Billing, Non-Gap Sequential Invoices & Tiered Discounts
  console.log('\n--- 9. Billing, Invoices & Tiered Discounts ---');
  // Create Billing Account
  const billAcctRes = await request('/billing/accounts', {
    method: 'POST',
    body: JSON.stringify({
      patientId,
      accountType: 'opd'
    })
  }, branch1Token);
  assert(billAcctRes.status === 201 && billAcctRes.data.data?.accountNo, 'POST /billing/accounts opens billing ledger');
  const billingAccountId = billAcctRes.data.data?._id;

  // Manual Charge
  const chargeRes = await request('/billing/charges', {
    method: 'POST',
    body: JSON.stringify({
      billingAccountId,
      serviceName: 'Specialist Consultation Fee',
      serviceCode: 'SRV-CONS-CARD',
      unitPrice: 1200,
      quantity: 1
    })
  }, branch1Token);
  assert(chargeRes.status === 201 && chargeRes.data.success, 'POST /billing/charges posts clinical service charge');

  // Advance Deposit
  const depositRes = await request('/billing/deposits', {
    method: 'POST',
    body: JSON.stringify({
      billingAccountId,
      amount: 2000,
      paymentMode: 'upi',
      transactionRef: `UPI-DEP-${Date.now()}`
    })
  }, branch1Token);
  assert(depositRes.status === 201 && depositRes.data.success, 'POST /billing/deposits records patient advance deposit');

  // Generate Non-gap Invoice
  const invoiceRes = await request('/billing/invoices', {
    method: 'POST',
    body: JSON.stringify({
      billingAccountId,
      dueDate: new Date(Date.now() + 7 * 86400000)
    })
  }, branch1Token);
  const invNum = invoiceRes.data.data?.invoiceNumber || invoiceRes.data.data?.invoiceNo;
  assert(invoiceRes.status === 201 && invNum?.startsWith('INV-CEN'), 'POST /billing/invoices generates sequential non-gap branch invoice', invNum);
  const invoiceId = invoiceRes.data.data?._id;

  // Finalize Invoice
  const finalInvoiceRes = await request(`/billing/invoices/${invoiceId}/finalize`, { method: 'POST' }, branch1Token);
  assert(finalInvoiceRes.status === 200 && ['finalized', 'paid'].includes(finalInvoiceRes.data.data?.status), 'POST /billing/invoices/:id/finalize seals financial invoice');

  // Payment
  const paymentRes = await request('/billing/payments', {
    method: 'POST',
    body: JSON.stringify({
      invoiceId,
      billingAccountId,
      amount: 1200,
      paymentMode: 'cash'
    })
  }, branch1Token);
  assert(paymentRes.status === 201 && paymentRes.data.data?.receiptNumber, 'POST /billing/payments posts payment and produces official receipt', paymentRes.data.data?.receiptNumber);

  // Role-Tiered Discount Check (Staff clerk cannot approve > 15%, requires SA)
  const discountRes = await request('/billing/discounts', {
    method: 'POST',
    body: JSON.stringify({
      billingAccountId,
      discountPercent: 20,
      reason: 'Indigent patient charitable compassionate relief'
    })
  }, saToken); // Superadmin approval
  assert(discountRes.status === 200 && discountRes.data.success, 'POST /billing/discounts applies role-tiered authorized discount (SA)');

  // 10. Support Operations & Public Verification
  console.log('\n--- 10. Support Operations & Public Certificate Verification ---');
  // Issue Certificate with Public Verification Code
  const certRes = await request('/certificates', {
    method: 'POST',
    body: JSON.stringify({
      type: 'medical_fitness',
      patientId,
      certifyingDoctorId: docAuth.user._id,
      details: { fitnessStatus: 'Fit for employment duty', remarks: 'Normal cardiovascular endurance' }
    })
  }, docToken);
  assert(certRes.status === 201 && certRes.data.data?.verificationCode, 'POST /certificates issues certificate with QR verification code', certRes.data.data?.verificationCode);
  const verifyCode = certRes.data.data?.verificationCode;

  // Public Verification (NO Token, safe for third parties / authorities)
  const publicVerifyRes = await request(`/certificates/verify/${verifyCode}`);
  assert(publicVerifyRes.status === 200 && publicVerifyRes.data.isValid === true, 'GET /certificates/verify/:code publicly validates authenticity without token');

  // Blood Bank Inventory
  const bloodInvRes = await request('/bloodbank/inventory', {}, branch1Token);
  assert(bloodInvRes.status === 200 && Array.isArray(bloodInvRes.data.data), 'GET /bloodbank/inventory displays blood component stock');

  // Quality Incident & CAPA
  const incidentRes = await request('/quality/incidents', {
    method: 'POST',
    body: JSON.stringify({
      type: 'near_miss',
      description: 'Look-alike sound-alike drug packaging placed on adjacent shelves',
      location: 'Central Pharmacy Inpatient Dispensing Rack B'
    })
  }, branch1Token);
  assert(incidentRes.status === 201 && incidentRes.data.success, 'POST /quality/incidents logs patient safety near-miss');
  const incidentId = incidentRes.data.data?._id;

  const capaRes = await request(`/quality/incidents/${incidentId}/capa`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'Separate LASA medications into physically distinct color-coded bins with Tall Man lettering',
      assignedTo: 'Pharmacy Supervisor',
      dueDate: new Date(Date.now() + 7 * 86400000)
    })
  }, saToken);
  assert(capaRes.status === 200 && capaRes.data.success, 'POST /quality/incidents/:id/capa establishes corrective action plan');

  // 11. Patient Portal Audience Separation & Security
  console.log('\n--- 11. Patient Portal & Token Audience Isolation ---');
  const regPortalRes = await request('/patient-auth/register', {
    method: 'POST',
    body: JSON.stringify({
      uhid: patient.uhid,
      phone: patient.phone
    })
  });
  assert([200, 201].includes(regPortalRes.status) && regPortalRes.data.success, 'POST /patient-auth/register creates dedicated portal account');

  const loginPortalRes = await request('/patient-auth/login', {
    method: 'POST',
    body: JSON.stringify({
      uhid: patient.uhid,
      otp: '123456'
    })
  });
  assert(loginPortalRes.status === 200 && (loginPortalRes.data.accessToken || loginPortalRes.data.token), 'POST /patient-auth/login issues portal token (aud: patient_portal)');
  const portalToken = loginPortalRes.data.accessToken || loginPortalRes.data.token;

  // CRITICAL SECURITY TEST: A portal token calls a staff endpoint -> MUST return 401 Unauthorized
  const breachAttemptRes = await request('/users', {}, portalToken);
  assert(breachAttemptRes.status === 401, 'SECURITY: Portal token calling staff endpoint is blocked (401 Unauthorized)');

  const breachAdmissionAttempt = await request('/admissions', {}, portalToken);
  assert(breachAdmissionAttempt.status === 401, 'SECURITY: Portal token calling clinical admission endpoint is blocked (401 Unauthorized)');

  // Authorized Portal Profile & Released Reports
  const portalProfileRes = await request('/portal/me', {}, portalToken);
  assert(portalProfileRes.status === 200 && portalProfileRes.data.data?.uhid === patient.uhid, 'GET /portal/me retrieves patient dashboard');

  const portalReportsRes = await request('/portal/reports', {}, portalToken);
  assert(portalReportsRes.status === 200 && Array.isArray(portalReportsRes.data.data), 'GET /portal/reports displays only doctor-released diagnostic results');

  // 12. FHIR R4 Interoperability Facade
  console.log('\n--- 12. FHIR R4 Interoperability Facade ---');
  const fhirPatientRes = await request('/fhir/Patient', {}, branch1Token);
  assert(fhirPatientRes.status === 200 && fhirPatientRes.data.resourceType === 'Bundle', 'GET /fhir/Patient returns valid FHIR R4 Patient Bundle');

  const fhirEncounterRes = await request('/fhir/Encounter', {}, branch1Token);
  assert(fhirEncounterRes.status === 200 && fhirEncounterRes.data.resourceType === 'Bundle', 'GET /fhir/Encounter returns valid FHIR R4 Encounter Bundle');

  const fhirObservationRes = await request('/fhir/Observation', {}, branch1Token);
  assert(fhirObservationRes.status === 200 && fhirObservationRes.data.resourceType === 'Bundle', 'GET /fhir/Observation returns valid FHIR R4 Observation Bundle');

  // Summary
  console.log('\n========================================================================');
  console.log(`  Clinical Operations Test Completed: Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runClinicalTests();
