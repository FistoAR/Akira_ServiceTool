const express = require('express');
const router = express.Router();
const masterController = require('../controllers/master.controller');

// Party Types
router.get('/party-types', masterController.getPartyTypes);
router.post('/party-types', masterController.addPartyType);
router.put('/party-types/:id', masterController.updatePartyType);
router.delete('/party-types/:id', masterController.deletePartyType);

// Warranty Rules
router.get('/warranty-rules', masterController.getWarrantyRules);
router.post('/warranty-rules', masterController.addWarrantyRule);
router.put('/warranty-rules/:id', masterController.updateWarrantyRule);
router.delete('/warranty-rules/:id', masterController.deleteWarrantyRule);


// Units
router.get('/units', masterController.getUnits);
router.post('/units', masterController.addUnit);
router.put('/units/:id', masterController.updateUnit);
router.delete('/units/:id', masterController.deleteUnit);

// Product Segments
router.get('/product-segments', masterController.getProductSegments);
router.post('/product-segments', masterController.addProductSegment);
router.put('/product-segments/:id', masterController.updateProductSegment);
router.delete('/product-segments/:id', masterController.deleteProductSegment);

// Board Types
router.get('/board-types', masterController.getBoardTypes);
router.post('/board-types', masterController.addBoardType);
router.put('/board-types/:id', masterController.updateBoardType);
router.delete('/board-types/:id', masterController.deleteBoardType);

// 4M Categories
router.get('/four-m-categories', masterController.getFourMCategories);
router.post('/four-m-categories', masterController.addFourMCategory);
router.put('/four-m-categories/:id', masterController.updateFourMCategory);
router.delete('/four-m-categories/:id', masterController.deleteFourMCategory);

// Escalation Flows
router.get('/escalation-flows', masterController.getEscalationFlows);
router.post('/escalation-flows', masterController.saveEscalationFlow);

// Customers
router.get('/customers', masterController.getCustomers);
router.post('/customers', masterController.addCustomer);
router.post('/customers/bulk', masterController.saveCustomers); // This is replace
router.post('/customers/bulk-add', masterController.bulkAddCustomers); // This is append
router.post('/customers/bulk-delete', masterController.bulkDeleteCustomers);
router.put('/customers/:id', masterController.updateCustomer);
router.delete('/customers/:id', masterController.deleteCustomer);

// Settings
router.get('/settings/:key', masterController.getSettings);
router.post('/settings', masterController.saveSettings);

// Module List config
router.get('/modules', masterController.getModules);

module.exports = router;
