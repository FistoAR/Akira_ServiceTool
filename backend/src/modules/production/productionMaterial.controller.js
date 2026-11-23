const ProductionMaterial = require('./productionMaterial.model');
const ProductionStageMapping = require('./productionStageMapping.model');

// Helper to determine if user has overarching production access (Admin, Management, QA)
const hasOverarchingAccess = (user) => {
  if (!user) return true; // fallback if no auth passed
  const role = (user.role || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  if (role === 'admin' || role === 'superuser' || role === 'super admin') return true;
  if (dept.includes('quality') || dept.includes('qa') || dept.includes('management') || dept.includes('admin')) return true;
  return false;
};

// --- Production Stage Mappings CRUD ---
exports.getStageMappings = async (req, res) => {
  try {
    const mappings = await ProductionStageMapping.find().sort({ createdAt: -1 }).lean();
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveStageMapping = async (req, res) => {
  try {
    const { stage, userId, users, userName, userEmail, assignedBy, assignedByName } = req.body;
    if (!stage) {
      return res.status(400).json({ message: 'Detection Stage is required' });
    }

    // Support batch assigning multiple users: users: [{ userId, userName, userEmail }]
    if (users && Array.isArray(users) && users.length > 0) {
      const ops = users.map(u => ({
        updateOne: {
          filter: { userId: String(u.userId).trim() },
          update: {
            $set: {
              stage: String(stage).trim(),
              userId: String(u.userId).trim(),
              userName: u.userName || u.userId,
              userEmail: u.userEmail || '',
              assignedBy: assignedBy || '',
              assignedByName: assignedByName || ''
            }
          },
          upsert: true
        }
      }));

      await ProductionStageMapping.bulkWrite(ops);
      const allMappings = await ProductionStageMapping.find().sort({ createdAt: -1 }).lean();
      return res.json(allMappings);
    }

    if (!userId) {
      return res.status(400).json({ message: 'Person or list of persons is required' });
    }

    // 1 person will be assigned to 1 stage only: update existing or insert new
    const mapping = await ProductionStageMapping.findOneAndUpdate(
      { userId: String(userId).trim() },
      { 
        stage: String(stage).trim(), 
        userId: String(userId).trim(), 
        userName: userName || userId,
        userEmail: userEmail || '',
        assignedBy: assignedBy || '',
        assignedByName: assignedByName || ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(mapping);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStageMapping = async (req, res) => {
  try {
    const { id } = req.params;
    await ProductionStageMapping.findByIdAndDelete(id);
    res.json({ message: 'Mapping removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyStageMapping = async (req, res) => {
  try {
    const uid = req.query.userId || req.user?.userId || (req.user?._id ? String(req.user._id) : null);
    if (!uid) return res.json(null);

    const mapping = await ProductionStageMapping.findOne({ userId: String(uid).trim() }).lean();
    res.json(mapping);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- GET /api/production-material ---
exports.getAllInwards = async (req, res) => {
  try {
    // Determine calling user from query or req.user
    const queryUserId = req.query.userId || req.user?.userId || (req.user?._id ? String(req.user._id) : null);
    const queryRole = (req.query.role || req.user?.role || '').toLowerCase();
    const queryDept = (req.query.department || req.user?.department || '').toLowerCase();

    const isOverarching = queryRole === 'admin' || queryRole === 'superuser' || queryRole === 'super admin' ||
      queryDept.includes('quality') || queryDept.includes('qa') || queryDept.includes('management') || queryDept.includes('admin');

    // Admin / Quality with overarching access see all records
    if (isOverarching) {
      const inwards = await ProductionMaterial.find().lean().sort({ createdAt: -1 });
      return res.json(inwards);
    }

    // Check if user has an assigned Detection Stage in ProductionStageMapping
    let assignedStage = null;
    if (queryUserId) {
      const mapping = await ProductionStageMapping.findOne({ userId: String(queryUserId).trim() }).lean();
      if (mapping) {
        assignedStage = mapping.stage;
      }
    }

    let filter = {};
    if (assignedStage && queryUserId) {
      // User has assigned Detection Stage:
      // Show products of their stage OR products where they are the raisedTo / creator / inspectedBy / assignedTo
      filter = {
        $or: [
          { 'products.stage': assignedStage },
          { 'products.raisedTo': String(queryUserId).trim() },
          { 'products.assignedTo': String(queryUserId).trim() },
          { creatorUserId: String(queryUserId).trim() },
          { 'products.inspectedBy': String(queryUserId).trim() }
        ]
      };
    } else if (queryUserId) {
      filter = {
        $or: [
          { creatorUserId: String(queryUserId).trim() },
          { 'products.inspectedBy': String(queryUserId).trim() },
          { 'products.raisedTo': String(queryUserId).trim() },
          { 'products.assignedTo': String(queryUserId).trim() },
          { 'products.report.workDoneBy': String(queryUserId).trim() }
        ]
      };
    }

    const inwards = await ProductionMaterial.find(filter).lean().sort({ createdAt: -1 });

    // If stage-restricted and not overarching, prune products inside inward to only show matched products
    if (assignedStage) {
      const prunedInwards = inwards.map(inw => {
        const matchingProds = (inw.products || []).filter(p => 
          p.stage === assignedStage ||
          p.raisedTo === String(queryUserId).trim() ||
          p.assignedTo === String(queryUserId).trim() ||
          p.inspectedBy === String(queryUserId).trim() ||
          inw.creatorUserId === String(queryUserId).trim()
        );
        return {
          ...inw,
          products: matchingProds
        };
      }).filter(inw => inw.products && inw.products.length > 0);

      return res.json(prunedInwards);
    }

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
