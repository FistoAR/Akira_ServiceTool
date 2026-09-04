const Unit = require('../models/unit.model');
const PartyType = require('../models/partyType.model');
const WarrantyRule = require('../models/warrantyRule.model');
const ProductSegment = require('../models/productSegment.model');
const EscalationFlow = require('../models/escalationFlow.model');
const Customer = require('../models/customer.model');
const MasterSettings = require('../models/masterSettings.model');
const BoardType = require('../models/boardType.model');
const FourMCategory = require('../models/fourMCategory.model');
const ServiceCall = require('../models/serviceCall.model');
const ServiceMaterial = require('../models/serviceMaterial.model');

// --- Units ---
exports.getUnits = async (req, res) => {
  try { res.json(await Unit.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.addUnit = async (req, res) => {
  try { res.json(await Unit.create(req.body)); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.updateUnit = async (req, res) => {
  try { res.json(await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.deleteUnit = async (req, res) => {
  try { await Unit.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- Party Types ---
exports.getPartyTypes = async (req, res) => {
  try { res.json(await PartyType.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.addPartyType = async (req, res) => {
  try { res.json(await PartyType.create(req.body)); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.updatePartyType = async (req, res) => {
  try { res.json(await PartyType.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.deletePartyType = async (req, res) => {
  try { await PartyType.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- Warranty Rules ---
exports.getWarrantyRules = async (req, res) => {
  try { res.json(await WarrantyRule.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.addWarrantyRule = async (req, res) => {
  try { res.json(await WarrantyRule.create(req.body)); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.updateWarrantyRule = async (req, res) => {
  try { res.json(await WarrantyRule.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.deleteWarrantyRule = async (req, res) => {
  try { await WarrantyRule.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- Product Segments ---
exports.getProductSegments = async (req, res) => {
  try { res.json(await ProductSegment.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.addProductSegment = async (req, res) => {
  try { res.json(await ProductSegment.create(req.body)); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.updateProductSegment = async (req, res) => {
  try { res.json(await ProductSegment.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.deleteProductSegment = async (req, res) => {
  try { await ProductSegment.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- Escalation Flows ---
exports.getEscalationFlows = async (req, res) => {
  try { res.json(await EscalationFlow.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.saveEscalationFlow = async (req, res) => {
  try {
    const { type, steps } = req.body;
    const flow = await EscalationFlow.findOneAndUpdate({ type }, { steps }, { upsert: true, new: true });
    res.json(flow);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- Customers ---
exports.getCustomers = async (req, res) => {
  try { res.json(await Customer.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.saveCustomers = async (req, res) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers)) return res.status(400).json({ message: "Customers must be an array" });
    
    // Sync indexes to remove any legacy indexes (like unique partyCode) that might block multiple products per customer
    await Customer.syncIndexes();
    
    // Using deleteMany and insertMany for bulk replacement
    await Customer.deleteMany({});
    const saved = await Customer.insertMany(customers, { ordered: false });
    res.json(saved);
  } catch (err) {
    if (err.name === 'BulkWriteError' || err.code === 11000 || err.writeErrors) {
      const insertedCount = err.result?.nInserted || err.insertedDocs?.length || 0;
      return res.status(200).json({ 
        message: `Saved ${insertedCount} unique records. Some duplicate items were ignored.`,
        partial: true
      });
    }
    res.status(500).json({ message: err.message });
  }
};
exports.bulkAddCustomers = async (req, res) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers)) return res.status(400).json({ message: "Customers must be an array" });
    const saved = await Customer.insertMany(customers, { ordered: false });
    res.json({ message: "Successfully added all records", insertedCount: saved.length });
  } catch (err) {
    console.error("bulkAddCustomers error:", err);
    if (err.name === 'BulkWriteError' || err.code === 11000 || err.writeErrors) {
      const insertedCount = err.result?.nInserted || err.insertedDocs?.length || 0;
      const duplicateCount = err.writeErrors?.length || 0;
      return res.status(200).json({ 
        message: `Import complete: ${insertedCount} new records added. ${duplicateCount} duplicates were skipped.`,
        insertedCount,
        duplicateCount,
        partial: true
      });
    }
    res.status(500).json({ message: err.message });
  }
};
exports.bulkDeleteCustomers = async (req, res) => {
  try {
    const { itemCodes } = req.body;
    if (!itemCodes || !itemCodes.length) {
      return res.json({ message: 'Deleted' });
    }
    
    // Find matching customer records to extract party codes
    const customersToDelete = await Customer.find({ itemCode: { $in: itemCodes } }).lean();
    const partyCodes = [...new Set(customersToDelete.map(c => c.partyCode).filter(Boolean))];

    // Cascade delete Customers
    await Customer.deleteMany({ itemCode: { $in: itemCodes } });

    // Cascade delete Service Calls by partyCode OR itemCode in products
    if (partyCodes.length || itemCodes.length) {
      await ServiceCall.deleteMany({
        $or: [
          { partyCode: { $in: partyCodes } },
          { 'products.itemCode': { $in: itemCodes } }
        ]
      });

      // Cascade delete Service Material by customerCode OR productCode in products
      await ServiceMaterial.deleteMany({
        $or: [
          { customerCode: { $in: partyCodes } },
          { 'products.productCode': { $in: itemCodes } }
        ]
      });
    }

    res.json({ message: 'Deleted successfully along with associated service calls and service material records.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.addCustomer = async (req, res) => {
  try { res.json(await Customer.create(req.body)); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.updateCustomer = async (req, res) => {
  try { res.json(await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.deleteCustomer = async (req, res) => {
  try {
    const cust = await Customer.findById(req.params.id).lean();
    if (cust) {
      await Customer.findByIdAndDelete(req.params.id);
      await ServiceCall.deleteMany({
        $or: [
          { partyCode: cust.partyCode },
          { 'products.itemCode': cust.itemCode }
        ]
      });
      await ServiceMaterial.deleteMany({
        $or: [
          { customerCode: cust.partyCode },
          { 'products.productCode': cust.itemCode }
        ]
      });
    }
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- Settings ---
exports.getSettings = async (req, res) => {
  try {
    const settings = await MasterSettings.findOne({ key: req.params.key });
    res.json(settings ? settings.value : null);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.saveSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    const settings = await MasterSettings.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
    res.json(settings);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
// --- Board Types ---
exports.getBoardTypes = async (req, res) => {
  try { res.json(await BoardType.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.addBoardType = async (req, res) => {
  try { res.json(await BoardType.create(req.body)); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.updateBoardType = async (req, res) => {
  try { res.json(await BoardType.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.deleteBoardType = async (req, res) => {
  try { await BoardType.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); }
};

// --- 4M Categories ---
exports.getFourMCategories = async (req, res) => {
  try { res.json(await FourMCategory.find().lean()); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.addFourMCategory = async (req, res) => {
  try { res.json(await FourMCategory.create(req.body)); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.updateFourMCategory = async (req, res) => {
  try { res.json(await FourMCategory.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.deleteFourMCategory = async (req, res) => {
  try { await FourMCategory.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getModules = async (req, res) => {
  const groups = [
    { id: "all", label: "All" },
    { id: "master", label: "Master Access" },
    { id: "customers", label: "Customers" },
    { id: "service-call", label: "Service Call" },
    { id: "service-material", label: "Service Material" },
    { id: "production-material", label: "Production Material" },
    { id: "troubleshoot", label: "Troubleshoot" },
  ];

  const modules = [
    { id: "partyTypes", label: "Party Type Categories", group: "master", desc: "Manage party type target categories" },
    { id: "warrantyRules", label: "Warranty Rule Master", group: "master", desc: "Configure category-specific serial number index decoders and SLAs" },
    { id: "segments", label: "Product Segments", group: "master", desc: "Manage product segment names" },
    { id: "fourM", label: "4M Categories", group: "master", desc: "Manage 4M checklist categories" },
    { id: "units", label: "Units", group: "master", desc: "Manage measurement units" },
    { id: "employees", label: "User Management", group: "master", desc: "Manage employee profiles and credentials" },
    { id: "roleAccess", label: "Role Access", group: "master", desc: "Manage user permissions" },
    { id: "escalation", label: "Service Call SLA", group: "master", desc: "Configure SLA workflows" },

    { id: "customers", label: "Customers Database", group: "customers", desc: "View and edit client profiles" },

    { id: "callReg", label: "Call Registration", group: "service-call", desc: "Register incoming service calls" },
    { id: "callAssign", label: "Call Assignment", group: "service-call", desc: "Assign engineers to service calls" },
    { id: "callEscalation", label: "Escalating Calls", group: "service-call", desc: "Monitor SLA escalations" },
    { id: "callReports", label: "Call Reports", group: "service-call", desc: "General reports and analytics" },

    { id: "matInward", label: "Material Inward Register", group: "service-material", desc: "Log inward-bound product serial numbers" },
    { id: "matReports", label: "Inward Reports", group: "service-material", desc: "Track status of materials" },

    { id: "prodNC", label: "Production NC", group: "production-material", desc: "File production non-conformance reports" },
    { id: "prodReports", label: "NC Reports", group: "production-material", desc: "NC analytics and logs" },

    { id: "troubleshoot", label: "Troubleshooting Chat", group: "troubleshoot", desc: "Interactive diagnostics and guides" },
  ];

  res.json({ groups, modules });
};
