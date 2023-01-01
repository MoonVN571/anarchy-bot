const mongoose = require('mongoose');
require('dotenv').config();
const connectList = ['anarchyvn', '2b2c'];
const dbList = [];
connectList.forEach(async data => {
    const db = mongoose.createConnection(process.env.MONGO_STRING + '/' + data);
    dbList.push(db);
});
setTimeout(() => {
    require('./express');
}, 5000);
module.exports = dbList;