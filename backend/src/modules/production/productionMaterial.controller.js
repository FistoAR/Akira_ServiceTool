const ProductionMaterial = require('./productionMaterial.model');

// --- GET /api/production-material ---
exports.getAllInwards = async (req, res) => {
  try {
    const inwards = await ProductionMaterial.find().lean().sort({ createdAt: -1 });
    res.json(inwards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- GET /api/production-material/:id ---
exports.getInwardById = async (req, res) => {
  try {
    const inward = await ProductionMaterial.findById(req.params.id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- POST /api/production-material ---
exports.createInward = async (req, res) => {
  try {
    let data = req.body;
    
    // Parse products if sent as a string (FormData)
    if (typeof data.products === 'string') {
      try {
        data.products = JSON.parse(data.products);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid products data' });
      }
    }

    // Handle files mapping to products
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const match = file.fieldname.match(/^boardImage_(\d+)$/);
        if (match) {
          const idx = parseInt(match[1]);
          if (data.products[idx]) {
            data.products[idx].boardImage = `/uploads/${file.filename}`;
          }
        }
      });
    }

    const inward = await ProductionMaterial.create(data);
    res.status(201).json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- PUT /api/production-material/:id ---
exports.updateInward = async (req, res) => {
  try {
    const existingInward = await ProductionMaterial.findById(req.params.id);
    if (!existingInward) return res.status(404).json({ message: 'Inward not found' });

    let data = req.body;

    // Parse products if sent as a string (FormData)
    if (typeof data.products === 'string') {
      try {
        data.products = JSON.parse(data.products);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid products data' });
      }
    }

    // Handle files mapping to products
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const match = file.fieldname.match(/^boardImage_(\d+)$/);
        if (match) {
          const idx = parseInt(match[1]);
          if (data.products && data.products[idx]) {
            data.products[idx].boardImage = `/uploads/${file.filename}`;
          }
        }
      });
    }

    // Audit diff tracking like ServiceMaterial
    const auditedFields = ['jobOrderNo', 'customerName', 'customerCode', 'category', 'date'];
    const diffs = [];
    auditedFields.forEach(f => {
      if (data[f] !== undefined) {
        let oldVal = existingInward[f];
        let newVal = data[f];
        if (f === 'date') {
          oldVal = oldVal ? new Date(oldVal).toISOString().split('T')[0] : '';
          newVal = newVal ? new Date(newVal).toISOString().split('T')[0] : '';
        }
        const strOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
        const strNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();
        if (strOld !== strNew) {
          diffs.push({
            field: f,
            originalValue: existingInward[f] || null,
            editedValue: data[f]
          });
        }
      }
    });

    if (data.products && Array.isArray(data.products) && existingInward.products) {
      data.products.forEach((p, idx) => {
        const ep = p._pid ? existingInward.products.find(ex => ex._pid === p._pid) : existingInward.products[idx];
        if (ep) {
          ['productCode', 'productDescription', 'productSegment', 'boardType', 'problemType', 'ncType', 'problemDescription', 'qty', 'serialNumber', 'identification', 'disposition', 'raisedTo'].forEach(pf => {
            if (p[pf] !== undefined) {
              const oldPf = ep[pf] === null || ep[pf] === undefined ? '' : String(ep[pf]).trim();
              const newPf = p[pf] === null || p[pf] === undefined ? '' : String(p[pf]).trim();
              if (oldPf !== newPf) {
                diffs.push({
                  field: `Product ${idx + 1} (${p.productDescription || ep.productDescription || 'Item'}): ${pf}`,
                  originalValue: ep[pf] || null,
                  editedValue: p[pf]
                });
              }
            }
          });
        }
      });
    }

    if (diffs.length > 0) {
      const editRecord = {
        editedAt: new Date(),
        editedBy: data._editedBy || req.user?.userId || 'Admin',
        editedByName: data._editedByName || req.user?.name || 'Administrator',
        role: data._editedByRole || req.user?.role || 'Admin',
        reason: data._editReason || 'Inward updated',
        diffs
      };
      data.editHistory = [...(existingInward.editHistory || []), editRecord];
    }

    delete data._editedBy;
    delete data._editedByName;
    delete data._editedByRole;
    delete data._editReason;

    const inward = await ProductionMaterial.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true }
    );
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- DELETE /api/production-material/:id ---
exports.deleteInward = async (req, res) => {
  try {
    const inward = await ProductionMaterial.findByIdAndDelete(req.params.id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });
    res.json({ message: 'Inward deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- PATCH /api/production-material/:id/claim-product ---
exports.claimProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, userId, userName } = req.body;

    const inward = await ProductionMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.assignedTo = userId;
    product.assignedToName = userName;
    product.status = 'Assigned';

    inward.markModified('products');
    await inward.save();
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- PATCH /api/production-material/:id/product/:productId/report ---
exports.updateProductReport = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const { report } = req.body;

    const inward = await ProductionMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.report = report;
    product.status = report.status || 'Updated';

    inward.markModified('products');
    await inward.save();
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- PATCH /api/production-material/:id/product/:productId/final-status ---
exports.updateFinalStatus = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const { finalStatus, finalStatusRemarks, finalStatusDate, finalStatusHistory, report } = req.body;

    const inward = await ProductionMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (finalStatus !== undefined) product.finalStatus = finalStatus;
    if (finalStatusRemarks !== undefined) product.finalStatusRemarks = finalStatusRemarks;
    if (finalStatusDate !== undefined) product.finalStatusDate = finalStatusDate;
    if (finalStatusHistory !== undefined) product.finalStatusHistory = finalStatusHistory;
    if (report !== undefined) product.report = report;

    inward.markModified('products');
    await inward.save();
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
