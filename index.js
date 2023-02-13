const mongoose = require('mongoose');
require('dotenv').config();
const connectList = require('./api.json').servers;
const dbList = [];
connectList.forEach(async data => {
    require('dotenv').config();
    const db = mongoose.createConnection(process.env.MONGO_STRING + '/' + data);
    dbList.push(db);
});
setTimeout(() => {
    require('./express');
}, 5000);
module.exports = dbList;