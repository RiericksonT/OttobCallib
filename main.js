var { electron, ipcMain, app, BrowserWindow, globalShortcut, dialog } = require('electron')
var { autoUpdater } = require("electron-updater")
var path = require('path')
var mainWindow, termWindow, factoryWindow, promptWindow, promptOptions, promptAnswer, htmlWindow, gamesWindow, viewWindow
autoUpdater.autoDownload = false
autoUpdater.logger = null

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1024,
		height: 660,
		icon: path.join(__dirname, '../../www/media/icon.png'),
		frame: false,
		movable: true,		
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
			contextIsolation: false
		}
	})
	if (process.platform == 'win32' && process.argv.length >= 2) {
		var file = process.argv[1]
		if (file.endsWith(".bloc") || file.endsWith(".ino") || file.endsWith(".py")) {
			mainWindow.loadURL(path.join(__dirname, '../../www/index.html?url=' + file))
		}
		if (file.endsWith(".www") || file.endsWith(".html")) {
			mainWindow.loadURL(path.join(__dirname, '../../www/ffau.html?url=' + file))
		}
	} else {
		mainWindow.loadURL('file://' + path.join(__dirname, '/../../www/index.html'))
	}
	mainWindow.setMenu(null)
	mainWindow.on('closed', function () {
		mainWindow = null
	})
	//mainWindow.webContents.openDevTools()
}

function open_console(mainWindow = BrowserWindow.getFocusedWindow()) {
	if (mainWindow) mainWindow.webContents.toggleDevTools()
}
function refresh(mainWindow = BrowserWindow.getFocusedWindow()) {
	if (mainWindow) mainWindow.webContents.reloadIgnoringCache()
}
app.on('ready', function () {
	createWindow()
	globalShortcut.register('F8', open_console)
	globalShortcut.register('F5', refresh)
})
app.on('activate', function () {
	if (mainWindow === null) createWindow()
})
app.on('window-all-closed', function () {
	globalShortcut.unregisterAll()
	if (mainWindow) {
		mainWindow.webContents.executeJavaScript('localStorage.setItem("loadOnceBlocks", "")')
		mainWindow.webContents.executeJavaScript('localStorage.setItem("pwd", "")')
	}
	if (htmlWindow) htmlWindow.webContents.executeJavaScript('localStorage.setItem("pwd", "")')
	if (process.platform !== 'darwin') app.quit()
})


ipcMain.on('appVersion', (event, arg) => {
	console.log("App version:"+ app.getVersion())
	event.returnValue = app.getVersion() // sync
})

ipcMain.on('print', (event, arg) => {
	console.log(arg)
})


ipcMain.handle('win_quit', async (event, someArgument) => {
	app.quit()
	return
})

ipcMain.handle('win_max', async (event, someArgument) => {
	if (mainWindow.isMaximized()) {
		mainWindow.unmaximize()
	} else {
		mainWindow.maximize()
	}
	return
})

ipcMain.handle('win_min', async (event, someArgument) => {
	mainWindow.minimize()
	return
})

ipcMain.on("version", function () {
	autoUpdater.checkForUpdates()
})

ipcMain.on("reload", function (event) {
	mainWindow.loadURL(path.join(__dirname, '../../www/index.html'))
})
ipcMain.on("openDialog", function (event, data) {
	event.returnValue = JSON.stringify(promptOptions, null, '')
})
ipcMain.on("closeDialog", function (event, data) {
	promptAnswer = data
})
module.exports.open_console = open_console
module.exports.refresh = refresh