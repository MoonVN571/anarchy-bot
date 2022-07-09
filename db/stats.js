const mongoose = require('mongoose');
const schema = mongoose.Schema({
    username: { type: String, default: undefined },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 }
});
module.exports = mongoose.model("stats", schema);