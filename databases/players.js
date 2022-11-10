const mongoose = require('mongoose');
const schema = mongoose.Schema({
    username: String,
    lastseen: Number,
    joindate: Number,
    playtime: Number,
    stats: {
        kills: Number,
        deaths: Number
    }
});
module.exports = mongoose.model("players", schema);