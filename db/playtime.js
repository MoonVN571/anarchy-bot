const mongoose = require('mongoose');
const schema = mongoose.Schema({
    username: String,
    time: Number
});
module.exports = mongoose.model("playtime", schema);