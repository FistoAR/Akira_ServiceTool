const ProductionMaterial = require('./productionMaterial.model');
const ProductionStageMapping = require('./productionStageMapping.model');
const ProductionZoneMapping = require('./productionZoneMapping.model');
const Zone = require('../master/models/zone.model');
const User = require('../auth/user.model');
const Notification = require('../notification/notification.model');
const socketConfig = require('../../config/socket');

// Helper to push in-app and browser notifications via socket & db
const notifyUser = async ({ recipient, title, message, type = 'Production NC', priority = 'Medium', data = {} }) => {
  if (!recipient) return;
  try {
    const notif = new Notification({
      recipient,
      title,
      message,
      type,
      priority,
      data
    });
    await notif.save();
    const io = socketConfig.getIO();
    if (io) {
      io.to(recipient).emit('notification:new', notif);
      if (priority === 'Critical') {
        io.emit('notification:critical', notif);
      }
    }
  } catch (e) {
    console.error('Failed to send notification to', recipient, e.message);
  }
};

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

// --- Production Zone Mappings CRUD ---
exports.getZoneMappings = async (req, res) => {
  try {
    const mappings = await ProductionZoneMapping.find().sort({ createdAt: -1 }).lean();
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveZoneMapping = async (req, res) => {
  try {
    const { zone, roleInZone, isDefaultReceiver, userId, users, userName, userEmail, department, assignedBy, assignedByName } = req.body;
    if (!zone) {
      return res.status(400).json({ message: 'Zone is required' });
    }

    const trimmedZone = String(zone).trim();
    const targetRole = roleInZone || 'Manual Testing';

    // Support batch assigning multiple users: users: [{ userId, userName, userEmail, department, roleInZone }]
    if (users && Array.isArray(users) && users.length > 0) {
      const ops = users.map(u => ({
        updateOne: {
          filter: { userId: String(u.userId).trim() },
          update: {
            $set: {
              zone: trimmedZone,
              roleInZone: u.roleInZone || targetRole,
              isDefaultReceiver: Boolean(u.isDefaultReceiver),
              userId: String(u.userId).trim(),
              userName: u.userName || u.userId,
              userEmail: u.userEmail || '',
              department: u.department || '',
              assignedBy: assignedBy || '',
              assignedByName: assignedByName || ''
            }
          },
          upsert: true
        }
      }));

      await ProductionZoneMapping.bulkWrite(ops);

      // Also sync user.zone in User collection for consistency
      const userIds = users.map(u => String(u.userId).trim());
      await User.updateMany(
        { userId: { $in: userIds } },
        { $set: { zone: trimmedZone } }
      );

      const allMappings = await ProductionZoneMapping.find().sort({ createdAt: -1 }).lean();
      return res.json(allMappings);
    }

    if (!userId) {
      return res.status(400).json({ message: 'Person or list of persons is required' });
    }

    const cleanUserId = String(userId).trim();

    // 1 person will be assigned to 1 zone only
    const mapping = await ProductionZoneMapping.findOneAndUpdate(
      { userId: cleanUserId },
      { 
        zone: trimmedZone, 
        roleInZone: targetRole,
        isDefaultReceiver: Boolean(isDefaultReceiver),
        userId: cleanUserId, 
        userName: userName || userId,
        userEmail: userEmail || '',
        department: department || '',
        assignedBy: assignedBy || '',
        assignedByName: assignedByName || ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If marked as default receiver, also update zone model
    if (isDefaultReceiver) {
      await Zone.findOneAndUpdate(
        { name: trimmedZone },
        { 
          defaultReceiverRole: targetRole,
          defaultReceiverUserId: cleanUserId,
          defaultReceiverUserName: userName || userId
        }
      );
    }

    // Sync to User collection
    await User.updateOne({ userId: cleanUserId }, { $set: { zone: trimmedZone } });

    res.json(mapping);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteZoneMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = await ProductionZoneMapping.findById(id);
    if (mapping) {
      await ProductionZoneMapping.findByIdAndDelete(id);
      // Clear zone on User
      await User.updateOne({ userId: mapping.userId }, { $unset: { zone: "" } });
    }
    res.json({ message: 'Zone assignment removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyZoneMapping = async (req, res) => {
  try {
    const uid = req.query.userId || req.user?.userId || (req.user?._id ? String(req.user._id) : null);
    if (!uid) return res.json(null);

    const mapping = await ProductionZoneMapping.findOne({ userId: String(uid).trim() }).lean();
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

    // Determine user's assigned Zone from ProductionZoneMapping
    let assignedZone = null;
    let assignedStage = null;
    if (queryUserId) {
      const [zMapping, sMapping] = await Promise.all([
        ProductionZoneMapping.findOne({ userId: String(queryUserId).trim() }).lean(),
        ProductionStageMapping.findOne({ userId: String(queryUserId).trim() }).lean()
      ]);
      if (zMapping) assignedZone = zMapping.zone;
      if (sMapping) assignedStage = sMapping.stage;
    }

    const uid = queryUserId ? String(queryUserId).trim() : null;
    let filter = {};

    if (uid && assignedZone) {
      filter = {
        $or: [
          { creatorUserId: uid },
          { 'products.raisedTo': uid },
          { 'products.assignedTo': uid },
          { 'products.inspectedBy': uid },
          { 'products.zone': assignedZone },
          { 'products.targetZone': assignedZone }
        ]
      };
    } else if (uid && assignedStage) {
      filter = {
        $or: [
          { creatorUserId: uid },
          { 'products.raisedTo': uid },
          { 'products.assignedTo': uid },
          { 'products.inspectedBy': uid },
          { 'products.stage': assignedStage }
        ]
      };
    } else if (uid) {
      filter = {
        $or: [
          { creatorUserId: uid },
          { 'products.raisedTo': uid },
          { 'products.assignedTo': uid },
          { 'products.inspectedBy': uid }
        ]
      };
    }

    const inwards = await ProductionMaterial.find(filter).lean().sort({ createdAt: -1 });

    // Prune products according to Zone & Ownership rules:
    // 1. If assignedZone exists:
    //    - Internal: show if created by me, inspected by me, or belongs to my zone
    //    - External (Cross-Zone): show if my zone is the source (zone), targetZone is my zone, or assignedTo / raisedTo me
    //    - Field Return / Visit: show if registered by me or raised to me / my zone
    const prunedInwards = inwards.map(inw => {
      const isCreator = uid && (inw.creatorUserId === uid || inw.creatorName === req.query.userName);

      const matchingProds = (inw.products || []).filter(p => {
        const pZone = (p.zone || p.stage || '').trim();
        const pTargetZone = (p.targetZone || '').trim();
        const nc = (p.ncType || 'Internal').trim();
        const isRaisedToMe = uid && (p.raisedTo === uid || p.assignedTo === uid);
        const isInspectedByMe = uid && (p.inspectedBy === uid);

        // If user has an assigned zone:
        if (assignedZone) {
          const isMyZoneSource = pZone === assignedZone;
          const isMyZoneTarget = pTargetZone === assignedZone;

          if (isMyZoneSource || isMyZoneTarget || isRaisedToMe || isInspectedByMe || isCreator) {
            return true;
          }
          return false;
        }

        // Fallback to legacy stage logic if user only has stage mapping
        if (assignedStage && p.stage && p.stage !== assignedStage) {
          return false;
        }

        if (nc === 'Internal') {
          return isCreator || isInspectedByMe;
        } else {
          return isCreator || isRaisedToMe;
        }
      });

      return {
        ...inw,
        products: matchingProds
      };
    }).filter(inw => inw.products && inw.products.length > 0);

    res.json(prunedInwards);
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

    // Push notification for newly created inward products:
    try {
      if (Array.isArray(inward.products)) {
        for (const prod of inward.products) {
          // If raisedTo a specific person:
          if (prod.raisedTo && prod.raisedTo !== inward.creatorUserId) {
            await notifyUser({
              recipient: prod.raisedTo,
              title: "New Production NC Assigned",
              message: `NC Ticket for product "${prod.productDescription || prod.productCode || 'Item'}" has been assigned to you by ${inward.creatorName || 'Team'}.`,
              type: "Production NC",
              priority: "High",
              data: { inwardId: inward._id, productId: prod._pid, refNo: inward.refNoInternal }
            });
          } else if (prod.ncType === 'External' && prod.targetZone) {
            // Find default receiver or members of targetZone
            const targetMembers = await ProductionZoneMapping.find({ zone: prod.targetZone }).lean();
            const receiver = targetMembers.find(m => m.isDefaultReceiver || m.roleInZone === 'Manual Testing') || targetMembers[0];
            if (receiver) {
              await notifyUser({
                recipient: receiver.userId,
                title: `New Cross-Zone NC [${prod.targetZone}]`,
                message: `New external NC received from ${prod.zone || 'Source Zone'} for "${prod.productDescription || 'Item'}". Waiting for pickup/rework.`,
                type: "Production NC",
                priority: "High",
                data: { inwardId: inward._id, productId: prod._pid, refNo: inward.refNoInternal }
              });
            }
          }
        }
      }
    } catch (notifErr) {
      console.error("Error firing createInward notifications:", notifErr);
    }

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
    const {
      finalStatus,
      finalStatusRemarks,
      finalStatusDate,
      finalStatusHistory,
      report,
      verificationRemarks,
      validationStatus,
      validationRemarks,
      validatedBy,
      validatedByName,
      validatedDate
    } = req.body;

    const inward = await ProductionMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (finalStatus !== undefined) product.finalStatus = finalStatus;
    if (finalStatusRemarks !== undefined) product.finalStatusRemarks = finalStatusRemarks;
    if (finalStatusDate !== undefined) product.finalStatusDate = finalStatusDate;
    if (finalStatusHistory !== undefined) product.finalStatusHistory = finalStatusHistory;
    if (report !== undefined) product.report = report;
    if (verificationRemarks !== undefined) product.verificationRemarks = verificationRemarks;
    if (validationStatus !== undefined) product.validationStatus = validationStatus;
    if (validationRemarks !== undefined) product.validationRemarks = validationRemarks;
    if (validatedBy !== undefined) product.validatedBy = validatedBy;
    if (validatedByName !== undefined) product.validatedByName = validatedByName;
    if (validatedDate !== undefined) product.validatedDate = validatedDate;

    // Handle Closed-Loop Validation Failure or Success notifications
    if (validationStatus === 'Failed' || validationStatus === 'Rejected') {
      product.reworkCycleCount = (product.reworkCycleCount || 0) + 1;
      const historyEntry = {
        cycle: product.reworkCycleCount,
        action: 'Validation Failed',
        remarks: validationRemarks || 'Defect still observed by originator/inspector',
        rejectedBy: validatedByName || validatedBy || 'Inspector',
        date: new Date()
      };
      product.reworkHistory = [...(product.reworkHistory || []), historyEntry];
      // Reset product report status back to pending rework for Zone B
      if (product.report) {
        product.report.status = 'Pending';
      }
      product.status = 'Rework Rejected';

      // Alert the rework technician (assignedTo) or target zone
      const recipient = product.assignedTo || product.raisedTo;
      if (recipient) {
        await notifyUser({
          recipient,
          title: `⚠️ Rework Validation Failed (Cycle ${product.reworkCycleCount})`,
          message: `Product "${product.productDescription || 'Item'}" rejected by ${validatedByName || 'Inspector'}. Reason: ${validationRemarks || 'Please re-inspect and fix'}.`,
          type: "Production NC",
          priority: "Critical",
          data: { inwardId: inward._id, productId: product._pid, cycle: product.reworkCycleCount }
        });
      }
    } else if (validationStatus === 'Passed' || validationStatus === 'Verified') {
      product.finalStatus = 'Completed';
      // Notify creator / rework technician of successful closure
      if (product.assignedTo && product.assignedTo !== validatedBy) {
        await notifyUser({
          recipient: product.assignedTo,
          title: "✅ Rework Validated & Accepted",
          message: `Your rework for "${product.productDescription || 'Item'}" has been validated and accepted by ${validatedByName || 'Inspector'}. Ticket closed.`,
          type: "Production NC",
          priority: "Medium",
          data: { inwardId: inward._id, productId: product._pid }
        });
      }
    }

    inward.markModified('products');
    await inward.save();
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
