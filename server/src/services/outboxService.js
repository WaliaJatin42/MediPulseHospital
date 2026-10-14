const OutboxEvent = require('../models/system/OutboxEvent');
const logger = require('../utils/logger');

/**
 * Publish an outbox event
 */
const publishEvent = async (eventType, aggregateType, aggregateId, payload, branchId = null) => {
  try {
    const event = await OutboxEvent.create({
      eventType,
      aggregateType,
      aggregateId: aggregateId.toString(),
      payload,
      branchId,
      status: 'pending'
    });

    // Process event asynchronously
    setImmediate(() => processEvent(event._id));
    return event;
  } catch (error) {
    logger.error(`[Outbox Publish Error] ${error.message}`);
    throw error;
  }
};

/**
 * Event consumer processor (Idempotent)
 */
const processEvent = async (eventId) => {
  try {
    const event = await OutboxEvent.findById(eventId);
    if (!event || event.status === 'processed') return;

    const { eventType, payload, branchId } = event;

    switch (eventType) {
      case 'order_completed': {
        // Automatically post charge to BillingAccount if billable
        const BillingCharge = require('../models/billing/BillingCharge');
        const BillingAccount = require('../models/billing/BillingAccount');

        if (payload.billingAccountId && payload.amount) {
          const account = await BillingAccount.findById(payload.billingAccountId);
          if (account && account.status === 'open') {
            await BillingCharge.create({
              billingAccountId: account._id,
              patientId: payload.patientId,
              branchId: branchId || account.branchId,
              serviceId: payload.serviceId || null,
              serviceName: payload.serviceName || 'Clinical Service / Order',
              department: payload.department || 'clinical',
              rate: payload.amount,
              quantity: payload.quantity || 1,
              totalAmount: payload.amount * (payload.quantity || 1),
              sourceType: 'order',
              sourceId: event.aggregateId,
              status: 'posted'
            });

            account.totalCharges = (account.totalCharges || 0) + payload.amount * (payload.quantity || 1);
            account.netAmount = account.totalCharges - (account.totalDiscounts || 0);
            account.balanceDue = account.netAmount - (account.totalPaid || 0);
            await account.save();
          }
        }
        break;
      }

      case 'admission_created': {
        // Bed set to occupied, billing account opened
        const Bed = require('../models/facility/Bed');
        const BillingAccount = require('../models/billing/BillingAccount');

        if (payload.bedId) {
          await Bed.findByIdAndUpdate(payload.bedId, { status: 'occupied', currentAdmissionId: event.aggregateId });
        }

        // Open billing account if not already created
        const existingAccount = await BillingAccount.findOne({ admissionId: event.aggregateId });
        if (!existingAccount) {
          await BillingAccount.create({
            patientId: payload.patientId,
            admissionId: event.aggregateId,
            branchId: branchId || payload.branchId,
            accountType: 'ipd',
            status: 'open'
          });
        }
        break;
      }

      case 'discharge_completed': {
        // Set bed to cleaning and notify Housekeeping/Support
        const Bed = require('../models/facility/Bed');
        if (payload.bedId) {
          await Bed.findByIdAndUpdate(payload.bedId, {
            status: 'cleaning',
            currentAdmissionId: null
          });
        }
        break;
      }

      default:
        logger.info(`[Outbox Service] Handled event ${eventType} for aggregate ${event.aggregateId}`);
        break;
    }

    event.status = 'processed';
    event.processedAt = new Date();
    await event.save();
  } catch (err) {
    logger.error(`[Outbox Process Error] Event ${eventId}: ${err.message}`);
    await OutboxEvent.findByIdAndUpdate(eventId, {
      status: 'failed',
      error: err.message,
      $inc: { retryCount: 1 }
    });
  }
};

module.exports = {
  publishEvent,
  processEvent
};
