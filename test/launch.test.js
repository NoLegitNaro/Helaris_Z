const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { EventEmitter } = require('node:events')
const { createOfflineProfile } = require('../app/assets/js/offline-profile')

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heraliz-test-'))
const originalLoad = Module._load
const dl = require('helios-core/dl')
const fakeApp = { getPath: () => directory, getVersion: () => '1.3.0' }
Module._load = function(name, parent, isMain) {
    if (name === 'electron') return { app: fakeApp, shell: { openPath: async () => '' } }
    return originalLoad.call(this, name, parent, isMain)
}
const Config = require('../app/assets/js/configmanager')
const ProcessBuilder = require('../app/assets/js/processbuilder')
const LauncherService = require('../app/assets/js/launcher-service')
Module._load = originalLoad
test.after(() => fs.rmSync(directory, { recursive: true, force: true }))
const config = { serverId: 'heraliz-1.20.1', serverAddress: null, distributionUrl: null }

test('saved profile replaces Microsoft credentials and exposes no tokens', () => {
    Config.load()
    Config.addMicrosoftAuthAccount('previous', 'mc-secret', 'OldUser', 0, 'ms-secret', 'refresh-secret', 0)
    Config.save()
    const service = new LauncherService(config, () => {})
    assert.equal(service.getState().profile, null)
    assert.deepEqual(Config.getAuthAccounts(), {})
    assert.throws(() => service.saveProfile({ username: 'Survivant', acceptedRules: false }))
    service.saveProfile({ username: 'Survivant', acceptedRules: true })
    service.saveProfile({ username: 'Another', acceptedRules: true })
    assert.equal(Object.keys(Config.getAuthAccounts()).length, 1)
    const restarted = new LauncherService(config, () => {})
    assert.equal(restarted.getState().profile.username, 'Another')
    assert.equal(JSON.stringify(restarted.getState()).includes('accessToken'), false)
    assert.equal(fs.readFileSync(path.join(directory, 'config.json'), 'utf8').includes('refresh-secret'), false)
})

test('unconfigured launch performs no downloads and releases the busy lock', async () => {
    const service = new LauncherService(config, () => {})
    service.saveProfile({ username: 'Survivant', acceptedRules: true })
    await assert.rejects(service.launch(), /préparation/)
    assert.equal(service.busy, false)
    assert.equal(service.progress.phase, 'error')
    assert.equal((await service.getServerStatus()).state, 'unconfigured')
})

test('concurrent launches and settings edits are rejected during preparation', async () => {
    const service = new LauncherService(config, () => {})
    let unblock
    service.loadDistribution = () => new Promise((_resolve, reject) => { unblock = reject })
    const launch = service.launch()
    await assert.rejects(service.launch(), /déjà en cours/)
    assert.throws(() => service.saveSettings({ ramGB: 4, fullscreen: false, autoConnect: true }), /verrouillés/)
    assert.throws(() => service.saveProfile({ username: 'Other', acceptedRules: true }), /Attends/)
    unblock(new Error('network failure'))
    await assert.rejects(launch, /network failure/)
    assert.equal(service.busy, false)
})

test('RAM and settings values are validated in the main process', () => {
    const service = new LauncherService(config, () => {})
    for (const value of [null, { ramGB: -1 }, { ramGB: 999 }, { ramGB: '4' }, { ramGB: 4.5 }, { ramGB: 4, fullscreen: 'false' }]) assert.throws(() => service.saveSettings(value))
    service.saveSettings({ ramGB: 2, fullscreen: false, autoConnect: true })
    assert.equal(service.getState().settings.ramGB, 2)
})

test('Minecraft 1.20.1 receives offline identity, quick play and no unresolved tokens', () => {
    Config.setFullscreen(false)
    Config.setAutoConnect(true)
    const server = { rawServer: { id: config.serverId, minecraftVersion: '1.20.1', autoconnect: true }, hostname: 'play.example.com', port: 25565 }
    const vanilla = { assets: '5', type: 'release', arguments: { jvm: ['-cp', '${classpath}'], game: ['--username', '${auth_player_name}', '--uuid', '${auth_uuid}', '--accessToken', '${auth_access_token}', '--clientId', '${clientid}', '--xuid', '${auth_xuid}', '--userType', '${user_type}', { rules: [{ action: 'allow', features: { has_custom_resolution: true } }], value: ['--width', '${resolution_width}'] }] } }
    const loader = { mainClass: 'cpw.mods.bootstraplauncher.BootstrapLauncher', arguments: { jvm: [], game: ['--launchTarget', 'forgeclient'] } }
    const before = JSON.stringify(vanilla)
    const profile = createOfflineProfile('Survivant')
    const builder = new ProcessBuilder(server, vanilla, loader, profile, '1.3.0')
    builder.classpathArg = () => ['classpath']
    const args = builder.constructJVMArguments([], directory)
    assert.equal(args[args.indexOf('--username') + 1], 'Survivant')
    assert.equal(args[args.indexOf('--uuid') + 1], profile.uuid)
    assert.equal(args[args.indexOf('--accessToken') + 1], '0')
    assert.equal(args[args.indexOf('--quickPlayMultiplayer') + 1], 'play.example.com:25565')
    assert.equal(args.some(arg => String(arg).includes('${')), false)
    assert.equal(JSON.stringify(vanilla), before)
    assert.deepEqual(builder.constructJVMArguments([], directory), args)
})

test('same-size corrupt download is rejected before any post-download processing', async () => {
    const assetPath = path.join(directory, 'bad.jar')
    const asset = { id: 'bad', path: assetPath, size: 4, url: 'https://example.com/bad.jar', algo: 'md5', hash: createHash('md5').update('good').digest('hex') }
    let processed = false
    const processor = class {
        async init() {}
        async validate() { return { files: [asset] } }
        async postDownload() { processed = true }
    }
    Module._load = function(name, parent, isMain) {
        if (name === 'electron') return { app: fakeApp }
        if (name === 'helios-core/dl') return { ...dl, MojangIndexProcessor: processor, DistributionIndexProcessor: processor, downloadQueue: async () => fs.writeFileSync(assetPath, 'evil') }
        return originalLoad.call(this, name, parent, isMain)
    }
    delete require.cache[require.resolve('../app/assets/js/launcher-service')]
    const TestService = require('../app/assets/js/launcher-service')
    Module._load = originalLoad
    const service = new TestService(config, () => {})
    await assert.rejects(service.repair({}, { rawServer: { id: config.serverId } }), /corrompu/)
    assert.equal(processed, false)
    assert.equal(fs.existsSync(assetPath), false)
})

test('launch succeeds through the preparation pipeline and unlocks on game exit', async () => {
    const child = new EventEmitter()
    const build = ProcessBuilder.prototype.build
    ProcessBuilder.prototype.build = () => child
    const service = new LauncherService(config, () => {})
    service.loadDistribution = async () => ({ getServerById: () => ({ rawServer: { id: config.serverId } }) })
    service.ensureJava = async () => {}
    service.repair = async () => ({ version: {}, loader: {} })
    try {
        assert.deepEqual(await service.launch(), { started: true })
        child.emit('spawn')
        assert.equal(service.progress.phase, 'running')
        assert.equal(service.busy, true)
        child.emit('close', 0)
        assert.equal(service.busy, false)
        assert.equal(service.progress.phase, 'idle')
    } finally { ProcessBuilder.prototype.build = build }
})
