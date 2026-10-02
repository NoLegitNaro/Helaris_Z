const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { isTrustedFrame, httpsUrl } = require('./app/assets/js/security')
const config = require('./app/heraliz.json')

// Test runs never touch the player's real profile or game installation.
if (!app.isPackaged && process.env.HERALIZ_TEST_DATA) app.setPath('userData', process.env.HERALIZ_TEST_DATA)
const pageUrl = pathToFileURL(path.join(__dirname, 'app', 'index.html')).href
let win
let service

function handle(name, action) {
    ipcMain.handle(`heraliz:${name}`, async (event, ...args) => {
        if (!win || !isTrustedFrame(event, win.webContents, pageUrl)) throw new Error('Accès refusé.')
        try {
            return { ok: true, data: await action(...args) }
        } catch (error) {
            console.error(`[HeraliZ/${name}]`, error)
            return { ok: false, error: error.message || 'Une erreur est survenue. Réessaie dans un instant.' }
        }
    })
}

function createWindow() {
    win = new BrowserWindow({
        title: 'HeraliZ Launcher', width: 1180, height: 780,
        minWidth: 940, minHeight: 680, frame: false, show: false,
        backgroundColor: '#0b0d0e',
        icon: path.join(__dirname, 'app', 'assets', 'images', 'heraliz-emblem.png'),
        webPreferences: {
            preload: path.join(__dirname, 'app', 'preload.js'),
            nodeIntegration: false, contextIsolation: true, sandbox: true,
            webSecurity: true, webviewTag: false
        }
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', event => event.preventDefault())
    win.webContents.on('will-attach-webview', event => event.preventDefault())
    win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    win.webContents.session.setPermissionCheckHandler(() => false)
    win.removeMenu()
    win.once('ready-to-show', () => win.show())
    win.on('close', async event => {
        if (!service?.busy) return
        event.preventDefault()
        const { response } = await dialog.showMessageBox(win, {
            type: 'question', title: 'HeraliZ est en cours d’utilisation',
            message: 'Un téléchargement ou une partie est en cours.',
            detail: 'Tu peux réduire le launcher. Fermer arrête la préparation, mais laisse une partie déjà lancée ouverte.',
            buttons: ['Rester', 'Fermer'], defaultId: 0, cancelId: 0
        })
        if (response === 1) { service.dispose(); win.destroy(); app.quit() }
    })
    win.on('closed', () => { win = null })
    win.loadURL(pageUrl)
}

if (!app.requestSingleInstanceLock()) app.quit()
else {
    app.on('second-instance', () => { if (win) { win.restore(); win.focus() } })
    app.whenReady().then(() => {
        const LauncherService = require('./app/assets/js/launcher-service')
        service = new LauncherService(config, progress => {
            if (win && !win.isDestroyed()) {
                win.webContents.send('heraliz:progress', progress)
                win.setProgressBar(progress.busy && progress.phase !== 'running' ? (progress.percent == null ? 2 : progress.percent / 100) : -1)
            }
        })
        handle('state', () => service.getState())
        handle('profile', value => service.saveProfile(value))
        handle('settings', value => service.saveSettings(value))
        handle('status', () => service.getServerStatus())
        handle('launch', () => service.launch())
        handle('folder', () => service.openGameFolder())
        handle('link', async name => {
            const links = { discord: config.discordUrl, releases: 'https://github.com/NoLegitNaro/Helaris_Z/releases' }
            if (!Object.hasOwn(links, name) || !links[name]) throw new Error('Ce lien n’est pas encore configuré.')
            const url = httpsUrl(links[name])
            if (name === 'discord' && !['discord.gg', 'discord.com'].includes(url.hostname)) throw new Error('Lien Discord invalide.')
            await shell.openExternal(url.href)
        })
        handle('window', action => {
            if (action === 'minimize') win.minimize()
            else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize()
            else if (action === 'close') win.close()
            else throw new Error('Action inconnue.')
        })
        createWindow()
    })
}
app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => service?.dispose())
