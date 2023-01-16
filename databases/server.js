const mongoose = require('mongoose');
const schema = mongoose.Schema({
    last_updated: Number,
    tps: Number,
    players: Number,
    ping: Number,
    queue: Number
});
module.exports = mongoose.model("server", schema);