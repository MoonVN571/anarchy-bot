const mongoose = require('mongoose');
const schema = mongoose.Schema({
    username: String,
    time: Number,
    join_count: Number,
    left_count: Number
});
module.exports = mongoose.model("seen", schema);