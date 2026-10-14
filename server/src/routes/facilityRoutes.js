const express = require('express');
const {
  getFacilityTree,
  getBedCensus,
  updateBedStatus,
  createBuilding,
  getBuildings,
  createFloor,
  getFloors,
  createWard,
  getWards,
  createRoomType,
  getRoomTypes,
  createRoom,
  getRooms,
  createBed,
  getBeds,
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
} = require('../controllers/facilityController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

const facilityPaths = [
  '/facility', '/beds', '/buildings', '/floors', '/wards', '/room-types',
  '/rooms', '/specialties', '/doctors', '/icd-codes', '/services', '/tariffs', '/payers'
];
router.use(facilityPaths, protect, branchContext);

// Facility Hierarchy & Census
router.get('/facility/tree', getFacilityTree);
router.get('/beds/census', getBedCensus);
router.patch('/beds/:id/status', updateBedStatus);

// Facility CRUD
router.route('/buildings').post(authorize('superadmin', 'admin'), createBuilding).get(getBuildings);
router.route('/floors').post(authorize('superadmin', 'admin'), createFloor).get(getFloors);
router.route('/wards').post(authorize('superadmin', 'admin'), createWard).get(getWards);
router.route('/room-types').post(authorize('superadmin', 'admin'), createRoomType).get(getRoomTypes);
router.route('/rooms').post(authorize('superadmin', 'admin'), createRoom).get(getRooms);
router.route('/beds').post(authorize('superadmin', 'admin'), createBed).get(getBeds);

// Clinical Masters
router.route('/specialties').post(authorize('superadmin', 'admin'), createSpecialty).get(getSpecialties);
router.route('/doctors').post(authorize('superadmin', 'admin'), createDoctorProfile).get(getDoctorProfiles);
router.route('/doctors/:id').get(getDoctorById);
router.post('/doctors/:id/privileges', authorize('superadmin', 'admin'), grantDoctorPrivilege);

router.route('/icd-codes').get(searchIcdCodes).post(authorize('superadmin', 'admin'), createIcdCode);
router.route('/services').post(authorize('superadmin', 'admin'), createServiceItem).get(getServiceItems);
router.get('/services/:id/price', resolveServicePrice);
router.route('/tariffs').post(authorize('superadmin', 'admin'), createTariff).get(getTariffs);
router.route('/payers').post(authorize('superadmin', 'admin'), createPayer).get(getPayers);

module.exports = router;
