const ServiceMaterial = require('../models/serviceMaterial.model');
const socketConfig = require('../config/socket');

// ── GET /api/service-material ────────────────────────────────────────────────
exports.getAllInwards = async (req, res) => {
  try {
    const inwards = await ServiceMaterial.find().lean().sort({ createdAt: -1 });
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
    const inward = await ServiceMaterial.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!inward) return res.status(404).json({ message: 'Inward not found' });
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
        const User = require('../models/user.model');
        const { sendNotification } = require('./notification.controller');
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

// ── PATCH /api/service-material/:id/product/:productId/final-status ───────────
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
        const { sendNotification } = require('./notification.controller');
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
