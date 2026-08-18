const ServiceCall = require('../models/serviceCall.model');
const User = require('../models/user.model');
const { getIO } = require('../socket');
const { resolveFlow } = require('../controllers/serviceCall.controller'); 

const ESCALATION_INTERVAL_MS = 10000; // Run every 10 seconds

async function processEscalations() {
  try {
    const now = new Date();
    // Find calls with unresolved products whose deadline has passed
    const calls = await ServiceCall.find({
      status: { $ne: 'Resolved' },
      products: {
        $elemMatch: {
          _resolved: { $ne: true },
          _taken: { $ne: true },
          _attended: { $ne: true },
          _deadline: { $lt: now }
        }
      }
    });

    for (const call of calls) {
      let callModified = false;
      
      const flow = await resolveFlow(call.customerType || 'All', call.segment || '');
      if (!flow || !flow.steps.length) continue;

      for (const p of call.products) {
        const pStatus = p._productClosure?.status || (p._resolved ? "Closed" : "Open");
        if (pStatus === 'Closed' || pStatus === 'Resolved' || p._taken || p._attended) continue;
        
        if (p._deadline && new Date(p._deadline) < now) {
          // Escalate this product
          const nextLevelIndex = (p._levelPointer || 0) + 1;
          const nextStep = flow.steps[nextLevelIndex];

          if (nextStep) {
            // Find least busy engineer in nextStep
            const validIds = nextStep.engineerIds || [];
            if (validIds.length === 0) continue; // No engineers configured for this level

            // Calculate workload map for these engineers
            const engineers = await User.find({
              userId: { $in: validIds },
              workingStatus: { $ne: 'Inactive' },
              role: { $nin: ['Admin', 'admin', 'Supervisor', 'supervisor'] }
            }).lean();

            if (engineers.length === 0) continue;

            // Simple least-busy calculation:
            // Since we need an efficient way, we can aggregate active tasks
            const activeTasksAggr = await ServiceCall.aggregate([
              { $unwind: "$products" },
              { $match: { 
                  "products._resolved": { $ne: true },
                  "products._assignedEngineer": { $in: validIds }
              }},
              { $group: { _id: "$products._assignedEngineer", count: { $sum: 1 } } }
            ]);

            const workload = {};
            activeTasksAggr.forEach(a => { workload[a._id] = a.count; });

            let leastBusyEng = engineers[0];
            let minTasks = workload[leastBusyEng.userId] || 0;

            for (const eng of engineers) {
              const tasks = workload[eng.userId] || 0;
              if (tasks < minTasks) {
                minTasks = tasks;
                leastBusyEng = eng;
              }
            }

            // Perform escalation on product
            const oldEngineerId = p._assignedEngineer;
            const oldEngineerName = p._assignedEngineerName;
            
            p._levelPointer = nextLevelIndex;
            p._assignedEngineer = leastBusyEng.userId;
            p._assignedEngineerName = leastBusyEng.name;
            p._currentDepartment = nextStep.dept;
            
            // Set new deadline
            const durMs = (parseInt(nextStep.durationHours) || 0) * 3600000 + (parseInt(nextStep.durationMins) || 0) * 60000;
            p._deadline = new Date(now.getTime() + durMs);

            p._history.push({
              status: "Auto Escalated",
              updatedBy: "System",
              updatedByName: "System",
              remarks: "Timer Expired",
              metadata: {
                assignedTo: leastBusyEng.userId,
                assignedToName: leastBusyEng.name,
                level: nextLevelIndex,
                department: nextStep.dept
              }
            });

            callModified = true;
          } else {
            // No next step -> Critical Unresolved
            if (p._escalationPointer !== -1) {
              p._escalationPointer = -1; // Mark as exhausted
              p._history.push({
                status: "Critical Escalation",
                updatedBy: "System",
                updatedByName: "System",
                remarks: "Timer Expired (Final Level)",
                metadata: {
                  assignedTo: p._assignedEngineer,
                  assignedToName: p._assignedEngineerName,
                  level: p._levelPointer,
                  department: p._currentDepartment
                }
              });
              callModified = true;
            }
          }
        }
      }

      if (callModified) {
        // Check if any product is critical to update root call status
        const isCritical = call.products.some(p => p._escalationPointer === -1);
        call.status = isCritical ? "Critical_Unresolved" : "Escalated";
        
        await call.save();
        
        try {
           const io = getIO();
           io.emit("service_call_updated", call);
        } catch(e) {}
      }
    }
  } catch (err) {
    console.error("Escalation Worker Error:", err);
  }
}

function startEscalationWorker() {
  setInterval(processEscalations, ESCALATION_INTERVAL_MS);
  console.log("Backend Escalation Worker started");
}

module.exports = { startEscalationWorker };
