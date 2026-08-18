const mongoose = require('mongoose');
const ServiceCall = require('./src/models/serviceCall.model');

async function checkData() {
  await mongoose.connect('mongodb://localhost:27017/service-tool');
  const calls = await ServiceCall.find({}).lean();
  let assignedCount = 0;
  let registeredCount = 0;
  
  for (const call of calls) {
    if (call.status === "Assigned") {
      assignedCount++;
    } else if (call.status === "Registered") {
      registeredCount++;
    } else if (call.status === "Critical" || call.status === "Escalated") {
      registeredCount++;
    }
  }
  console.log(`Total DB Assigned: ${assignedCount}`);
  console.log(`Total DB Registered/Escalated: ${registeredCount}`);
  
  // check products assigned
  let pAssignedCount = 0;
  for (const call of calls) {
    if (call.products && call.products.some(p => p._assigned === true)) {
      pAssignedCount++;
    }
  }
  console.log(`Total Calls with p._assigned = true: ${pAssignedCount}`);
  
  // check currentEngineerId
  let engCount = 0;
  for (const call of calls) {
    if (call.currentEngineerId) {
      engCount++;
    }
  }
  console.log(`Total Calls with currentEngineerId: ${engCount}`);
  process.exit(0);
}
checkData();
