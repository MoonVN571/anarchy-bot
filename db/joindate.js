const mongoose = require('mongoose');
const schema = mongoose.Schema({
    username: { type: String, default: undefined },
    time: { type: Number, default: null }
});
module.exports = mongoose.model("joindate", schema);