const mongoose = require('mongoose');
require('dotenv').config();

let config = {
    dev: true
};

mongoose.connect(process.env.MONGO_STRING).then(() => {
    console.log("Đã kết nối đến MongoDB!");

    require('./discord');
});

module.exports = { config };