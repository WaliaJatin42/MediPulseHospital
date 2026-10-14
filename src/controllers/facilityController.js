const { Building, Floor, Ward, RoomType, Room, Bed } = require('../models/facility/Facility');
const { Specialty, DoctorProfile, IcdCode, ServiceItem, Tariff, Payer } = require('../models/clinical/ClinicalMasters');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Get facility tree hierarchy (Building -> Floor -> Ward -> Room -> Bed)
// @route   GET /api/v1/facility/tree
// @access  Private
const getFacilityTree = async (req, res, next) => {
  try {
    const filter = req.branchFilter({});

    const [buildings, floors, wards, rooms, beds] = await Promise.all([
      Building.find(filter),
      Floor.find(filter),
      Ward.find(filter),
      Room.find(filter).populate('roomTypeId'),
      Bed.find(filter)
    ]);

    // Build nested tree structure
    const tree = buildings.map((b) => {
      const bFloors = floors.filter((f) => f.buildingId.toString() === b._id.toString()).map((f) => {
        const fWards = wards.filter((w) => w.floorId.toString() === f._id.toString()).map((w) => {
          const wRooms = rooms.filter((r) => r.wardId.toString() === w._id.toString()).map((r) => {
            const rBeds = beds.filter((bed) => bed.roomId.toString() === r._id.toString());
            return { ...r.toObject(), beds: rBeds };
          });
          return { ...w.toObject(), rooms: wRooms };
        });
        return { ...f.toObject(), wards: fWards };
      });
      return { ...b.toObject(), floors: bFloors };
    });

    res.status(200).json({ success: true, count: tree.length, data: tree });
  } catch (error) {
    logger.error(`[Facility Tree Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get bed census statistics (occupied, free, cleaning by ward)
// @route   GET /api/v1/beds/census
// @access  Private
const getBedCensus = async (req, res, next) => {
  try {
    const filter = req.branchFilter({});
    const beds = await Bed.find(filter).populate('wardId', 'name isIcu code');

    const censusByWard = {};
    let totalAvailable = 0;
    let totalOccupied = 0;
    let totalCleaning = 0;
    let totalMaintenance = 0;

    beds.forEach((bed) => {
      const wardName = bed.wardId?.name || 'Unassigned';
      if (!censusByWard[wardName]) {
        censusByWard[wardName] = { available: 0, occupied: 0, cleaning: 0, maintenance: 0, total: 0 };
      }

      censusByWard[wardName].total++;
      if (bed.status === 'available') {
        censusByWard[wardName].available++;
        totalAvailable++;
      } else if (bed.status === 'occupied') {
        censusByWard[wardName].occupied++;
        totalOccupied++;
      } else if (bed.status === 'cleaning') {
        censusByWard[wardName].cleaning++;
        totalCleaning++;
      } else {
        censusByWard[wardName].maintenance++;
        totalMaintenance++;
      }
    });

    const summary = {
      totalBeds: beds.length,
      available: totalAvailable,
      occupied: totalOccupied,
      cleaning: totalCleaning,
      maintenance: totalMaintenance,
      occupancyRate: beds.length > 0 ? `${((totalOccupied / beds.length) * 100).toFixed(1)}%` : '0%'
    };

    res.status(200).json({
      success: true,
      summary,
      data: {
        totalBeds: beds.length,
        ...summary,
        censusByWard
      },
      censusByWard
    });
  } catch (error) {
    logger.error(`[Bed Census Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update bed status with lifecycle permissions (cleaning -> available only by Support/Nursing)
// @route   PATCH /api/v1/beds/:id/status
// @access  Private (Support, Nursing, SA)
const updateBedStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const bed = await Bed.findById(req.params.id);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    // Business Rule: Transition from cleaning to available allowed only by Support or Nursing after cleaning
    if (bed.status === 'cleaning' && status === 'available') {
      const allowedDepts = ['support', 'nursing', 'technical'];
      if (req.user.role !== 'superadmin' && !allowedDepts.includes(req.user.department?.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: 'Only Support (Housekeeping) or Nursing staff can mark a cleaned bed as available.'
        });
      }
      bed.lastCleanedAt = new Date();
    }

    bed.status = status;
    await bed.save();

    res.status(200).json({ success: true, message: `Bed status changed to ${status}`, data: bed });
  } catch (error) {
    logger.error(`[Update Bed Status Error] ${error.message}`);
    next(error);
  }
};

// ----------------- GENERIC FACILITY CRUD -----------------

const createFacilityEntity = (Model, name) => async (req, res, next) => {
  try {
    const doc = await Model.create({ ...req.body, branchId: req.branchId });
    res.status(201).json({ success: true, message: `${name} created`, data: doc });
  } catch (err) {
    next(err);
  }
};

const { paginate } = require('../utils/pagination');

const getFacilityEntities = (Model) => async (req, res, next) => {
  try {
    const filter = req.branchFilter ? req.branchFilter({}) : {};
    const result = await paginate(Model, filter, req.query, {
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ----------------- CLINICAL MASTERS CRUD -----------------

// Specialties
const createSpecialty = async (req, res, next) => {
  try {
    const doc = await Specialty.create(req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

const getSpecialties = async (req, res, next) => {
  try {
    const result = await paginate(Specialty, { status: 'active' }, req.query, {
      searchFields: ['name', 'code'],
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// Doctor Profiles
const createDoctorProfile = async (req, res, next) => {
  try {
    const { userId, specialtyId, qualifications, registrationNo, consultationFee, followUpDays, payType, revenueSharePercent } = req.body;
    const doc = await DoctorProfile.findOneAndUpdate(
      { userId },
      {
        userId,
        specialtyId,
        qualifications: qualifications || [],
        registrationNo,
        consultationFee: consultationFee || 500,
        followUpDays: followUpDays || 7,
        branchIds: [req.branchId],
        payType: payType || 'salaried',
        revenueSharePercent: revenueSharePercent || 0,
        status: 'active'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('specialtyId', 'name code').populate('userId', 'name email phone department');

    res.status(201).json({ success: true, message: 'Doctor profile configured', data: doc });
  } catch (err) {
    next(err);
  }
};

const getDoctorProfiles = async (req, res, next) => {
  try {
    const result = await paginate(DoctorProfile, { status: 'active' }, req.query, {
      populate: [
        { path: 'userId', select: 'name email phone department' },
        { path: 'specialtyId', select: 'name code' }
      ],
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const doc = await DoctorProfile.findOne({ $or: [{ _id: req.params.id }, { userId: req.params.id }] })
      .populate('userId', 'name email phone department')
      .populate('specialtyId', 'name code');
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

const grantDoctorPrivilege = async (req, res, next) => {
  try {
    const { procedureCode, procedureName, isIndependent } = req.body;
    const doc = await DoctorProfile.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor not found' });

    doc.privileges.push({ procedureCode, procedureName, isIndependent: !!isIndependent, grantedAt: new Date() });
    await doc.save();

    res.status(200).json({ success: true, message: 'Clinical privileges updated', data: doc.privileges });
  } catch (err) {
    next(err);
  }
};

// ICD-10 Search
const searchIcdCodes = async (req, res, next) => {
  try {
    const result = await paginate(IcdCode, {}, req.query, {
      searchFields: ['code', 'description'],
      defaultLimit: 50,
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const createIcdCode = async (req, res, next) => {
  try {
    const doc = await IcdCode.create(req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// Services & Tariffs
const createServiceItem = async (req, res, next) => {
  try {
    const doc = await ServiceItem.create(req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

const getServiceItems = async (req, res, next) => {
  try {
    const result = await paginate(ServiceItem, { status: 'active' }, req.query, {
      searchFields: ['name', 'code', 'department'],
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const createTariff = async (req, res, next) => {
  try {
    const doc = await Tariff.create({ ...req.body, branchId: req.body.branchId || req.branchId });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

const getTariffs = async (req, res, next) => {
  try {
    const result = await paginate(Tariff, {}, req.query, {
      populate: { path: 'serviceId', select: 'name code department' },
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// Pricing Resolver: GET /services/:id/price?payerId=&branchId=&date=
const resolveServicePrice = async (req, res, next) => {
  try {
    const serviceId = req.params.id;
    const service = await ServiceItem.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const payerCategory = req.query.payerCategory || 'general_cash';
    const branchId = req.query.branchId || req.branchId;

    // Check specific branch tariff first, then fallback to shared price
    let tariff = await Tariff.findOne({
      serviceId,
      payerCategory,
      branchId,
      effectiveFrom: { $lte: new Date() }
    }).sort({ effectiveFrom: -1 });

    if (!tariff) {
      tariff = await Tariff.findOne({
        serviceId,
        payerCategory,
        branchId: null,
        effectiveFrom: { $lte: new Date() }
      }).sort({ effectiveFrom: -1 });
    }

    const resolvedPrice = tariff ? tariff.price : service.basePrice;

    res.status(200).json({
      success: true,
      service: { id: service._id, name: service.name, code: service.code, department: service.department },
      pricing: {
        resolvedPrice,
        basePrice: service.basePrice,
        payerCategory,
        isCustomTariff: !!tariff
      },
      data: {
        price: resolvedPrice,
        resolvedPrice,
        basePrice: service.basePrice,
        payerCategory,
        isCustomTariff: !!tariff
      }
    });
  } catch (err) {
    next(err);
  }
};

// Payers
const createPayer = async (req, res, next) => {
  try {
    const doc = await Payer.create(req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

const getPayers = async (req, res, next) => {
  try {
    const result = await paginate(Payer, { status: 'active' }, req.query, {
      searchFields: ['name', 'code'],
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFacilityTree,
  getBedCensus,
  updateBedStatus,
  createBuilding: createFacilityEntity(Building, 'Building'),
  getBuildings: getFacilityEntities(Building),
  createFloor: createFacilityEntity(Floor, 'Floor'),
  getFloors: getFacilityEntities(Floor),
  createWard: createFacilityEntity(Ward, 'Ward'),
  getWards: getFacilityEntities(Ward),
  createRoomType: createFacilityEntity(RoomType, 'RoomType'),
  getRoomTypes: getFacilityEntities(RoomType),
  createRoom: createFacilityEntity(Room, 'Room'),
  getRooms: getFacilityEntities(Room),
  createBed: createFacilityEntity(Bed, 'Bed'),
  getBeds: getFacilityEntities(Bed),
  createSpecialty,
  getSpecialties,
  createDoctorProfile,
  getDoctorProfiles,
  getDoctorById,
  grantDoctorPrivilege,
  searchIcdCodes,
  createIcdCode,
  createServiceItem,
  getServiceItems,
  createTariff,
  getTariffs,
  resolveServicePrice,
  createPayer,
  getPayers
};
