const mongoose = require('mongoose');

const supplyItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    category: {
      type: String,
      enum: ['cleaning', 'linens', 'stationery', 'cafeteria_consumables', 'sanitation', 'ppe', 'other'],
      default: 'cleaning'
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      default: 'pieces' // e.g. pieces, liters, boxes, packs
    },
    reorderLevel: {
      type: Number,
      default: 20
    },
    costPerUnit: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

supplyItemSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SupplyItem', supplyItemSchema);
