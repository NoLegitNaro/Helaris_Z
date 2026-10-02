/* global document, window */
const $ = id => document.getElementById(id)
const api = window.heraliz
let state
let toastTimeout
let launchPending = false

async function call(promise) {
    const result = await promise
    if (!result.ok) throw new Error(result.error)
    return result.data
}

function toast(message) {
    $('toast').textContent = message
    $('toast').hidden = false
    clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => { $('toast').hidden = true }, 6500)
}

function feedback(id, message, error = false) {
    $(id).textContent = message
    $(id).classList.toggle('error', error)
}

function profileMatches() {
    return state?.profile?.username === $('username').value && $('accept-rules').checked && state.profile.rulesAccepted
}

function updatePlay() {
    $('play').disabled = !state || launchPending || state.progress.busy
    $('play').firstChild.textContent = state?.progress.phase === 'running' ? 'PARTIE EN COURS ' : state?.progress.busy || launchPending ? 'PRÉPARATION EN COURS ' : profileMatches() ? 'REJOINDRE LA ZONE ' : 'CHOISIR MON PSEUDO '
}

function renderProgress(progress) {
    state.progress = progress
    $('progress-area').hidden = progress.phase === 'idle'
    $('progress-area').classList.toggle('error', progress.phase === 'error')
    $('progress-message').textContent = progress.message
    $('progress-percent').textContent = progress.percent == null ? '' : `${progress.percent} %`
    $('progress').hidden = ['error', 'running', 'idle'].includes(progress.phase)
    if (progress.percent == null) $('progress').removeAttribute('value')
    else $('progress').value = progress.percent
    for (const id of ['username', 'accept-rules', 'save-profile', 'memory', 'fullscreen', 'auto-connect']) $(id).disabled = progress.busy
    $('settings-form').querySelector('[type=submit]').disabled = progress.busy
    updatePlay()
}

function applyState(next) {
    state = next
    $('app-version').textContent = `v${state.version}`
    $('username').value = state.profile?.username || ''
    $('accept-rules').checked = state.profile?.rulesAccepted || false
    $('memory').max = state.settings.maxRAM
    $('memory').value = state.settings.ramGB
    $('memory-value').value = `${state.settings.ramGB} Go`
    $('fullscreen').checked = state.settings.fullscreen
    $('auto-connect').checked = state.settings.autoConnect
    $('save-profile').firstChild.textContent = state.profile ? 'Mettre à jour le profil ' : 'Valider mon profil '
    if (!state.discordConfigured) $('discord-caption').textContent = 'Le lien de la communauté arrive bientôt.'
    renderProgress(state.progress)
}

async function refreshStatus() {
    $('refresh-status').disabled = true
    try {
        const status = await call(api.serverStatus())
        $('server-dot').classList.toggle('online', status.state === 'online')
        $('server-status').textContent = status.state === 'online' ? `En ligne · ${status.online} / ${status.max} survivants` : status.state === 'unconfigured' ? 'Serveur en préparation' : 'Serveur injoignable pour le moment'
    } catch { $('server-status').textContent = 'Statut indisponible' }
    finally { $('refresh-status').disabled = false }
}

for (const button of document.querySelectorAll('[data-window]')) button.addEventListener('click', () => call(api.windowAction(button.dataset.window)).catch(error => toast(error.message)))
for (const button of document.querySelectorAll('[data-dialog]')) button.addEventListener('click', () => $(button.dataset.dialog).showModal())
for (const button of document.querySelectorAll('.dialog-close')) button.addEventListener('click', () => button.closest('dialog').close())
for (const button of document.querySelectorAll('[data-link]')) button.addEventListener('click', () => call(api.openLink(button.dataset.link)).catch(error => toast(error.message)))
$('home').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
$('game-folder').addEventListener('click', () => call(api.openGameFolder()).catch(error => toast(error.message)))
$('refresh-status').addEventListener('click', refreshStatus)
$('memory').addEventListener('input', () => { $('memory-value').value = `${$('memory').value} Go` })
for (const id of ['username', 'accept-rules']) $(id).addEventListener('input', () => { feedback('profile-feedback', ''); updatePlay() })

$('profile-form').addEventListener('submit', async event => {
    event.preventDefault()
    $('save-profile').disabled = true
    try {
        applyState(await call(api.saveProfile($('username').value, $('accept-rules').checked)))
        feedback('profile-feedback', 'Profil enregistré. Prêt à rejoindre la zone.')
    } catch (error) { feedback('profile-feedback', error.message, true) }
    finally { $('save-profile').disabled = Boolean(state?.progress.busy) }
})

$('settings-form').addEventListener('submit', async event => {
    event.preventDefault()
    try {
        const next = await call(api.saveSettings({ ramGB: Number($('memory').value), fullscreen: $('fullscreen').checked, autoConnect: $('auto-connect').checked }))
        state.settings = next.settings
        feedback('settings-feedback', 'Paramètres enregistrés.')
    } catch (error) { feedback('settings-feedback', error.message, true) }
})

$('play').addEventListener('click', async () => {
    if (!profileMatches()) {
        $('username').focus()
        feedback('profile-feedback', 'Valide ton pseudo et le règlement pour continuer.')
        return
    }
    if (launchPending || state.progress.busy) return
    launchPending = true
    updatePlay()
    try { await call(api.launch()) }
    catch (error) { renderProgress({ busy: false, phase: 'error', message: error.message, percent: null }) }
    finally { launchPending = false; updatePlay() }
})

async function init() {
    if (!api) {
        $('play').disabled = true
        $('server-status').textContent = 'Ouvre cette interface avec le launcher HeraliZ.'
        return
    }
    try {
        applyState(await call(api.getState()))
        api.onProgress(renderProgress)
        await refreshStatus()
        setInterval(refreshStatus, 60000)
    } catch (error) { toast(error.message); $('play').disabled = true }
}
init()
