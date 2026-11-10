const ServiceCall    = require('./serviceCall.model');
const EscalationFlow = require('../master/models/escalationFlow.model');
const User           = require('../auth/user.model');
const Notification   = require('../notification/notification.model');
const { getIO }      = require('../../config/socket');

// ── Helper: resolve SLA steps for customerType + segment ─────────────────────
async function resolveFlow(customerType, segment) {
  const key1 = `${customerType}|${segment}`;
  const key2 = `${customerType}|Default`;
  let flow = await EscalationFlow.findOne({ type: key1 });
  if (!flow) flow = await EscalationFlow.findOne({ type: key2 });
  if (!flow) flow = await EscalationFlow.findOne({ type: customerType });
  if (!flow) flow = await EscalationFlow.findOne({ type: 'Default|Default' });
  if (!flow) flow = await EscalationFlow.findOne({ type: 'Default' });
  return flow;
}

// Helper to send real-time notification on product history status update
async function notifyForProductHistory(call, pIdx, historyItem) {
  try {
    const prod = call.products[pIdx];
    const { status, remarks, updatedBy, updatedByName, metadata } = historyItem;

    let recipient = null;
    let title = `Service Call #${call.callNumber} Update`;
    let type = 'Activity';
    let priority = 'Medium';

    switch (status) {
      case 'Support Requested':
        recipient = prod._supportPersonId || (metadata && metadata.supportPersonId);
        title = `Support Requested: Call #${call.callNumber}`;
        break;
      case 'Support Resolved':
        recipient = prod._assignedEngineerId;
        title = `Support Resolved: Call #${call.callNumber}`;
        break;
      case 'Field Visit Assigned':
        recipient = prod._fieldVisit && prod._fieldVisit.assignedTo;
        title = `Field Visit Assigned: Call #${call.callNumber}`;
        break;
      case 'Field Visit Rescheduled':
        recipient = prod._fieldVisit && prod._fieldVisit.assignedTo;
        title = `Field Visit Rescheduled: Call #${call.callNumber}`;
        break;
      case 'Field Visit Returned':
        recipient = prod._assignedEngineerId;
        title = `Field Visit Returned: Call #${call.callNumber}`;
        break;
      case 'Field Visit Closed':
        recipient = prod._assignedEngineerId;
        title = `Field Visit Closed: Call #${call.callNumber}`;
        break;
      default:
        // Fallback: Notify the primary assigned engineer if someone else updated it
        if (updatedBy !== prod._assignedEngineerId) {
          recipient = prod._assignedEngineerId;
        }
        break;
    }

    if (recipient && recipient !== 'System') {
      const { sendNotification } = require('../notification/notification.controller');
      await sendNotification({
        recipient,
        sender: updatedBy || 'System',
        type,
        title,
        message: `Product status updated to "${status}" by ${updatedByName || 'User'}. Remarks: ${remarks || 'None'}`,
        data: { callId: call._id, callNumber: call.callNumber, productIdx: pIdx },
        priority
      });
    }
  } catch (err) {
    console.error('Error in notifyForProductHistory:', err);
  }
}

// ── GET /api/service-calls/sla-employees?customerType=X&segment=Y ─────────────
// Returns the SLA flow config + Level-0 employee details.
// Used by the Assignment popup to show only eligible engineers.
exports.getSLAEmployees = async (req, res) => {
  try {
    const { customerType = 'All', segment = '' } = req.query;
    const flow = await resolveFlow(customerType, segment);

    if (!flow || !flow.steps.length) {
      return res.json({ configured: false, steps: [], level0: null });
    }

    const step0     = flow.steps[0];
    const engineers = await User.find({
      userId:        { $in: step0.engineerIds || [] },
      workingStatus: { $ne: 'Inactive' },
    }).select('-password').lean();

    // Aggregate active tasks for these engineers
    const activeTasksAggr = await ServiceCall.aggregate([
      { $unwind: "$products" },
      { $match: { 
          "products._resolved": { $ne: true },
          "products._productClosure.status": { $ne: "Closed" },
          "products._attended": true,
          "status": { $ne: "Resolved" },
          "products._assignedEngineerId": { $in: engineers.map(e => e.userId) }
      }},
      { $group: { _id: "$products._assignedEngineerId", count: { $sum: 1 } } }
    ]);

    const workload = {};
    activeTasksAggr.forEach(a => { workload[a._id] = a.count; });
    engineers.forEach(eng => { eng.activeTasks = workload[eng.userId] || 0; });

    return res.json({
      configured: true,
      flowKey:    flow.type,
      steps:      flow.steps,
      level0: {
        dept:          step0.dept,
        durationHours: step0.durationHours,
        durationMins:  step0.durationMins,
        engineers,           // full employee objects with activeTasks
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/service-calls ────────────────────────────────────────────────────
exports.getAllCalls = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    if (req.query.engineerId) {
      filter.currentEngineerId = req.query.engineerId;
    }

    let query = ServiceCall.find(filter).lean().sort({ createdAt: -1 });

    // Optional lightweight summary mode for fast dashboard lists
    if (req.query.lite === 'true') {
      query = query.select('-editHistory -products._closureEdits');
    }

    const calls = await query;
    res.json(calls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/service-calls/customer-history/:customerIdentifier ──────────────
exports.getCustomerHistory = async (req, res) => {
  try {
    const { customerIdentifier } = req.params;
    const calls = await ServiceCall.find({
      $or: [
        { customerName: customerIdentifier },
        { partyCode: customerIdentifier }
      ]
    }).lean().sort({ createdAt: -1 });
    res.json(calls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/service-calls/pending ───────────────────────────────────────────
// Returns calls that have at least one product that is un-assigned.
exports.getPendingAssignments = async (req, res) => {
  try {
    const calls = await ServiceCall.find({ status: 'Registered' }).lean().sort({ createdAt: -1 });
    res.json(calls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/service-calls ───────────────────────────────────────────────────
exports.createCall = async (req, res) => {
  try {
    const payload = { ...req.body };
    
    // Fallback: If dateTime is an invalid format (like a locale string), Mongoose will throw a CastError.
    // We intercept and replace it with a valid timestamp to prevent a 500 Internal Server Error.
    if (payload.dateTime) {
      const parsedDate = new Date(payload.dateTime);
      if (isNaN(parsedDate.getTime())) {
        payload.dateTime = payload.timestamp || new Date().toISOString();
      }
    }

    const call = await ServiceCall.create(payload);
    
    // Trigger Critical notification if priority is Critical
    if (call.priority === 'Critical') {
      const { sendNotification } = require('../notification/notification.controller');
      await sendNotification({
        recipient: 'admin', // Or fetch admin IDs
        type: 'Critical',
        title: 'New Critical Service Call',
        message: `A new critical service call #${call.callNumber} has been registered for ${call.customerName}.`,
        data: { callId: call._id, callNumber: call.callNumber },
        priority: 'Critical'
      });
    }

    try { getIO().emit('service_call_updated', call); } catch (e) {}

    res.status(201).json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/service-calls/assign ───────────────────────────────────────────
exports.assignServiceCall = async (req, res) => {
  try {
    const {
      callId,
      productIndices,
      engineerId,
      engineerName,
      department,
      resHours,
      resMins,
      segment    = '',
      customerType = 'All',
    } = req.body;

    const call = await ServiceCall.findById(callId);
    if (!call) return res.status(404).json({ message: 'Call not found' });

    const now        = new Date();
    const durationMs = (parseInt(resHours) || 0) * 3600000 + (parseInt(resMins) || 0) * 60000;
    const deadline   = new Date(now.getTime() + durationMs);

    // Find the engineer's position within the SLA flow (level 0)
    const flow       = await resolveFlow(customerType || call.customerType, segment);
    const step0      = flow?.steps?.[0];
    const engPointer = step0?.engineerIds?.indexOf(engineerId) ?? 0;

    const historyEntry = {
      level:        0,
      department,
      engineerId,
      engineerName,
      assignedAt:   now,
      deadline,
      status:       'Pending',
    };

    // Update each selected product
    productIndices.forEach(idx => {
      const prod = call.products[idx];
      if (!prod) return;

      prod._assigned             = true;
      prod._assignedAt           = now;
      prod._assignedEngineerId   = engineerId;
      prod._assignedEngineerName = engineerName;
      prod._currentDepartment    = department;
      prod._escalationLevel      = 0;
      prod._levelPointer         = 0;
      prod._escalationPointer    = Math.max(engPointer, 0);
      prod._deadline             = deadline;
      prod._isCritical           = false;
      prod._alerted50            = false;
      prod._escalationHistory    = [historyEntry];
    });

    // Call-level state
    call.status              = 'Assigned';
    call.currentEngineerId   = engineerId;
    call.currentEngineerName = engineerName;
    call.currentDepartment   = department;
    call.escalationLevel     = 0;
    call.deadline            = deadline;
    call.escalationHistory   = [...(call.escalationHistory || []), historyEntry];

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Trigger Notification for the assigned engineer
    const { sendNotification } = require('../notification/notification.controller');
    await sendNotification({
      recipient: engineerId,
      type: 'Assignment',
      title: 'New Service Call Assigned',
      message: `You have been assigned a new service call #${call.callNumber}.`,
      data: { callId: call._id, callNumber: call.callNumber },
      priority: 'High'
    });

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/service-calls/active ────────────────────────────────────────────
// Returns calls that are NOT fully resolved
exports.getActiveCalls = async (req, res) => {
  try {
    const calls = await ServiceCall.find({ status: { $ne: 'Resolved' } }).lean().sort({ createdAt: -1 });
    res.json(calls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/:id/product/:pIdx/close ─────────────────────────
exports.closeProduct = async (req, res) => {
  try {
    const { id, pIdx } = req.params;
    const closureData = req.body; // status, remarks, visitDate, assignedTo, etc.
    
    const call = await ServiceCall.findById(id);
    if (!call) return res.status(404).json({ message: 'Call not found' });
    if (!call.products[pIdx]) return res.status(404).json({ message: 'Product not found' });

    call.products[pIdx]._productClosure = closureData;

    if (closureData.returnToAssigned) {
      call.products[pIdx]._supportPersonId = null;
      call.products[pIdx]._supportPersonName = null;
      call.products[pIdx]._supportRequested = false;
    }

    // When product is marked Pending, Resolved, or Closed, clear active support request flag
    if (closureData.status === 'Pending' || closureData.status === 'Resolved' || closureData.status === 'Closed') {
      call.products[pIdx]._supportRequested = false;
    }

    if (closureData.status === 'Resolved' || closureData.status === 'Closed') {
      call.products[pIdx]._resolved = true;
      if (call.products[pIdx]._fieldVisit && call.products[pIdx]._fieldVisit.status !== 'Closed') {
        call.products[pIdx]._fieldVisit.status = 'Closed';
        call.products[pIdx]._fieldVisit.closedAt = new Date();
      }
    }
    
    // Push history event
    const historyItem = {
      status: closureData.status || 'Updated',
      updatedBy: req.body.userId || req.user?.userId || 'System',
      updatedByName: req.body.name || req.user?.name || 'System',
      remarks: closureData.remarks || '',
      metadata: { ...closureData }
    };
    call.products[pIdx]._history.push(historyItem);
    
    // Check if all assigned products are closed/resolved
    const allAssignedDone = call.products.every(p => {
      if (!p._assigned) return true;
      return p._resolved || p._productClosure?.status === 'Closed' || p._productClosure?.status === 'Resolved';
    });
    
    if (allAssignedDone) {
      call.status = 'Resolved';
    }

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Notify for product history status update
    await notifyForProductHistory(call, pIdx, historyItem);

    if (allAssignedDone) {
      // Send notification to all admins in real-time
      const { sendNotification } = require('../notification/notification.controller');
      const admins = await User.find({ role: { $in: ['Admin', 'admin'] } }).lean();
      for (const admin of admins) {
        await sendNotification({
          recipient: admin.userId,
          sender: req.body.userId || req.user?.userId || 'System',
          type: 'Activity',
          title: `Call Resolved: ${call.callNumber}`,
          message: `Service call ${call.callNumber} has been fully resolved and closed by ${req.body.name || req.user?.name || 'the assigned engineer'}.`,
          data: { callId: call._id, callNumber: call.callNumber },
          priority: 'Medium'
        });
      }
    }

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/:id/product/:pIdx/edit-report ───────────────────
// Allows employees (or admins) to edit a previously submitted closure/status report
exports.editProductReport = async (req, res) => {
  try {
    const { id, pIdx } = req.params;
    const {
      status: newStatus,
      remarks: newRemarks,
      resolutionType: newResolutionType,
      editReason,
      userId,
      name,
      role
    } = req.body;

    const call = await ServiceCall.findById(id);
    if (!call) return res.status(404).json({ message: 'Call not found' });
    const product = call.products[pIdx];
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const oldClosure = product._productClosure || {};
    const oldStatus = oldClosure.status || (product._resolved ? 'Resolved' : 'Open');
    const oldRemarks = oldClosure.remarks || '';
    const oldResType = oldClosure.resolutionType || '';

    // Calculate exact field differences
    const diffs = [];
    if (newStatus !== undefined && newStatus !== oldStatus) {
      diffs.push({
        field: 'status',
        originalValue: oldStatus,
        editedValue: newStatus
      });
    }
    if (newRemarks !== undefined && newRemarks !== oldRemarks) {
      diffs.push({
        field: 'remarks',
        originalValue: oldRemarks,
        editedValue: newRemarks
      });
    }
    if (newResolutionType !== undefined && newResolutionType !== oldResType) {
      diffs.push({
        field: 'resolutionType',
        originalValue: oldResType,
        editedValue: newResolutionType
      });
    }

    // Only record if actual values changed
    if (diffs.length > 0) {
      if (!product._closureEdits) product._closureEdits = [];
      product._closureEdits.push({
        editedAt: new Date(),
        editedBy: userId || req.user?.userId || 'Employee',
        editedByName: name || req.user?.name || 'Employee',
        role: role || req.user?.role || 'Employee',
        reason: editReason || '',
        diffs
      });

      // Update closure details
      product._productClosure = {
        ...oldClosure,
        status: newStatus !== undefined ? newStatus : oldClosure.status,
        remarks: newRemarks !== undefined ? newRemarks : oldClosure.remarks,
        resolutionType: newResolutionType !== undefined ? newResolutionType : oldClosure.resolutionType,
        lastEditedAt: new Date(),
        lastEditedBy: userId || name || 'Employee',
        lastEditReason: editReason || ''
      };

      if (newStatus === 'Resolved' || newStatus === 'Closed') {
        product._resolved = true;
      } else if (newStatus && newStatus !== 'Resolved' && newStatus !== 'Closed') {
        product._resolved = false;
      }

      // Add audit history entry
      const historyItem = {
        status: `Report Edited (${newStatus || oldStatus})`,
        updatedBy: userId || 'Employee',
        updatedByName: name || 'Employee',
        remarks: editReason ? `Reason: ${editReason}. Notes: ${newRemarks || oldRemarks}` : (newRemarks || oldRemarks),
        metadata: {
          isEdit: true,
          diffs,
          editReason: editReason || ''
        }
      };
      product._history.push(historyItem);

      // Recalculate call status
      const allAssignedDone = call.products.every(p => {
        if (!p._assigned) return true;
        return p._resolved || p._productClosure?.status === 'Closed' || p._productClosure?.status === 'Resolved';
      });
      call.status = allAssignedDone ? 'Resolved' : 'Assigned';

      call.markModified('products');
      await call.save();
      try { getIO().emit('service_call_updated', call); } catch (e) {}

      return res.json(call);
    } else {
      return res.json({ message: 'No changes detected', call });
    }
  } catch (err) {
    console.error('editProductReport Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/:id/product/:pIdx/attend ────────────────────────
exports.attendProduct = async (req, res) => {
  try {
    const { id, pIdx } = req.params;
    const call = await ServiceCall.findById(id);
    if (!call || !call.products[pIdx]) return res.status(404).json({ message: 'Not found' });

    call.products[pIdx]._attended = true;
    call.products[pIdx]._attendedAt = new Date();
    
    const historyItem = {
      status: 'Attended',
      updatedBy: req.body.userId || req.user?.userId || 'System',
      updatedByName: req.body.name || req.user?.name || 'System',
      remarks: 'Technician started attending to the product',
      metadata: { attendedAt: new Date() }
    };
    call.products[pIdx]._history.push(historyItem);

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Notify for product history status update
    await notifyForProductHistory(call, pIdx, historyItem);

    // Send notification to admins that call is attended in real-time
    const { sendNotification } = require('../notification/notification.controller');
    const admins = await User.find({ role: { $in: ['Admin', 'admin'] } }).lean();
    for (const admin of admins) {
      await sendNotification({
        recipient: admin.userId,
        sender: req.body.userId || req.user?.userId || 'System',
        type: 'Activity',
        title: `Call Attended: ${call.callNumber}`,
        message: `Service call ${call.callNumber} is currently being attended by ${req.body.name || 'the assigned engineer'}.`,
        data: { callId: call._id, callNumber: call.callNumber },
        priority: 'Low'
      });
    }

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/:id/product/:pIdx/reverse-escalate ───────────────

// ── POST /api/service-calls/:id/product/:pIdx/cancel-escalation ───────────────
// Allows Admin to cancel an active escalation, stop auto-escalation timer, notify users, and optionally re-assign
exports.cancelEscalationProduct = async (req, res) => {
  try {
    const { id, pIdx } = req.params;
    const {
      adminId,
      adminName,
      reason,
      newAssigneeId,
      newAssigneeName,
      newDepartment
    } = req.body;

    const call = await ServiceCall.findById(id);
    if (!call || !call.products[pIdx]) {
      return res.status(404).json({ message: 'Call or product not found' });
    }

    const prod = call.products[pIdx];
    const prevEngineerId = prod._assignedEngineerId;
    const prevEngineerName = prod._assignedEngineerName || 'Assigned Engineer';

    // Stop escalation on product
    prod._escalationLevel = 0;
    prod._escalationActive = false;
    prod._attended = true; // Halts SLA timer

    const now = new Date();
    const cancelReason = reason || 'Escalation cancelled by Admin';

    // Add cancellation entry to escalation history
    const cancelHist = {
      level: 0,
      assignedAt: now,
      engineerId: prevEngineerId,
      engineerName: prevEngineerName,
      status: 'Escalation Cancelled',
      reason: `${cancelReason} (by ${adminName || 'Admin'})`,
      updatedByName: adminName || 'Admin'
    };
    prod._escalationHistory = [...(prod._escalationHistory || []), cancelHist];

    // Audit log
    prod._history.push({
      status: 'Escalation Cancelled by Admin',
      updatedBy: adminId || 'Admin',
      updatedByName: adminName || 'Admin',
      remarks: `Escalation stopped for ${prevEngineerName}. Reason: ${cancelReason}`,
      metadata: {
        cancelledBy: adminName,
        previousAssigneeId: prevEngineerId,
        previousAssigneeName: prevEngineerName,
        reason: cancelReason,
        timestamp: now
      }
    });

    // If Admin immediately re-assigned to someone else
    if (newAssigneeId) {
      prod._assignedEngineerId = newAssigneeId;
      prod._assignedEngineerName = newAssigneeName || 'Engineer';
      prod._assignedDepartment = newDepartment || prod._assignedDepartment;
      prod._assignedAt = now;
      prod._attended = false; // Reset attendance for new engineer

      const reassignHist = {
        level: 1,
        assignedAt: now,
        engineerId: newAssigneeId,
        engineerName: newAssigneeName,
        department: newDepartment,
        status: 'Re-assigned by Admin',
        reason: `Re-assigned after escalation cancellation: ${cancelReason}`,
        updatedByName: adminName || 'Admin'
      };
      prod._escalationHistory.push(reassignHist);

      prod._history.push({
        status: 'Re-assigned by Admin',
        updatedBy: adminId || 'Admin',
        updatedByName: adminName || 'Admin',
        remarks: `Re-assigned to ${newAssigneeName} (${newDepartment || 'Service'})`,
        metadata: {
          newAssigneeId,
          newAssigneeName,
          newDepartment
        }
      });

      if (call.currentEngineerId === prevEngineerId || !call.currentEngineerId) {
        call.currentEngineerId = newAssigneeId;
        call.currentEngineerName = newAssigneeName;
        call.currentDepartment = newDepartment || call.currentDepartment;
      }
    }

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Send notifications
    try {
      const { sendNotification } = require('../notification/notification.controller');

      // 1. Notify the previous engineer that escalation has been stopped
      if (prevEngineerId) {
        await sendNotification({
          recipient: prevEngineerId,
          sender: adminId || 'Admin',
          type: 'Escalation',
          title: `Escalation Cancelled: #${call.callNumber}`,
          message: `The escalation on Call #${call.callNumber} (${prod.productModel || prod.itemCode || 'Product'}) was cancelled by ${adminName || 'Admin'}. Reason: ${cancelReason}`,
          data: { callId: call._id, callNumber: call.callNumber, productIdx: pIdx },
          priority: 'High'
        });
      }

      // 2. Notify new engineer if re-assigned
      if (newAssigneeId && newAssigneeId !== prevEngineerId) {
        await sendNotification({
          recipient: newAssigneeId,
          sender: adminId || 'Admin',
          type: 'Assignment',
          title: `New Call Assignment: #${call.callNumber}`,
          message: `You were assigned Call #${call.callNumber} (${prod.productModel || prod.itemCode || 'Product'}) by ${adminName || 'Admin'}.`,
          data: { callId: call._id, callNumber: call.callNumber, productIdx: pIdx },
          priority: 'High'
        });
      }
    } catch (notifErr) {
      console.error('Cancel escalation notification error:', notifErr);
    }

    res.json({ message: 'Escalation cancelled successfully', call });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reverseEscalateProduct = async (req, res) => {
  try {
    const { id, pIdx } = req.params;
    const { userId, name, reason } = req.body;

    const call = await ServiceCall.findById(id);
    if (!call || !call.products[pIdx]) return res.status(404).json({ message: 'Call or product not found' });

    const prod = call.products[pIdx];
    const escHistory = prod._escalationHistory || [];

    // 1. Identify the first assigned person (Level 0 / Original Assignee)
    const firstAssignedEntry = escHistory.length > 0 ? escHistory[0] : null;
    const firstAssignedId = firstAssignedEntry?.engineerId;

    // RULE: The first assigned person cannot reverse-escalate (there is no one before them)
    if (firstAssignedId && (prod._assignedEngineerId === firstAssignedId || userId === firstAssignedId)) {
      return res.status(400).json({
        message: 'Reverse escalation is not allowed for the first assigned engineer. You are the initial point of contact for this call.'
      });
    }

    // 2. Identify the target person to return to (the immediate previous assignee in history)
    let targetEngineerId = null;
    let targetEngineerName = null;
    let targetDepartment = null;
    let targetLevel = 0;

    for (let i = escHistory.length - 1; i >= 0; i--) {
      const h = escHistory[i];
      if (h.engineerId && h.engineerId !== prod._assignedEngineerId && h.engineerId !== userId) {
        targetEngineerId = h.engineerId;
        targetEngineerName = h.engineerName;
        targetDepartment = h.department;
        targetLevel = h.level ?? 0;
        break;
      }
    }

    if (!targetEngineerId) {
      return res.status(400).json({ message: 'No previous engineer found to reverse-escalate to.' });
    }

    // Resolve reverse escalation SLA configuration
    const flow = await resolveFlow(call.customerType || 'All', prod.productSegment || prod._assignedSegment || '');
    const revConfig = flow?.reverseEscalation || {
      enabled: true,
      durationHours: 2,
      durationMins: 0,
      onTimeout: 'same_person'
    };

    const durationMs = ((revConfig.durationHours || 2) * 60 + (revConfig.durationMins || 0)) * 60000;
    const now = new Date();
    const newDeadline = new Date(now.getTime() + durationMs);

    // Save previous state into product and update assignment
    const previousEngId = prod._assignedEngineerId || userId;
    const previousEngName = prod._assignedEngineerName || name;

    prod._assignedEngineerId = targetEngineerId;
    prod._assignedEngineerName = targetEngineerName;
    prod._currentDepartment = targetDepartment || prod._currentDepartment;
    prod._levelPointer = targetLevel;
    prod._attended = false;
    prod._attendedAt = null;
    prod._deadline = newDeadline;
    prod._isReverseEscalated = true;
    prod._isCritical = false;
    prod._reverseEscalatedFrom = previousEngId;
    prod._reverseEscalatedFromName = previousEngName;
    prod._reverseEscalationReason = reason || 'Sent back to previous engineer';
    prod._reverseEscalationAt = now;

    // Record in history
    const histEntry = {
      level: targetLevel,
      department: targetDepartment || prod._currentDepartment,
      engineerId: targetEngineerId,
      engineerName: targetEngineerName,
      assignedAt: now,
      deadline: newDeadline,
      status: 'Reverse Escalated',
      reason: reason || `Reverse Escalated by ${previousEngName}`,
    };
    prod._escalationHistory = [...(prod._escalationHistory || []), histEntry];

    const historyItem = {
      status: 'Reverse Escalated',
      updatedBy: userId || 'Employee',
      updatedByName: name || 'Employee',
      remarks: reason ? `Reverse escalated back to ${targetEngineerName}: ${reason}` : `Reverse escalated back to ${targetEngineerName}`,
      metadata: {
        targetEngineerId,
        targetEngineerName,
        previousEngId,
        previousEngName,
        deadline: newDeadline
      }
    };
    prod._history.push(historyItem);

    // Update root call state if applicable
    if (call.currentEngineerId === previousEngId || !call.currentEngineerId) {
      call.currentEngineerId = targetEngineerId;
      call.currentEngineerName = targetEngineerName;
      call.currentDepartment = targetDepartment || call.currentDepartment;
      call.escalationHistory = [...(call.escalationHistory || []), histEntry];
    }
    if (call.status === 'Critical' || call.status === 'Critical_Unresolved') {
      call.status = 'Escalated';
    }

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Send notifications
    try {
      const { sendNotification } = require('../notification/notification.controller');
      
      // 1. Notify the target engineer
      await sendNotification({
        recipient: targetEngineerId,
        sender: userId || 'System',
        type: 'Escalation',
        title: `Call Returned (Reverse Escalation): #${call.callNumber}`,
        message: `Call #${call.callNumber} for ${call.customerName || 'Customer'} was reverse-escalated back to ${targetEngineerName} by ${previousEngName}. Reason: ${reason || 'Needs review'}. SLA: ${revConfig.durationHours}h ${revConfig.durationMins || 0}m.`,
        data: { callId: call._id, callNumber: call.callNumber, productIdx: pIdx },
        priority: 'High'
      });

      // 2. Also notify the creator / registrar if different
      if (call.registeredBy && call.registeredBy !== targetEngineerId && call.registeredBy !== userId) {
        await sendNotification({
          recipient: call.registeredBy,
          sender: userId || 'System',
          type: 'Activity',
          title: `Call #${call.callNumber} Reverse-Escalated`,
          message: `${previousEngName} returned product in Call #${call.callNumber} back to ${targetEngineerName}. Reason: ${reason || 'N/A'}.`,
          data: { callId: call._id, callNumber: call.callNumber },
          priority: 'Medium'
        });
      }
    } catch (notifErr) {
      console.error('Reverse escalation notification error:', notifErr);
    }

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/service-calls/support ──────────────────────────────────────────
exports.createSupportRequest = async (req, res) => {
  try {
    const { callId, productIdx, supportPerson, notes, askedBy, askedByName } = req.body;
    
    const call = await ServiceCall.findById(callId);
    if (!call || !call.products[productIdx]) return res.status(404).json({ message: 'Call or product not found' });

    call.products[productIdx]._supportRequested = true;
    call.products[productIdx]._supportPersonId = supportPerson.userId;
    call.products[productIdx]._supportPersonName = supportPerson.name;
    call.products[productIdx]._supportRequestedAt = new Date();
    call.products[productIdx]._productClosure = {
      status: 'Support Requested',
      remarks: notes,
      supportPersonId: supportPerson.userId,
      supportPersonName: supportPerson.name,
      updatedAt: new Date()
    };
    
    const historyItem = {
      status: 'Support Requested',
      updatedBy: askedBy,
      updatedByName: askedByName,
      remarks: notes,
      metadata: { supportPerson }
    };
    call.products[productIdx]._history.push(historyItem);

    call.status = 'Escalated';
    call.markModified('products');
    await call.save();
    
    // Notify for product history status update
    await notifyForProductHistory(call, productIdx, historyItem);

    // Fetch lean document to ensure exact matching with /active payload (handles schema casting serialization gaps)
    const leanCall = await ServiceCall.findById(call._id).lean();
    try { getIO().emit('service_call_updated', leanCall); } catch (e) {}

    res.status(201).json(leanCall);
  } catch (err) {
    console.error("createSupportRequest error:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

// ── GET /api/service-calls/support/:userId ───────────────────────────────────
exports.getSupportRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const reqs = await ServiceCall.find({
      $or: [
        { 'products._supportPersonId': userId },
        { 'products._history': { $elemMatch: { status: 'Support Requested', updatedBy: userId } } }
      ]
    }).lean();
    res.json(reqs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/support/:id/resolve ─────────────────────────────
exports.resolveSupportRequest = async (req, res) => {
  try {
    // Here `id` is the callId, we need `pIdx` too, but the route is `/support/:id/resolve`
    // Actually the frontend passes `callId` as `id`, but we also need `productIdx` to resolve correctly.
    // The previous implementation used `SupportRequest` id, which mapped to callId + productIdx.
    // Wait, let's update the route parameters if needed, or get pIdx from body.
    const { id } = req.params;
    const { productIdx, status, resolutionNotes, resolutionType, resolvedAt, resolvedBy, resolvedByName } = req.body;
    
    const call = await ServiceCall.findById(id);
    if (!call || !call.products[productIdx]) return res.status(404).json({ message: 'Not found' });

    call.products[productIdx]._resolved = true;
    call.products[productIdx]._productClosure = {
      status: 'Closed',
      resolutionType,
      remarks: resolutionNotes,
      closedAt: resolvedAt || new Date()
    };
    
    const historyItem = {
      status: 'Support Resolved',
      updatedBy: resolvedBy,
      updatedByName: resolvedByName,
      remarks: resolutionNotes,
      metadata: { resolutionType, resolvedAt }
    };
    call.products[productIdx]._history.push(historyItem);

    const allAssignedDone = call.products.every(p => {
      if (!p._assigned) return true;
      return p._resolved || p._productClosure?.status === 'Closed';
    });
    
    if (allAssignedDone) {
      call.status = 'Resolved';
    }

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Notify for product history status update
    await notifyForProductHistory(call, productIdx, historyItem);

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/service-calls/field-visit ──────────────────────────────────────
exports.createFieldVisit = async (req, res) => {
  try {
    const { callId, productIdx, type, assignedTo, assignedToName, assignedBy, assignedByName, assignmentDate, visitDate, diagnosisSummary } = req.body;
    
    const call = await ServiceCall.findById(callId);
    if (!call || !call.products[productIdx]) return res.status(404).json({ message: 'Not found' });

    call.products[productIdx]._fieldVisit = {
      isAssigned: true,
      assignedTo,
      assignedToName,
      assignedBy,
      assignedByName,
      visitDate,
      diagnosisSummary,
      status: 'Open'
    };

    call.products[productIdx]._productClosure = {
      status: 'Field Visit Required',
      date: new Date(),
      remarks: diagnosisSummary
    };

    const historyItem = {
      status: 'Field Visit Assigned',
      updatedBy: assignedBy,
      updatedByName: assignedByName,
      remarks: diagnosisSummary,
      metadata: { type, assignedTo, assignedToName, visitDate, assignmentDate }
    };
    call.products[productIdx]._history.push(historyItem);

    call.markModified('products');
    await call.save();
    
    // Notify for product history status update
    await notifyForProductHistory(call, productIdx, historyItem);

    const leanCall = await ServiceCall.findById(call._id).lean();
    try { getIO().emit('service_call_updated', leanCall); } catch (e) {}

    res.status(201).json(leanCall);
  } catch (err) {
    console.error("createFieldVisit error:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

// ── GET /api/service-calls/field-visit/:userId ───────────────────────────────
exports.getFieldVisits = async (req, res) => {
  try {
    const { userId } = req.params;
    const visits = await ServiceCall.find({
      $or: [
        { 'products._fieldVisit.assignedTo': userId },
        { 'products._fieldVisit.assignedBy': userId }
      ]
    }).lean();
    res.json(visits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/field-visit/:id/close ───────────────────────────
exports.closeFieldVisit = async (req, res) => {
  try {
    const { id } = req.params; // this is callId
    const { productIdx, closedBy, closedByName, remarks } = req.body;
    
    const call = await ServiceCall.findById(id);
    if (!call || !call.products[productIdx]) return res.status(404).json({ message: 'Not found' });

    if (call.products[productIdx]._fieldVisit) {
      call.products[productIdx]._fieldVisit.status = 'Closed';
      call.products[productIdx]._fieldVisit.closedAt = new Date();
    }
    
    // The field visit engineer successfully resolved the issue
    call.products[productIdx]._resolved = true;
    if (!call.products[productIdx]._productClosure) call.products[productIdx]._productClosure = {};
    call.products[productIdx]._productClosure.status = 'Resolved';
    call.products[productIdx]._productClosure.remarks = remarks;
    call.products[productIdx]._productClosure.closedAt = new Date();
    
    const historyItem = {
      status: 'Resolved',
      updatedBy: closedBy,
      updatedByName: closedByName,
      remarks: remarks || '',
      timestamp: new Date()
    };
    call.products[productIdx]._history.push(historyItem);

    // Check if all assigned products are closed/resolved
    const allAssignedDone = call.products.every(p => {
      if (!p._assigned) return true;
      return p._resolved || p._productClosure?.status === 'Closed' || p._productClosure?.status === 'Resolved';
    });
    
    if (allAssignedDone) {
      call.status = 'Resolved';
    }

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Notify for product history status update
    await notifyForProductHistory(call, productIdx, historyItem);

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/field-visit/:id/reschedule ──────────────────────
exports.rescheduleFieldVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { productIdx, visitDate, remarks, userId, userName } = req.body;
    
    const call = await ServiceCall.findById(id);
    if (!call || !call.products[productIdx]) return res.status(404).json({ message: 'Not found' });

    if (call.products[productIdx]._fieldVisit) {
      call.products[productIdx]._fieldVisit.visitDate = new Date(visitDate);
    }
    
    const historyItem = {
      status: 'Field Visit Rescheduled',
      updatedBy: userId,
      updatedByName: userName,
      remarks: remarks || '',
      metadata: { visitDate: new Date(visitDate) },
      timestamp: new Date()
    };
    call.products[productIdx]._history.push(historyItem);

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Notify for product history status update
    await notifyForProductHistory(call, productIdx, historyItem);

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/field-visit/:id/return ─────────────────────────
exports.returnFieldVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { productIdx, remarks, userId, userName } = req.body;
    
    const call = await ServiceCall.findById(id);
    if (!call || !call.products[productIdx]) return res.status(404).json({ message: 'Not found' });

    let returnedTo = 'Support';
    if (call.products[productIdx]._fieldVisit) {
      returnedTo = call.products[productIdx]._fieldVisit.assignedByName || 'Support';
      call.products[productIdx]._fieldVisit.status = 'Returned';
      call.products[productIdx]._fieldVisit.closedAt = new Date();
    }
    
    if (call.products[productIdx]._productClosure) {
      call.products[productIdx]._productClosure.status = 'Returned from Field Visit';
      call.products[productIdx]._productClosure.date = new Date();
      call.products[productIdx]._productClosure.remarks = remarks;
    }
    
    const historyItem = {
      status: 'Field Visit Returned',
      updatedBy: userId,
      updatedByName: userName,
      remarks: remarks || '',
      metadata: { returnedTo },
      timestamp: new Date()
    };
    call.products[productIdx]._history.push(historyItem);

    call.markModified('products');
    await call.save();
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Notify for product history status update
    await notifyForProductHistory(call, productIdx, historyItem);

    res.json(call);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/service-calls/:id ──────────────────────────────────────────────
exports.updateCall = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.dateTime) {
      const parsedDate = new Date(payload.dateTime);
      if (isNaN(parsedDate.getTime())) {
        payload.dateTime = payload.timestamp || new Date().toISOString();
      }
    }

    const existingCall = await ServiceCall.findById(req.params.id);
    if (!existingCall) return res.status(404).json({ message: 'Call not found' });

    // ── Audit Diff Tracking (Admin & Employee edits) ──────────────────────────
    // Compare scalar root fields between existingCall and payload
    const auditedFields = [
      'customerName', 'partyCode', 'contactPerson', 'contactNumber', 'emailId',
      'location', 'site', 'locationType', 'segment', 'customerType', 'priority',
      'mode', 'dateTime'
    ];

    const diffs = [];
    auditedFields.forEach(f => {
      if (payload[f] !== undefined) {
        let oldVal = existingCall[f];
        let newVal = payload[f];

        // Format dates for comparison if applicable
        if (f === 'dateTime') {
          oldVal = oldVal ? new Date(oldVal).toISOString() : '';
          newVal = newVal ? new Date(newVal).toISOString() : '';
        }

        const strOld = oldVal === null || oldVal === undefined ? '' : String(oldVal);
        const strNew = newVal === null || newVal === undefined ? '' : String(newVal);

        if (strOld !== strNew) {
          diffs.push({
            field: f,
            originalValue: existingCall[f] || null,
            editedValue: payload[f]
          });
        }
      }
    });

    // Check product updates for diffs (e.g. serialNumber, errorCode, productModel)
    if (payload.products && Array.isArray(payload.products) && existingCall.products) {
      payload.products.forEach((p, idx) => {
        const ep = p._id
          ? existingCall.products.find(ex => ex._id.toString() === p._id.toString())
          : existingCall.products[idx];
        if (ep) {
          ['itemCode', 'serialNumber', 'errorCode', 'productModel', 'warrantyStatus', 'callDescription'].forEach(pf => {
            if (p[pf] !== undefined) {
              const oldPf = ep[pf] === null || ep[pf] === undefined ? '' : String(ep[pf]);
              const newPf = p[pf] === null || p[pf] === undefined ? '' : String(p[pf]);
              if (oldPf !== newPf) {
                diffs.push({
                  field: `Product ${idx + 1} (${p.productModel || ep.productModel || 'Item'}): ${pf}`,
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

      if (!payload.editHistory) payload.editHistory = existingCall.editHistory || [];
      payload.editHistory = [...payload.editHistory, editRecord];
    }

    if (payload.products && Array.isArray(payload.products)) {
      // Look for any existing assignment from the payload or the existing call
      const engId = payload.currentEngineerId || existingCall.currentEngineerId;
      const engName = payload.currentEngineerName || existingCall.currentEngineerName;
      
      const isAssigned = !!engId;

      let hasUnresolved = false;

      payload.products.forEach((p, i) => {
        // Merge existing internal state to prevent data loss
        const ep = p._id 
          ? existingCall.products.find(ex => ex._id.toString() === p._id.toString())
          : existingCall.products[i];

        if (ep) {
          p._history = ep._history;
          p._escalationHistory = ep._escalationHistory;
          p._escalationLevel = ep._escalationLevel;
          p._productClosure = ep._productClosure;
          p._fieldVisit = ep._fieldVisit;
          
          if (p._assigned === undefined) p._assigned = ep._assigned;
          if (p._assignedEngineerId === undefined) p._assignedEngineerId = ep._assignedEngineerId;
          if (p._assignedEngineerName === undefined) p._assignedEngineerName = ep._assignedEngineerName;
          if (p._assignedAt === undefined) p._assignedAt = ep._assignedAt;
          if (p._attended === undefined) p._attended = ep._attended;
          if (p._attendedAt === undefined) p._attendedAt = ep._attendedAt;
          if (p._resolved === undefined) p._resolved = ep._resolved;
          if (p._supportRequested === undefined) p._supportRequested = ep._supportRequested;
          if (p._isCritical === undefined) p._isCritical = ep._isCritical;
        }

        // Auto-assign new products to the existing engineer
        // (Also fixes existing products that were marked assigned but missed the engineer ID)
        if (isAssigned && (!p._assigned || !p._assignedEngineerId)) {
          p._assigned = true;
          if (engId) p._assignedEngineerId = engId;
          if (engName) p._assignedEngineerName = engName;
          
          // Stop escalation/timer for this new product since the tech already owns the call
          p._attended = true;
          p._attendedAt = p._attendedAt || new Date();
        }
        
        // Check if the product is unresolved
        if (!(p._resolved || p._productClosure?.status === 'Closed')) {
          hasUnresolved = true;
        }
      });

      // If new products were added, the call is no longer fully resolved
      if (hasUnresolved && (payload.status === 'Resolved' || existingCall.status === 'Resolved')) {
        payload.status = isAssigned ? 'Assigned' : 'Registered';
      }
    }

    const call = await ServiceCall.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!call) return res.status(404).json({ message: 'Call not found' });
    try { getIO().emit('service_call_updated', call); } catch (e) {}

    // Trigger Critical notification if priority changed to Critical or is updated as Critical
    if (call.priority === 'Critical') {
      const { sendNotification } = require('../notification/notification.controller');
      await sendNotification({
        recipient: 'admin',
        type: 'Critical',
        title: 'Service Call Marked Critical',
        message: `Service call #${call.callNumber} for ${call.customerName} is now CRITICAL.`,
        data: { callId: call._id, callNumber: call.callNumber },
        priority: 'Critical'
      });
    }

    res.json(call);
  } catch (err) {
    console.error("updateCall Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/service-calls/:id ─────────────────────────────────────────────
exports.deleteCall = async (req, res) => {
  try {
    const call = await ServiceCall.findByIdAndDelete(req.params.id);
    if (!call) return res.status(404).json({ message: 'Call not found' });
    try { getIO().emit('service_call_updated', { callId: req.params.id, deleted: true }); } catch (e) {}
    res.json({ message: 'Call deleted successfully' });
  } catch (err) {
    console.error("deleteCall Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/service-calls/:id/auto-escalate ────────────────────────────────
exports.autoEscalate = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalationRecord, currentLevel, currentDepartment, currentEngineerId, currentEngineerName, newStatus } = req.body;

    const call = await ServiceCall.findById(id);
    if (!call) return res.status(404).json({ message: "Call not found" });

    // Update root call pointers
    call.status = newStatus === "Critical_Unresolved" ? "Critical_Unresolved" : "Escalated";
    call._levelPointer = currentLevel;
    call._escalationPointer = 0;
    
    if (!call.assignedEngineer || call.assignedEngineer === escalationRecord.previousEngineerId) {
      call.assignedEngineer = currentEngineerId;
      call.currentEngineerId = currentEngineerId;
    }

    // Apply auto escalation to all active products
    call.products.forEach(p => {
      const pStatus = p._productClosure?.status || (p._resolved ? "Closed" : "Open");
      if (pStatus !== "Closed" && pStatus !== "Resolved" && !p._taken && !p._attended) {
        
        p._levelPointer = currentLevel;
        p._escalationPointer = 0;
        p._assignedEngineerId = currentEngineerId;
        p._assignedEngineerName = currentEngineerName;
        p._currentDepartment = currentDepartment;
        
        // Very important: update the deadline so the timer resets!
        if (req.body.escalationRecord && req.body.escalationRecord.deadline) {
           p._deadline = new Date(req.body.escalationRecord.deadline);
        } else if (req.body.deadline) {
           p._deadline = new Date(req.body.deadline);
        }

        p._history.push({
          status: newStatus === "Critical_Unresolved" ? "Critical Escalation" : "Auto Escalated",
          updatedBy: escalationRecord.previousEngineerId || "System",
          updatedByName: escalationRecord.previousEngineerName || "System",
          remarks: escalationRecord.reason,
          metadata: {
            assignedTo: currentEngineerId,
            assignedToName: currentEngineerName,
            level: currentLevel,
            department: currentDepartment
          }
        });
      }
    });

    await call.save();
    
    try {
      const io = getIO();
      io.emit("service_call_updated", call);
    } catch (e) {}

    res.json(call);
  } catch (err) {
    console.error("autoEscalate Error:", err);
    res.status(500).json({ message: err.message });
  }
};
