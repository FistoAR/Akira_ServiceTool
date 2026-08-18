const mongoose = require('mongoose');
const uri = 'mongodb://fistotechnical02_db_user:sham123400@ac-clq8fz4-shard-00-00.oah6axa.mongodb.net:27017,ac-clq8fz4-shard-00-01.oah6axa.mongodb.net:27017,ac-clq8fz4-shard-00-02.oah6axa.mongodb.net:27017/akira_service_tool?ssl=true&replicaSet=atlas-36xpnw-shard-0&authSource=admin&appName=cluster1';

mongoose.connect(uri)
  .then(async () => {
    try {
      await mongoose.connection.collection('customers').dropIndex('itemCode_1');
      console.log('Dropped itemCode_1 index');
    } catch (e) {
      console.log('Index drop error:', e.message);
    }
    
    try {
      await mongoose.connection.collection('customers').createIndex({ partyCode: 1, itemCode: 1 }, { unique: true });
      console.log('Created compound index');
    } catch (e) {
      console.log('Index create error:', e.message);
    }
    
    process.exit(0);
  });
