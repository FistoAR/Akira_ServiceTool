const ServiceMaterial = require('./serviceMaterial.model');
const socketConfig = require('../../config/socket');

// ── GET /api/service-material ────────────────────────────────────────────────
exports.getAllInwards = async (req, res) => {
  try {
    const filter = {};
    if (req.query.finalStatus) {
      filter.finalStatus = req.query.finalStatus;
    }
    if (req.query.assignedTo) {
      filter['products.assignedTo'] = req.query.assignedTo;
    }

    let query = ServiceMaterial.find(filter).lean().sort({ createdAt: -1 });

    // Optional lightweight summary mode for fast dashboard lists
    if (req.query.lite === 'true') {
      query = query.select('-editHistory -products._closureEdits');
    }

    const inwards = await query;
    res.json(inwards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/service-material/:id ─────────────────────────────────────────────
exports.getInwardById = async (req, res) => {
  try {
    const inward = await ServiceMaterial.findById(req.params.id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/service-material ────────────────────────────────────────────────
exports.createInward = async (req, res) => {
  try {
    const inward = await ServiceMaterial.create(req.body);
    try {
      socketConfig.getIO().emit('service-materials-changed');
    } catch (e) {
      console.error('Socket emission error:', e);
    }
    res.status(201).json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/service-material/:id ─────────────────────────────────────────────
exports.updateInward = async (req, res) => {
  try {
    const existingInward = await ServiceMaterial.findById(req.params.id);
    if (!existingInward) return res.status(404).json({ message: 'Inward not found' });

    const payload = { ...req.body };

    // ── Audit Diff Tracking (Admin & Employee edits) ──────────────────────────
    const auditedFields = [
      'customerName', 'customerCode', 'site', 'category', 'unit',
      'refNoCustomer', 'refNoInternal', 'date'
    ];

    const diffs = [];
    auditedFields.forEach(f => {
      if (payload[f] !== undefined) {
        let oldVal = existingInward[f];
        let newVal = payload[f];

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
            editedValue: payload[f]
          });
        }
      }
    });

    // Check product updates for diffs (productCode, serialNumber, boardType, qty, type, expectedDeliveryDate)
    if (payload.products && Array.isArray(payload.products) && existingInward.products) {
      payload.products.forEach((p, idx) => {
        const ep = p._pid
          ? existingInward.products.find(ex => ex._pid === p._pid)
          : existingInward.products[idx];
        if (ep) {
          ['productCode', 'productDescription', 'serialNumber', 'boardType', 'qty', 'type', 'expectedDeliveryDate'].forEach(pf => {
            if (p[pf] !== undefined) {
              let oldPf = ep[pf];
              let newPf = p[pf];
              if (pf === 'expectedDeliveryDate') {
                oldPf = oldPf ? new Date(oldPf).toISOString().split('T')[0] : '';
                newPf = newPf ? new Date(newPf).toISOString().split('T')[0] : '';
              }
              const strOld = oldPf === null || oldPf === undefined ? '' : String(oldPf).trim();
              const strNew = newPf === null || newPf === undefined ? '' : String(newPf).trim();
              if (strOld !== strNew) {
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
        editedBy: payload._editedBy || req.user?.userId || 'Admin',
        editedByName: payload._editedByName || req.user?.name || 'Administrator',
        role: payload._editedByRole || req.user?.role || 'Admin',
        reason: payload._editReason || '',
        diffs
      };

      if (!payload.editHistory) payload.editHistory = existingInward.editHistory || [];
      payload.editHistory = [...payload.editHistory, editRecord];
    }

    delete payload._editedBy;
    delete payload._editedByName;
    delete payload._editedByRole;
    delete payload._editReason;

    const inward = await ServiceMaterial.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true }
    );
    try {
      socketConfig.getIO().emit('service-materials-changed');
    } catch (e) {
      console.error('Socket emission error:', e);
    }
    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/service-material/:id ──────────────────────────────────────────
exports.deleteInward = async (req, res) => {
  try {
    const inward = await ServiceMaterial.findByIdAndDelete(req.params.id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });
    try {
      socketConfig.getIO().emit('service-materials-changed');
    } catch (e) {
      console.error('Socket emission error:', e);
    }
    res.json({ message: 'Inward deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-material/:id/claim-product ────────────────────────────
exports.claimProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, userId, userName } = req.body;

    const inward = await ServiceMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // if (product.assignedTo) return res.status(400).json({ message: 'Product already assigned' });

    product.assignedTo = userId;
    product.assignedToName = userName;
    product.status = 'Assigned';

    inward.markModified('products');
    await inward.save();

    try {
      socketConfig.getIO().emit('service-materials-changed');
    } catch (e) {
      console.error('Socket emission error:', e);
    }

    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-material/:id/product/:productId/report ──────────────────
exports.updateProductReport = async (req, res) => {
  try {
    const { id } = req.params;
    let { productId, report } = req.body;

    if (typeof report === 'string') {
        try {
            report = JSON.parse(report);
        } catch (e) {
            return res.status(400).json({ message: 'Invalid report data' });
        }
    }

    const inward = await ServiceMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Handle image upload
    if (req.file) {
        report.image = `/uploads/${req.file.filename}`;
    }

    // ── Audit Diff Tracking for Report updates ──────────────────────────────
    const oldReport = product.report || {};
    const reportAuditedFields = [
      'testedBy', 'fqaBy', 'timeInHours', 'materialCost', 'pvCv', 'pv', 'cv', 'faultParts',
      'designators', 'disposition', 'fourMCategory', 'errorCode',
      'problemDescription', 'rootCause', 'partsReplacement', 'correctiveAction',
      'completedDate', 'status'
    ];

    const reportDiffs = [];
    reportAuditedFields.forEach(rf => {
      if (report[rf] !== undefined) {
        let oldVal = oldReport[rf];
        let newVal = report[rf];

        if (rf === 'completedDate') {
          oldVal = oldVal ? new Date(oldVal).toISOString().split('T')[0] : '';
          newVal = newVal ? new Date(newVal).toISOString().split('T')[0] : '';
        }

        const strOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
        const strNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();

        if (strOld !== strNew && (strOld !== '' || strNew !== '')) {
          reportDiffs.push({
            field: `Report (${product.productDescription || product.productCode || 'Product'}): ${rf}`,
            originalValue: oldReport[rf] || null,
            editedValue: report[rf]
          });
        }
      }
    });

    if (reportDiffs.length > 0 && (oldReport.status || oldReport.problemDescription)) {
      const editRecord = {
        editedAt: new Date(),
        editedBy: report._editedBy || req.user?.userId || product.assignedTo || 'Employee',
        editedByName: report._editedByName || req.user?.name || product.assignedToName || 'Employee',
        role: report._editedByRole || req.user?.role || 'Employee',
        reason: report._editReason || report.currentRemark || 'Report updated',
        diffs: reportDiffs
      };

      inward.editHistory = [...(inward.editHistory || []), editRecord];
    }

    product.report = report;
    product.status = report.status;
    
    // Also update remark if needed
    if (report.currentRemark) {
        product.remark = report.currentRemark;
    }

    inward.markModified('products');
    await inward.save();

    // Send notification to Admin when a user completes/resolves a product
    if (product.status === 'Completed') {
      try {
        const User = require('../auth/user.model');
        const { sendNotification } = require('../notification/notification.controller');
        const admins = await User.find({ role: { $in: ['Admin', 'admin'] } }).lean();
        const productName = product.productDescription || product.productCode || 'Product';
        const line1 = `Company: ${inward.customerName || 'N/A'} | Product: ${productName}`;
        const line2 = `Code: ${product.productCode || 'N/A'} | Serial: ${product.serialNumber || 'N/A'}`;
        for (const admin of admins) {
          await sendNotification({
            recipient: admin.userId,
            sender: product.assignedTo || 'System',
            type: 'Service Material',
            title: 'Service Material Resolved',
            message: `${line1}\n${line2}\nProduct has been resolved by ${product.assignedToName || 'User'}. Remarks: ${product.remark || 'None'}`,
            data: { inwardId: inward._id, productId: product._pid },
            priority: 'Medium'
          });
        }
      } catch (e) {
        console.error('Error sending material resolved notification:', e);
      }
    }

    try {
      socketConfig.getIO().emit('service-materials-changed');
    } catch (e) {
      console.error('Socket emission error:', e);
    }

    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-material/:id/product/:productId/edit-report ─────────────
// Allows employees (or admins) to edit a previously submitted service report
exports.editProductReport = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const {
      testedBy,
      fqaBy,
      fourMCategory,
      errorCode,
      problemDescription,
      pvCv,
      pv,
      cv,
      rootCause,
      faultParts,
      partsReplacement,
      correctiveAction,
      timeInHours,
      materialCost,
      manpowerCost,
      disposition,
      completedDate,
      status: newStatus,
      editReason,
      userId,
      name,
      role
    } = req.body;

    const inward = await ServiceMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const oldReport = product.report || {};
    const oldStatus = oldReport.status || product.status || 'Open';

    const checkFields = [
      { key: 'status', label: 'Status', old: oldStatus, new: newStatus },
      { key: 'testedBy', label: 'Tested By', old: oldReport.testedBy, new: testedBy },
      { key: 'fqaBy', label: 'FQA By', old: oldReport.fqaBy, new: fqaBy },
      { key: 'fourMCategory', label: '4M Category', old: oldReport.fourMCategory, new: fourMCategory },
      { key: 'errorCode', label: 'Error Code', old: oldReport.errorCode, new: errorCode },
      { key: 'problemDescription', label: 'Problem Description', old: oldReport.problemDescription, new: problemDescription },
      { key: 'pv', label: 'PV', old: oldReport.pv, new: pv },
      { key: 'cv', label: 'CV', old: oldReport.cv, new: cv },
      { key: 'pvCv', label: 'PV, CV', old: oldReport.pvCv, new: pvCv },
      { key: 'rootCause', label: 'Root Cause', old: oldReport.rootCause, new: rootCause },
      { key: 'faultParts', label: 'Fault Parts', old: oldReport.faultParts, new: faultParts },
      { key: 'partsReplacement', label: 'Parts Replaced', old: oldReport.partsReplacement, new: partsReplacement },
      { key: 'correctiveAction', label: 'Corrective Action', old: oldReport.correctiveAction, new: correctiveAction },
      { key: 'timeInHours', label: 'Time (Hours)', old: oldReport.timeInHours, new: timeInHours },
      { key: 'materialCost', label: 'Material Cost', old: oldReport.materialCost, new: materialCost },
      { key: 'disposition', label: 'Disposition', old: oldReport.disposition, new: disposition },
    ];

    const diffs = [];
    checkFields.forEach(cf => {
      if (cf.new !== undefined) {
        const strOld = cf.old === null || cf.old === undefined ? '' : String(cf.old).trim();
        const strNew = cf.new === null || cf.new === undefined ? '' : String(cf.new).trim();
        if (strOld !== strNew && (strOld !== '' || strNew !== '')) {
          diffs.push({
            field: cf.label,
            originalValue: cf.old || null,
            editedValue: cf.new
          });
        }
      }
    });

    if (diffs.length > 0) {
      if (!product._closureEdits) product._closureEdits = [];
      const editRecord = {
        editedAt: new Date(),
        editedBy: userId || req.user?.userId || 'Employee',
        editedByName: name || req.user?.name || 'Employee',
        role: role || req.user?.role || 'Employee',
        reason: editReason || '',
        diffs
      };
      product._closureEdits.push(editRecord);

      // Also record into top-level inward.editHistory
      inward.editHistory = [...(inward.editHistory || []), {
        ...editRecord,
        diffs: diffs.map(d => ({
          ...d,
          field: `Product (${product.productDescription || product.productCode || 'Item'}): ${d.field}`
        }))
      }];

      // Append to report history
      const historyItem = {
        status: `Report Edited (${newStatus || oldStatus})`,
        disposition: disposition !== undefined ? disposition : oldReport.disposition,
        remark: editReason ? `Reason: ${editReason}` : `Updated by ${name || 'Employee'}`,
        timestamp: new Date().toISOString(),
        metadata: {
          isEdit: true,
          diffs,
          editReason: editReason || ''
        }
      };
      if (!product.report) product.report = {};
      if (!product.report.history) product.report.history = [];
      product.report.history.push(historyItem);
    }

    // Apply updates to product.report
    product.report = {
      ...oldReport,
      ...(testedBy !== undefined && { testedBy }),
      ...(fqaBy !== undefined && { fqaBy }),
      ...(fourMCategory !== undefined && { fourMCategory }),
      ...(errorCode !== undefined && { errorCode }),
      ...(problemDescription !== undefined && { problemDescription }),
      ...(pvCv !== undefined && { pvCv }),
      ...(pv !== undefined && { pv }),
      ...(cv !== undefined && { cv }),
      ...(rootCause !== undefined && { rootCause }),
      ...(faultParts !== undefined && { faultParts }),
      ...(partsReplacement !== undefined && { partsReplacement }),
      ...(correctiveAction !== undefined && { correctiveAction }),
      ...(timeInHours !== undefined && { timeInHours }),
      ...(materialCost !== undefined && { materialCost }),
      ...(manpowerCost !== undefined && { manpowerCost: Number(manpowerCost) }),
      ...(disposition !== undefined && { disposition }),
      ...(completedDate !== undefined && { completedDate }),
      ...(newStatus !== undefined && { status: newStatus }),
      lastUpdated: new Date().toISOString()
    };

    if (newStatus !== undefined) {
      product.status = newStatus;
    }

    inward.markModified('products');
    inward.markModified('editHistory');
    await inward.save();

    try {
      socketConfig.getIO().emit('service-materials-changed');
    } catch (e) {
      console.error('Socket emission error:', e);
    }

    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updateFinalStatus = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const {
      finalStatus,
      finalStatusRemarks,
      finalStatusDate,
      finalStatusHistory,
      expectedDeliveryDate,
      report
    } = req.body;

    const inward = await ServiceMaterial.findById(id);
    if (!inward) return res.status(404).json({ message: 'Inward not found' });

    const product = inward.products.find(p => p._pid === productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (finalStatus !== undefined) product.finalStatus = finalStatus;
    if (finalStatusRemarks !== undefined) product.finalStatusRemarks = finalStatusRemarks;
    if (finalStatusDate !== undefined) product.finalStatusDate = finalStatusDate;
    if (finalStatusHistory !== undefined) product.finalStatusHistory = finalStatusHistory;
    if (expectedDeliveryDate !== undefined) product.expectedDeliveryDate = expectedDeliveryDate;
    if (report !== undefined) product.report = report;

    inward.markModified('products');
    await inward.save();

    // Send notification to the assigned user when Admin approves or denies the completion
    if (product.assignedTo && (finalStatus === 'Completed' || finalStatus === 'Admin Returned')) {
      try {
        const { sendNotification } = require('../notification/notification.controller');
        const productName = product.productDescription || product.productCode || 'Product';
        const line1 = `Company: ${inward.customerName || 'N/A'} | Product: ${productName}`;
        const line2 = `Code: ${product.productCode || 'N/A'} | Serial: ${product.serialNumber || 'N/A'}`;
        
        const statusTitle = `Material Status Updated: ${finalStatus === 'Completed' ? 'Approved' : 'Denied'}`;
        const statusMessage = finalStatus === 'Completed' 
          ? `Admin has approved your completion request.` 
          : `Admin Reject this completion.`;

        await sendNotification({
          recipient: product.assignedTo,
          sender: 'System',
          type: 'Service Material',
          title: statusTitle,
          message: `${line1}\n${line2}\n${statusMessage}\nRemarks: ${finalStatusRemarks || 'None'}`,
          data: { inwardId: inward._id, productId: product._pid },
          priority: 'Medium'
        });
      } catch (e) {
        console.error('Error sending material final status notification:', e);
      }
    }

    try {
      socketConfig.getIO().emit('service-materials-changed');
    } catch (e) {
      console.error('Socket emission error:', e);
    }

    res.json(inward);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
