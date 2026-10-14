const {
  LabSample,
  LabResult,
  RadiologyStudy,
  RadiologyReport
} = require('../models/clinical/DiagnosticModels');
const CpoeOrder = require('../models/clinical/CpoeOrder');
const logger = require('../utils/logger');

// Generate Unique Barcode
function generateSampleBarcode() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SMP-${timestamp}-${random}`;
}

// ----------------- LABORATORY -----------------

// Collect Sample
const collectSample = async (req, res, next) => {
  try {
    const order = await CpoeOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Lab order not found' });

    const { sampleType = 'EDTA Whole Blood' } = req.body;
    const barcode = generateSampleBarcode();

    const sample = await LabSample.create({
      barcode,
      orderId: order._id,
      patientId: order.patientId,
      branchId: req.branchId,
      sampleType,
      collectedBy: req.user._id,
      status: 'collected'
    });

    res.status(201).json({
      success: true,
      message: `Sample collected. Barcode label generated: ${barcode}`,
      data: sample
    });
  } catch (err) {
    next(err);
  }
};

// Receive Sample in Lab
const receiveSample = async (req, res, next) => {
  try {
    const sample = await LabSample.findByIdAndUpdate(
      req.params.id,
      { status: 'received', receivedBy: req.user._id, receivedAt: new Date() },
      { new: true }
    );
    if (!sample) return res.status(404).json({ success: false, message: 'Sample not found' });
    res.status(200).json({ success: true, message: 'Sample received in laboratory', data: sample });
  } catch (err) {
    next(err);
  }
};

// Lab Worklist
const getLabWorklist = async (req, res, next) => {
  try {
    const filter = req.branchFilter({});
    if (req.query.status) filter.status = req.query.status;

    const list = await LabSample.find(filter)
      .populate('patientId', 'uhid firstName lastName gender age')
      .populate('orderId', 'orderNo items priority')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

// Enter Lab Results
const enterLabResult = async (req, res, next) => {
  try {
    const { sampleId, orderId, patientId, testName, testCode, parameterResults, parameters } = req.body;

    let resolvedTestName = testName;
    if (!resolvedTestName && orderId) {
      const ord = await CpoeOrder.findById(orderId);
      resolvedTestName = ord?.items?.[0]?.testName || ord?.items?.[0]?.name || 'Laboratory Test';
    }
    if (!resolvedTestName) resolvedTestName = 'Laboratory Test';

    const rawParams = parameterResults || parameters || [];
    const formattedParams = rawParams.map((p) => ({
      parameter: p.parameter || p.name || 'Parameter',
      name: p.name || p.parameter || 'Parameter',
      value: String(p.value),
      unit: p.unit || '',
      referenceRange: p.referenceRange || '',
      isAbnormal: !!p.isAbnormal,
      isCritical: !!p.isCritical
    }));

    const hasCritical = formattedParams.some((p) => p.isCritical);

    const result = await LabResult.create({
      sampleId,
      orderId: orderId || null,
      patientId,
      branchId: req.branchId,
      testName: resolvedTestName,
      testCode: testCode || '',
      parameterResults: formattedParams,
      enteredBy: req.user._id,
      status: 'entered'
    });

    if (hasCritical) {
      logger.warn(`[CRITICAL LAB ALERT] Patient ${patientId} has critical abnormal result in ${resolvedTestName}`);
    }

    res.status(201).json({
      success: true,
      message: hasCritical ? 'Results saved. CRITICAL VALUE ALERT TRIGGERED!' : 'Lab results entered successfully',
      data: result,
      criticalAlert: hasCritical
    });
  } catch (err) {
    next(err);
  }
};

// Validate Lab Result (Pathologist)
const validateLabResult = async (req, res, next) => {
  try {
    const result = await LabResult.findByIdAndUpdate(
      req.params.id,
      {
        status: 'validated',
        validatedBy: req.user._id,
        validatedAt: new Date()
      },
      { new: true }
    );

    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });

    res.status(200).json({ success: true, message: 'Lab result validated by pathologist', data: result });
  } catch (err) {
    next(err);
  }
};

// Release Lab Result to Patient Portal
const releaseLabResult = async (req, res, next) => {
  try {
    const result = await LabResult.findByIdAndUpdate(
      req.params.id,
      { status: 'released', releasedToPortal: true, isReleased: true },
      { new: true }
    );
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });
    const resultObj = result.toObject();
    resultObj.isReleased = true;
    res.status(200).json({ success: true, message: 'Result released to patient portal and EMR', data: resultObj });
  } catch (err) {
    next(err);
  }
};

// Acknowledge Critical Alert
const acknowledgeCriticalAlert = async (req, res, next) => {
  try {
    const result = await LabResult.findByIdAndUpdate(
      req.params.id,
      {
        criticalAlertAcknowledged: true,
        criticalAckBy: req.user._id,
        criticalAckAt: new Date()
      },
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Critical alert acknowledged by doctor/nurse', data: result });
  } catch (err) {
    next(err);
  }
};

// ----------------- RADIOLOGY -----------------

// Schedule Radiology Study
const scheduleRadiologyStudy = async (req, res, next) => {
  try {
    const { orderId, patientId, examName, studyDescription, modality, screeningChecklist } = req.body;
    const resolvedExamName = examName || studyDescription || 'Radiology Examination';

    const study = await RadiologyStudy.create({
      orderId: orderId || null,
      patientId,
      branchId: req.branchId,
      examName: resolvedExamName,
      modality: modality || 'X-Ray',
      screeningChecklist: screeningChecklist || {},
      status: 'scheduled',
      technicianId: req.user._id
    });

    res.status(201).json({ success: true, message: 'Radiology exam scheduled', data: study });
  } catch (err) {
    next(err);
  }
};

// Radiology Worklist
const getRadiologyWorklist = async (req, res, next) => {
  try {
    const filter = req.branchFilter({});
    if (req.query.modality) filter.modality = req.query.modality;
    if (req.query.status) filter.status = req.query.status;

    const list = await RadiologyStudy.find(filter)
      .populate('patientId', 'uhid firstName lastName age gender')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

// Complete Radiology Exam & Log Dose
const completeRadiologyExam = async (req, res, next) => {
  try {
    const { pacsStudyUid, radiationDoseMgy } = req.body;
    const study = await RadiologyStudy.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        pacsStudyUid: pacsStudyUid || `PACS-UID-${Date.now()}`,
        viewerUrl: `https://pacs.medipulse.hospital/viewer?studyUid=${pacsStudyUid || Date.now()}`,
        radiationDoseMgy: radiationDoseMgy || 0
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Radiology study completed and linked to PACS', data: study });
  } catch (err) {
    next(err);
  }
};

// Draft and Sign Radiology Report
const createRadiologyReport = async (req, res, next) => {
  try {
    const { studyId, patientId, findings, impression, isCritical } = req.body;
    let resolvedPatientId = patientId;
    if (!resolvedPatientId && studyId) {
      const std = await RadiologyStudy.findById(studyId);
      resolvedPatientId = std?.patientId;
    }

    const report = await RadiologyReport.create({
      studyId,
      patientId: resolvedPatientId,
      branchId: req.branchId,
      radiologistId: req.user._id,
      findings,
      impression,
      isCritical: !!isCritical,
      isSigned: true,
      signedAt: new Date(),
      releasedToPortal: true
    });

    await RadiologyStudy.findByIdAndUpdate(studyId, { status: 'reported' });

    res.status(201).json({ success: true, message: 'Radiology report signed and released to portal', data: report });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  collectSample,
  receiveSample,
  getLabWorklist,
  enterLabResult,
  validateLabResult,
  releaseLabResult,
  acknowledgeCriticalAlert,
  scheduleRadiologyStudy,
  getRadiologyWorklist,
  completeRadiologyExam,
  createRadiologyReport
};
