/**
 * escalationWorker.service.js
 *
 * Runs every 30 seconds and checks all active ServiceCall products.
 * If a product's SLA deadline has passed and it is still unresolved,
 * it automatically escalates to the next configured engineer in the
 * SLA flow (same level → next engineer → next level → Critical).
 */

const ServiceCall    = require('../models/serviceCall.model');
const EscalationFlow = require('../models/escalationFlow.model');
const User           = require('../models/user.model');
const socketConfig   = require('../config/socket');

const WORKER_INTERVAL_MS = 10 * 1000; // 30 s

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the SLA flow key the same way the frontend does. */
function flowKey(customerType, segment) {
  return `${customerType}|${segment}`;
}

/** Load all SLA flows as a map keyed by `type`. */
async function loadFlowMap() {
  const flows = await EscalationFlow.find().lean();
  const map   = {};
  flows.forEach(f => { map[f.type] = f.steps; });
  return map;
}

/** Load all active users as a map keyed by userId. */
async function loadUserMap() {
  const users = await User.find({ workingStatus: { $ne: 'Inactive' } })
                          .select('-password').lean();
  const map   = {};
  users.forEach(u => { map[u.userId] = u; });
  return map;
}

/**
 * Resolve the best matching SLA steps for a given customerType + segment.
 * Priority: exact → fallback default segment → customerType-only.
 */
function resolveSteps(flowMap, customerType, segment) {
  return (
    flowMap[flowKey(customerType, segment)] ||
    flowMap[flowKey(customerType, 'Default')] ||
    flowMap[customerType] ||
    flowMap['Default|Default'] ||
    flowMap['Default'] ||
    null
  );
}

// ─── Core escalation logic ────────────────────────────────────────────────────

async function runEscalationCheck() {
  try {
    const now = new Date();

    // Only fetch calls that have at least one product past its deadline
    const calls = await ServiceCall.find({
      status:                  { $nin: ['Resolved', 'Critical'] },
      'products._assigned':    true,
      'products._resolved':    { $ne: true },
      'products._isCritical':  { $ne: true },
      'products._deadline':    { $lt: now },
    });

    if (!calls.length) return;

    const [flowMap, userMap] = await Promise.all([loadFlowMap(), loadUserMap()]);

    // Calculate workload map for all engineers
    const activeTasksAggr = await ServiceCall.aggregate([
      { $unwind: "$products" },
      { $match: { "products._assigned": true, "products._attended": true, "products._resolved": { $ne: true } } },
      { $group: { _id: "$products._assignedEngineerId", count: { $sum: 1 } } }
    ]);
    const workloads = {};
    activeTasksAggr.forEach(a => { workloads[a._id] = a.count; });

    let io;
    try { io = socketConfig.getIO(); } catch { /* socket not yet ready */ }

    for (const call of calls) {
      let modified = false;

      for (let pIdx = 0; pIdx < call.products.length; pIdx++) {
        const prod = call.products[pIdx];

        // Skip products that don't need action
        if (!prod._assigned)          continue;
        if (prod._resolved)            continue;
        if (prod._isCritical)          continue;
        if (!prod._deadline)           continue;
        if (prod._deadline > now)      continue;
        if (prod._productClosure?.status === 'Closed') continue;
        if (prod._supportRequested)    continue;
        if (prod._attended)            continue;

        // Find SLA steps for this product
        const steps = resolveSteps(
          flowMap,
          call.customerType || 'All',
          prod.productSegment || prod._assignedSegment || ''
        );

        if (!steps || !steps.length) {
          // No SLA configured at all — mark Critical immediately
          prod._isCritical = true;
          call.status = 'Critical';
          modified = true;
          _emitCritical(io, call, pIdx, prod);
          continue;
        }

        // Walk levels/engineers to find the next available person
        const lvlPointer = prod._levelPointer  ?? 0;
        const escPointer = prod._escalationPointer ?? 0;

        let nextEngineer   = null;
        let nextLevel      = lvlPointer;
        let nextEngIdx     = escPointer;
        let nextStep       = null;

        outer:
        for (let lvl = lvlPointer; lvl < steps.length; lvl++) {
          const step = steps[lvl];
          if (!step.engineerIds || !step.engineerIds.length) continue;
          
          const numEngineers = step.engineerIds.length;
          
          // Find who was already assigned to this call AT THIS LEVEL
          const assignedInThisLevel = new Set(
            (prod._escalationHistory || []).filter(h => h.level === lvl).map(h => h.engineerId)
          );
          if (lvl === lvlPointer && prod._assignedEngineerId) {
            assignedInThisLevel.add(prod._assignedEngineerId);
          }

          // Remaining engineers
          const remainingIds = step.engineerIds.filter(id => !assignedInThisLevel.has(id) && userMap[id]);

          if (remainingIds.length === 0) {
            // Everyone in this level has been tried. Move to next level.
            continue;
          }

          // Pick the one with the minimum workload
          let bestEngId = remainingIds[0];
          let minLoad = workloads[bestEngId] || 0;

          for (let i = 1; i < remainingIds.length; i++) {
            const id = remainingIds[i];
            const load = workloads[id] || 0;
            if (load < minLoad) {
              minLoad = load;
              bestEngId = id;
            }
          }

          nextEngineer = userMap[bestEngId];
          nextLevel = lvl;
          nextEngIdx = step.engineerIds.indexOf(bestEngId);
          nextStep = step;

          // Optimistically increment their workload
          workloads[bestEngId] = minLoad + 1;

          break outer;
        }

        if (!nextEngineer) {
          // All levels exhausted — CRITICAL
          prod._isCritical  = true;
          const lastEngineerId = prod._assignedEngineerId;
          
          // Re-assign to the first person who was assigned (Level 0)
          const firstAssignment = (prod._escalationHistory && prod._escalationHistory.length > 0) ? prod._escalationHistory[0] : null;
          
          if (firstAssignment) {
            prod._assigned = true;
            prod._assignedEngineerId = firstAssignment.engineerId;
            prod._assignedEngineerName = firstAssignment.engineerName;
            prod._currentDepartment = firstAssignment.department;
            
            call.currentEngineerId = firstAssignment.engineerId;
            call.currentEngineerName = firstAssignment.engineerName;
            call.currentDepartment = firstAssignment.department;
            
            const exhaustEntry = {
              level:       firstAssignment.level || 0,
              department:  firstAssignment.department,
              engineerId:  firstAssignment.engineerId,
              engineerName: firstAssignment.engineerName,
              assignedAt:  now,
              deadline:    null,
              status:      'Critical',
              reason:      'Escalation Exhausted - Returned to Primary',
            };
            
            prod._escalationHistory = [...(prod._escalationHistory || []), exhaustEntry];
            call.escalationHistory = [...(call.escalationHistory || []), exhaustEntry];
            
            const { sendNotification } = require('../controllers/notification.controller');
            sendNotification({
              recipient: firstAssignment.engineerId,
              type: 'Critical',
              title: 'Escalation Exhausted',
              message: `Call #${call.callNumber} has completely breached SLA and returned to you.`,
              data: { callId: call._id, callNumber: call.callNumber },
              priority: 'Critical'
            }).catch(() => {});

            if (lastEngineerId && lastEngineerId !== firstAssignment.engineerId) {
              sendNotification({
                recipient: lastEngineerId,
                type: 'Critical',
                title: 'Escalation Exhausted',
                message: `all level exhausted and it assigned to the "${firstAssignment.engineerName}"`,
                data: { callId: call._id, callNumber: call.callNumber },
                priority: 'Critical'
              }).catch(() => {});
            }
          } else {
            prod._assigned    = false; 
          }
          
          call.status       = 'Critical';
          modified          = true;
          _emitCritical(io, call, pIdx, prod);
        } else {
          // Assign to next engineer
          const durationMs = (
            ((nextStep.durationHours || 0) * 60 + (nextStep.durationMins || 0)) * 60000
          );
          const newDeadline = new Date(now.getTime() + durationMs);

          const histEntry = {
            level:       nextLevel,
            department:  nextStep.dept,
            engineerId:  nextEngineer.userId,
            engineerName: nextEngineer.name,
            assignedAt:  now,
            deadline:    newDeadline,
            status:      'Pending',
            reason:      'SLA Auto-Escalation',
          };

          modified = true;

          // Notification integration
          const { sendNotification } = require('../controllers/notification.controller');
          
          // Notify the engineer it was escalated FROM
          if (prod._assignedEngineerId) {
            await sendNotification({
              recipient: prod._assignedEngineerId,
              type: 'Escalation',
              title: 'Call Escalated',
              message: `Call #${call.callNumber} has been escalated to ${nextEngineer.name}.`,
              data: { callId: call._id, callNumber: call.callNumber, escalatedTo: nextEngineer.name },
              priority: 'Medium'
            });
          }

          // Update product state
          const oldEngineerId = prod._assignedEngineerId;
          const oldEngineerName = prod._assignedEngineerName;
          prod._assignedEngineerId   = nextEngineer.userId;
          prod._assignedEngineerName = nextEngineer.name;
          prod._currentDepartment    = nextStep.dept;
          prod._escalationLevel      = nextLevel;
          prod._levelPointer         = nextLevel;
          prod._escalationPointer    = nextEngIdx;
          prod._deadline             = newDeadline;
          prod._assignedAt           = now;
          prod._alerted50            = false;
          prod._attended             = false;
          prod._attendedAt           = null;
          prod._escalationHistory    = [...(prod._escalationHistory || []), histEntry];

          // Notify the NEW engineer with details of SLA breach
          await sendNotification({
            recipient: nextEngineer.userId,
            type: 'Assignment',
            title: 'Call Escalated to You (SLA Breached)',
            message: `SLA Breached! Call #${call.callNumber} for ${call.customerName} was breached by ${oldEngineerName || 'previous level'} and has been escalated to you.`,
            data: { callId: call._id, callNumber: call.callNumber, escalatedFrom: oldEngineerName },
            priority: 'High'
          });

          // Update call-level state too
          call.currentEngineerId   = nextEngineer.userId;
          call.currentEngineerName = nextEngineer.name;
          call.currentDepartment   = nextStep.dept;
          call.escalationLevel     = nextLevel;
          call.escalationHistory   = [...(call.escalationHistory || []), histEntry];

          if (io) {
            io.emit('call:escalated', {
              callId:       call._id.toString(),
              callNumber:   call.callNumber,
              productIdx:   pIdx,
              productModel: prod.productModel,
              toEngineer:   nextEngineer.name,
              department:   nextStep.dept,
              level:        nextLevel,
            });
          }
        }
      }

      if (modified) {
        call.markModified('products');
        call.markModified('escalationHistory');
        await call.save();
        if (io) {
          io.emit('service_call_updated', call);
        }
      }
    }
  } catch (err) {
    console.error('[EscalationWorker] Error:', err.message);
  }
}

async function _emitCritical(io, call, pIdx, prod) {
  if (!io) return;
  
  // Create notification for admins
  const { sendNotification } = require('../controllers/notification.controller');
  const User = require('../models/user.model');
  
  try {
    const admins = await User.find({ role: { $in: ['Admin', 'admin'] } });
    for (const admin of admins) {
      await sendNotification({
        recipient: admin.userId,
        type: 'Critical',
        title: 'Critical Service Call Alert',
        message: `Service Call #${call.callNumber} for ${call.customerName} has reached Critical state!`,
        data: { callId: call._id, callNumber: call.callNumber, productIdx: pIdx },
        priority: 'Critical'
      });
    }
  } catch (err) {
    console.error('Error notifying admins of critical call:', err);
  }

  io.emit('call:critical', {
    callId:       call._id.toString(),
    callNumber:   call.callNumber,
    customerName: call.customerName,
    productIdx:   pIdx,
    productModel: prod.productModel,
  });
}

async function check50PercentAlerts(io) {
  try {
    const now = new Date();
    // Find calls that are active and have assigned products that are not resolved, not critical, and not already alerted 50%
    const calls = await ServiceCall.find({
      status: { $ne: 'Resolved' },
      'products._assigned': true,
      'products._resolved': { $ne: true },
      'products._isCritical': { $ne: true },
      'products._alerted50': { $ne: true }
    });

    for (const call of calls) {
      let modified = false;
      for (let pIdx = 0; pIdx < call.products.length; pIdx++) {
        const prod = call.products[pIdx];
        if (!prod._assigned || prod._resolved || prod._isCritical || prod._alerted50) continue;
        if (!prod._assignedAt || !prod._deadline) continue;

        const assignedTime = new Date(prod._assignedAt).getTime();
        const deadlineTime = new Date(prod._deadline).getTime();
        const totalDuration = deadlineTime - assignedTime;

        if (totalDuration <= 0) continue;

        const fiftyPercentTime = assignedTime + (totalDuration / 2);

        if (now.getTime() >= fiftyPercentTime) {
          // Send 50% alert notification
          const { sendNotification } = require('../controllers/notification.controller');
          await sendNotification({
            recipient: prod._assignedEngineerId,
            sender: 'System',
            type: 'Escalation',
            title: `SLA Deadline 50% Warning`,
            message: `Your call #${call.callNumber} will be escalated to the next person soon. You have reached 50% of the scheduled time.`,
            data: { callId: call._id, callNumber: call.callNumber, productIdx: pIdx },
            priority: 'High'
          });

          prod._alerted50 = true;
          modified = true;
        }
      }

      if (modified) {
        call.markModified('products');
        await call.save();
        if (io) {
          io.emit('service_call_updated', call);
        }
      }
    }
  } catch (err) {
    console.error('Error in 50% alert check:', err);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

function startEscalationWorker() {
  console.log('[EscalationWorker] Started — checking every 10 s');
  let io;
  try { io = socketConfig.getIO(); } catch { /* socket not yet ready */ }

  const tick = async () => {
    await runEscalationCheck();
    await check50PercentAlerts(io);
  };

  tick();
  setInterval(tick, WORKER_INTERVAL_MS);
}

module.exports = { startEscalationWorker };
