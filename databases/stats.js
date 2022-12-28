const mongoose = require('mongoose');
const schema = mongoose.Schema({
    username: String,
    kills: Number,
    deaths: Number
});
module.exports = mongoose.model("stats", schema);