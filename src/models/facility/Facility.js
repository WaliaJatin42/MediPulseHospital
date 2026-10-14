const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const Building = mongoose.model('Building', buildingSchema);

const floorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    floorNumber: { type: Number, required: true },
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const Floor = mongoose.model('Floor', floorSchema);

const wardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    department: { type: String, default: 'general' },
    isIcu: { type: Boolean, default: false },
    genderRestriction: { type: String, enum: ['male', 'female', 'none'], default: 'none' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const Ward = mongoose.model('Ward', wardSchema);

const roomTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    baseDailyRate: { type: Number, required: true, default: 1500 },
    isIcu: { type: Boolean, default: false },
    isIsolation: { type: Boolean, default: false },
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

const RoomType = mongoose.model('RoomType', roomTypeSchema);

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true },
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    status: { type: String, enum: ['active', 'maintenance'], default: 'active' }
  },
  { timestamps: true }
);

const Room = mongoose.model('Room', roomSchema);

const bedSchema = new mongoose.Schema(
  {
    bedNo: { type: String, required: true, trim: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    type: {
      type: String,
      enum: ['general', 'semi_private', 'private', 'icu', 'isolation', 'nicu'],
      default: 'general'
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'],
      default: 'available',
      index: true
    },
    currentAdmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null
    },
    equipment: [{ type: String }],
    isolation: { type: Boolean, default: false },
    lastCleanedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

bedSchema.index({ wardId: 1, status: 1 });
bedSchema.index({ branchId: 1, bedNo: 1 }, { unique: true });

const Bed = mongoose.model('Bed', bedSchema);

module.exports = {
  Building,
  Floor,
  Ward,
  RoomType,
  Room,
  Bed
};
