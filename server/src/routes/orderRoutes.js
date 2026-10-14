const express = require('express');
const {
  createOrder,
  getOrders,
  getOrderById,
  acknowledgeOrder,
  completeOrder,
  cancelOrder,
  checkDrugInteractions,
  checkAllergyWarning,
  checkDuplicateOrder
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

router.use(['/orders', '/clinical'], protect, branchContext);

// Unified CPOE Orders
router.route('/orders')
  .post(createOrder)
  .get(getOrders);

router.route('/orders/:id')
  .get(getOrderById);

router.patch('/orders/:id/acknowledge', acknowledgeOrder);
router.patch('/orders/:id/complete', completeOrder);
router.patch('/orders/:id/cancel', cancelOrder);

// Clinical Decision Support (CDS) Safety Checks
router.post('/clinical/checks/drug-interactions', checkDrugInteractions);
router.post('/clinical/checks/allergy', checkAllergyWarning);
router.post('/clinical/checks/duplicate-order', checkDuplicateOrder);

module.exports = router;
