const mongoose = require('mongoose');
const ServiceCall = require('./src/models/serviceCall.model');
require('dotenv').config();

const payload = {
  callNumber: 'SC-' + Date.now(),
  dateTime: '29/06/2026, 18:06:30',
  timestamp: new Date().toISOString(),
  mode: "", priority: "Medium",
  customerType: "All", partyCode: "PC123", customerName: "Test Name",
  products: [{}]
};

if (payload.dateTime) {
  const parsedDate = new Date(payload.dateTime);
  if (isNaN(parsedDate.getTime())) {
    payload.dateTime = payload.timestamp || new Date().toISOString();
  }
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    return ServiceCall.create(payload);
  })
  .then((call) => {
    console.log("Success:", call);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    process.exit(1);
  });
