const path = require('node:path')

function httpsUrl(value) {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) {
        throw new Error('Une adresse HTTPS sans identifiants est requise.')
    }
    return url
}

function isTrustedFrame(event, webContents, pageUrl) {
    return event.sender === webContents && event.senderFrame === webContents.mainFrame && event.senderFrame.url === pageUrl
}

function safeRelativePath(value) {
    if (typeof value !== 'string' || !value || /[\x00-\x1f:]/.test(value) || path.win32.isAbsolute(value) || path.posix.isAbsolute(value)) {
        throw new Error('Chemin de fichier interdit dans la distribution.')
    }
    if (value.replace(/\\/g, '/').split('/').some(part => part === '..' || part === '.' || !part)) {
        throw new Error('Chemin de fichier interdit dans la distribution.')
    }
}

function validateDistribution(raw, config) {
    if (!raw || !Array.isArray(raw.servers) || raw.servers.length !== 1) {
        throw new Error('La distribution doit contenir uniquement le serveur HeraliZ.')
    }
    const server = raw.servers[0]
    if (server.id !== config.serverId || server.minecraftVersion !== '1.20.1' || server.address !== config.serverAddress) {
        throw new Error('La distribution ne correspond pas au serveur HeraliZ configuré.')
    }
    safeRelativePath(server.id)
    if (server.id.includes('/') || server.id.includes('\\')) throw new Error('Identifiant de serveur invalide.')
    if (!Array.isArray(server.modules) || !server.modules.some(m => m.type === 'ForgeHosted' && /^net\.minecraftforge:forge:1\.20\.1-47\./.test(m.id))) {
        throw new Error('Le manifeste Forge 1.20.1 manque dans la distribution.')
    }
    let count = 0
    function validateModules(modules, depth = 0) {
        if (!Array.isArray(modules) || depth > 20) throw new Error('Distribution trop complexe.')
        for (const module of modules) {
            if (++count > 10000 || !module.artifact) throw new Error('Module invalide.')
            if (typeof module.id !== 'string' || /[/\\\x00-\x20]/.test(module.id) || module.id.includes('..')) throw new Error('Identifiant de module invalide.')
            if (!['ForgeHosted', 'ForgeMod', 'Library', 'File', 'VersionManifest'].includes(module.type)) throw new Error('Type de module non autorisé.')
            httpsUrl(module.artifact.url)
            if (!/^[a-f0-9]{32}$/i.test(module.artifact.MD5) || !Number.isSafeInteger(module.artifact.size) || module.artifact.size < 0) {
                throw new Error('Empreinte ou taille de module manquante.')
            }
            if (module.artifact.path != null) safeRelativePath(module.artifact.path)
            if (module.subModules) validateModules(module.subModules, depth + 1)
        }
    }
    validateModules(server.modules)
    // Keep Forge 1.20.1 on Java 17 even if the remote manifest requests another JVM.
    server.javaOptions = { supported: '17.x', suggestedMajor: 17, distribution: 'TEMURIN' }
    return raw
}

module.exports = { httpsUrl, isTrustedFrame, safeRelativePath, validateDistribution }
