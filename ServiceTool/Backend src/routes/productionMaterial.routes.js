const express = require('express');
const router = express.Router();
const productionMaterialController = require('../controllers/productionMaterial.controller');
const upload = require('../middlewares/upload.middleware');

router.get('/', productionMaterialController.getAllInwards);
router.get('/:id', productionMaterialController.getInwardById);
router.post('/', upload.any(), productionMaterialController.createInward);
router.put('/:id', upload.any(), productionMaterialController.updateInward);
router.delete('/:id', productionMaterialController.deleteInward);

router.patch('/:id/claim-product', productionMaterialController.claimProduct);
router.patch('/:id/product/:productId/report', productionMaterialController.updateProductReport);
router.patch('/:id/product/:productId/final-status', productionMaterialController.updateFinalStatus);

module.exports = router;
