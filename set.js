module.exports = {
    stats: {
        deaths: /^([^ ]*) (?:thought standing in fire was a good idea|died to a wither skull|was playing with magic|thought they could swim forever|was squished to death|shot themselves|fell into the void|died in a unique way|đã cố gắng tập bơi trong lava|fell from a high place|was burnt to a crisp)(.*)$/,
        killBef: /^([^ ]*) (?:killed) ([^ ]*)(.*)$/,
        killAft: /^([^ ]*) (?:was shot by|was blown up by a|was slain by|đã bị|was shot by a|was slain by a) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    }
}
