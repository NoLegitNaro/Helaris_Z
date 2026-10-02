const { createHash } = require('node:crypto')

function validateUsername(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(value)) {
        throw new Error('Le pseudo doit contenir 3 à 16 caractères : lettres, chiffres ou _.')
    }
    return value
}

// Minecraft uses UUID.nameUUIDFromBytes("OfflinePlayer:" + name), including case.
// This identifies a local profile; it does NOT authenticate the player's identity.
function createOfflineProfile(username) {
    validateUsername(username)
    const bytes = createHash('md5').update(`OfflinePlayer:${username}`, 'utf8').digest()
    bytes[6] = (bytes[6] & 0x0f) | 0x30
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    return {
        uuid: bytes.toString('hex'),
        displayName: username,
        username,
        type: 'offline',
        accessToken: '0'
    }
}

module.exports = { validateUsername, createOfflineProfile }
