const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_STRING).then(() => {
    console.log("Đã kết nối đến MongoDB!");

    require('./discord');
});