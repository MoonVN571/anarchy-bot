const mongoose = require('mongoose');
const schema = mongoose.Schema({
    username: String,
    first_death: {
        msg: String,
        time: Number
    },
    last_death: {
        msg: String,
        time: Number
    },
    first_messages: {
        msg: String,
        time: Number
    },
    last_messages: {
        msg: String,
        time: Number
    },
    first_kill: {
        msg: String,
        time: Number
    },
    last_kill: {
        msg: String,
        time: Number
    }
});
module.exports = mongoose.model("msgs", schema);