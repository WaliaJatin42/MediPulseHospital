const express = require('express');
const {
  createBloodDonor,
  recordBloodDonation,
  getBloodInventory,
  createDietOrder,
  getKitchenList,
  deliverDietOrder,
  requestAmbulance,
  updateAmbulanceStatus,
  updateAmbulanceLocation,
  issueCertificate,
  verifyCertificate,
  createStoreItem,
  getStoreItems,
  getReorderAlerts,
  reportQualityIncident,
  addCapaAction
} = require('../controllers/supportOpsController');
const { protect } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

// Public Verification Endpoint (e.g. for police, employers, or border control)
router.get('/certificates/verify/:code', verifyCertificate);

const supportOpsProtectedPaths = [
  '/bloodbank', '/diet', '/ambulance', '/certificates', '/stores', '/quality'
];
router.use(supportOpsProtectedPaths, protect, branchContext);

// Blood Bank
router.route('/bloodbank/donors')
  .post(createBloodDonor);
router.post('/bloodbank/donations', recordBloodDonation);
router.get('/bloodbank/inventory', getBloodInventory);

// Dietary
router.post('/diet/orders', createDietOrder);
router.get('/diet/kitchen-list', getKitchenList);
router.patch('/diet/orders/:id/delivered', deliverDietOrder);

// Ambulance
router.post('/ambulance/requests', requestAmbulance);
router.patch('/ambulance/trips/:id/status', updateAmbulanceStatus);
router.post('/ambulance/trips/:id/location', updateAmbulanceLocation);

// Certificates
router.post('/certificates', issueCertificate);

// Stores & Procurement
router.route('/stores/items')
  .post(createStoreItem)
  .get(getStoreItems);
router.get('/stores/alerts/reorder', getReorderAlerts);

// Quality & Incidents
router.post('/quality/incidents', reportQualityIncident);
router.post('/quality/incidents/:id/capa', addCapaAction);

module.exports = router;
