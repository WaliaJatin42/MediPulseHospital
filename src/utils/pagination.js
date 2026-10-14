/**
 * Unified Pagination & Filtering Utility for MediPulse Hospital Backend
 * Standardizes page, limit, startDate, endDate, and basic query filters across all list endpoints.
 */

/**
 * Apply pagination, date filters, and common query filters to a Mongoose query
 * @param {Model} Model - Mongoose Model
 * @param {Object} baseFilter - Base filter (e.g. branchFilter, creatorFilter)
 * @param {Object} queryParams - req.query object
 * @param {Object} options - { defaultLimit, maxLimit, dateField, populate, sort, select, searchFields, customFilters }
 * @returns {Promise<Object>} { success: true, count, total, page, limit, totalPages, hasMore, data }
 */
async function paginate(Model, baseFilter = {}, queryParams = {}, options = {}) {
  const filter = { ...baseFilter };

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const maxLimit = options.maxLimit || 100;
  const defaultLimit = options.defaultLimit || 50;
  const limit = Math.min(maxLimit, Math.max(1, parseInt(queryParams.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  // 1. Date Range Filtering (startDate & endDate or from & to)
  const dateField = options.dateField || 'createdAt';
  const startDateStr = queryParams.startDate || queryParams.from;
  const endDateStr = queryParams.endDate || queryParams.to;

  if (startDateStr || endDateStr) {
    filter[dateField] = filter[dateField] || {};
    if (startDateStr) {
      const start = new Date(startDateStr);
      if (!isNaN(start.getTime())) {
        filter[dateField].$gte = start;
      }
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (!isNaN(end.getTime())) {
        if (typeof endDateStr === 'string' && endDateStr.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        filter[dateField].$lte = end;
      }
    }
  }

  // 2. Common Query Filters
  const commonFilterFields = [
    'status',
    'department',
    'role',
    'branchId',
    'patientId',
    'doctorId',
    'theatreId',
    'type',
    'priority',
    'modality',
    'paymentMode',
    'gender',
    'bloodGroup'
  ];

  commonFilterFields.forEach((field) => {
    if (queryParams[field] !== undefined && queryParams[field] !== '') {
      filter[field] = queryParams[field];
    }
  });

  // 3. Custom Filters hook
  if (typeof options.customFilters === 'function') {
    options.customFilters(filter, queryParams);
  }

  // 4. Free-text Search Filter (q or search)
  const searchTerm = queryParams.search || queryParams.q;
  if (searchTerm && Array.isArray(options.searchFields) && options.searchFields.length > 0) {
    const regex = new RegExp(searchTerm.trim(), 'i');
    filter.$or = options.searchFields.map((field) => ({ [field]: regex }));
  }

  // 5. Sorting
  let sort = options.sort || { [dateField]: -1 };
  if (queryParams.sortBy) {
    const order = queryParams.sortOrder === 'asc' ? 1 : -1;
    sort = { [queryParams.sortBy]: order };
  }

  // 6. Execute Count and Query
  const total = await Model.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || 1;

  let query = Model.find(filter);

  if (options.select) {
    query = query.select(options.select);
  }

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach((p) => {
        query = query.populate(p);
      });
    } else {
      query = query.populate(options.populate);
    }
  }

  query = query.sort(sort).skip(skip).limit(limit);
  const data = await query;

  return {
    success: true,
    count: data.length,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
    data
  };
}

module.exports = {
  paginate
};
