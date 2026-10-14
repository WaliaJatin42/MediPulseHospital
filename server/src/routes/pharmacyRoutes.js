const express = require('express');
const {
  createMedicine,
  getMedicines,
  updateMedicine,
  deleteMedicine,
  receiveStockBatch,
  getStockBatches,
  dispenseMedicine,
  getLowStockAlerts,
  getExpiringAlerts,
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  getPurchaseOrders,
  approvePurchaseOrder,
  recordReturn,
  recordWastage,
  getControlledSubstancesLog
} = require('../controllers/pharmacyController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/pharmacy/medicines:
 *   post:
 *     summary: Add medicine to pharmacy catalog (Pharmacy Admin only)
 *     tags: [Pharmacy Module]
 *   get:
 *     summary: List medicines catalog
 *     tags: [Pharmacy Module]
 */
router.route('/medicines')
  .post(authorize('superadmin', 'admin'), createMedicine)
  .get(getMedicines);

router.route('/medicines/:id')
  .patch(authorize('superadmin', 'admin'), updateMedicine)
  .delete(authorize('superadmin', 'admin'), deleteMedicine);

/**
 * @openapi
 * /api/v1/pharmacy/stock:
 *   post:
 *     summary: Receive stock batch (with batchNo, expiryDate, quantity, cost)
 *     tags: [Pharmacy Module]
 *   get:
 *     summary: List stock batches
 *     tags: [Pharmacy Module]
 */
router.route('/stock')
  .post(authorize('superadmin', 'admin', 'supervisor'), receiveStockBatch)
  .get(getStockBatches);

/**
 * @openapi
 * /api/v1/pharmacy/dispense:
 *   post:
 *     summary: Dispense medicine (deducts stock, logs who dispensed)
 *     tags: [Pharmacy Module]
 */
router.post('/dispense', authorize('superadmin', 'admin', 'supervisor', 'user'), dispenseMedicine);

/**
 * @openapi
 * /api/v1/pharmacy/alerts/low-stock:
 *   get:
 *     summary: Get low stock alerts below reorder level
 *     tags: [Pharmacy Module]
 */
router.get('/alerts/low-stock', getLowStockAlerts);

/**
 * @openapi
 * /api/v1/pharmacy/alerts/expiring:
 *   get:
 *     summary: Get expiring stock batches within 90 days
 *     tags: [Pharmacy Module]
 */
router.get('/alerts/expiring', getExpiringAlerts);

/**
 * @openapi
 * /api/v1/pharmacy/suppliers:
 *   post:
 *     summary: Add medicine supplier
 *     tags: [Pharmacy Module]
 *   get:
 *     summary: List suppliers
 *     tags: [Pharmacy Module]
 */
router.route('/suppliers')
  .post(authorize('superadmin', 'admin'), createSupplier)
  .get(getSuppliers);

/**
 * @openapi
 * /api/v1/pharmacy/purchase-orders:
 *   post:
 *     summary: Create procurement purchase order
 *     tags: [Pharmacy Module]
 *   get:
 *     summary: List purchase orders
 *     tags: [Pharmacy Module]
 */
router.route('/purchase-orders')
  .post(authorize('superadmin', 'admin', 'supervisor'), createPurchaseOrder)
  .get(getPurchaseOrders);

router.patch('/purchase-orders/:id/approve', authorize('superadmin', 'admin'), approvePurchaseOrder);

/**
 * @openapi
 * /api/v1/pharmacy/returns:
 *   post:
 *     summary: Record medication return to vendor
 *     tags: [Pharmacy Module]
 */
router.post('/returns', authorize('superadmin', 'admin', 'supervisor'), recordReturn);

/**
 * @openapi
 * /api/v1/pharmacy/wastage:
 *   post:
 *     summary: Record damaged or expired medicine wastage
 *     tags: [Pharmacy Module]
 */
router.post('/wastage', authorize('superadmin', 'admin', 'supervisor'), recordWastage);

/**
 * @openapi
 * /api/v1/pharmacy/controlled-log:
 *   get:
 *     summary: Controlled substances register (Pharmacy Admin audit log)
 *     tags: [Pharmacy Module]
 */
router.get('/controlled-log', authorize('superadmin', 'admin'), getControlledSubstancesLog);

module.exports = router;
