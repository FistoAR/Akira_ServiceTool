const mongoose = require('mongoose');
const Notification = require('./models/notification.model');
require('dotenv').config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/akira_service_tool');
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
        console.log('Recent Notifications:', JSON.stringify(notifications, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
