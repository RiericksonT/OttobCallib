const { ipcRenderer, shell, clipboard } = require("electron")
var { exec } = require('child_process')
const { SerialPort } = require('serialport')
var fs = require('fs')
var path = require('path')

var arduino_basepath = process.platform == 'win32' ? './compilation/arduino' : path.join(__dirname, '../../compilation/arduino')
var arduino_ide_cmd = process.platform == 'win32' ? 'arduino-cli.exe' : arduino_ide_cmd = path.join(__dirname, '../../compilation/arduino/arduino-cli')
var sketch_temp_path = process.platform == 'win32' ? arduino_basepath + '/sketch' : "/tmp/ottocalib/sketch"
var sketch_temp_file_path = sketch_temp_path + '/sketch.ino'

var appVersion = ipcRenderer.sendSync('appVersion', '')

var html_bt_quit = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>'

var messageDiv = null
var messageFooter = null
var quitDiv = ''
var sp_conn = null
var currentCom = null
var timeoutId = null

window.addEventListener('load', function load(event) {
	messageDiv = document.getElementById('messageDIV')
	messageFooter = document.getElementById('messageFooter')
	localStorage.setItem("verif", false)
	createSketchTempFolder()

	getSerialPorts() //fill serial ports
	declareOnChangeNumberFieldEvents()
	declareOnMouseMovimentEventsToChangeOttoImage()

	$('#portserie').mouseover(function () {
		getSerialPortsOnMouseOver()
	})

	$('#bt_connection').on('click', function () {
		connect()
	})
	$('#bt_walk').on('click', function () {
		writeToPort("w", "Walking...", 1000)
	})

	$('#bt_save').on('click', function () {
		writeToPort("s", 'Saved!', 1000)
	})

	$('#btn_dance').on('click', function () {
		pathSketch = path.join(__dirname, '../../www/sketch/dance/dance.ino')
		data = fs.readFileSync(pathSketch)
		writeSketchDataToFile(data)
		flashCode(sketch_temp_file_path)
	})
	$('#btn_calib').on('click', function () {
		pathSketch = path.join(__dirname, '../../www/sketch/calib_script/calib_script.ino')
		data = fs.readFileSync(pathSketch)
		writeSketchDataToFile(data)
		flashCode(sketch_temp_file_path)
	})

	document.getElementById('btn_quit').onclick = function (event) {
		ipcRenderer.invoke('win_quit', null).then((result) => {
			// ...
		})
	}

	startVerifyPortTimeout(500)
})

function writeSketchDataToFile(data) {
	fs.writeFileSync(`${sketch_temp_file_path}`, data)
}

function declareOnChangeNumberFieldEvents() {
	$("#lLegNumber").on("change", function () {
		validateAndWriteCMDByInput("lLegNumber", "lLegLabel", "a")
	})

	$("#bt_lLegNumberPlus").click(function () {
		validateClickOnBtPlus("lLegNumber")
		validateAndWriteCMDByInput("lLegNumber", "lLegLabel", "a")
	})

	$("#bt_lLegNumberMinus").click(function () {
		validateClickOnBtMinus("lLegNumber")
		validateAndWriteCMDByInput("lLegNumber", "lLegLabel", "a")
	})

	//-------------------------------------------
	$("#rLegNumber").on("change", function () {
		validateAndWriteCMDByInput("rLegNumber", "rLegLabel", "b")
	})

	$("#bt_rLegNumberPlus").click(function () {
		validateClickOnBtPlus("rLegNumber")
		validateAndWriteCMDByInput("rLegNumber", "rLegLabel", "b")
	})

	$("#bt_rLegNumberMinus").click(function () {
		validateClickOnBtMinus("rLegNumber")
		validateAndWriteCMDByInput("rLegNumber", "rLegLabel", "b")
	})

	//-------------------------------------------
	$("#lFootNumber").on("change", function () {
		validateAndWriteCMDByInput("lFootNumber", "lFootLabel", "c")
	})

	$("#bt_lFootNumberPlus").click(function () {
		validateClickOnBtPlus("lFootNumber")
		validateAndWriteCMDByInput("lFootNumber", "lFootLabel", "c")
	})

	$("#bt_lFootNumberMinus").click(function () {
		validateClickOnBtMinus("lFootNumber")
		validateAndWriteCMDByInput("lFootNumber", "lFootLabel", "c")
	})

	//-------------------------------------------
	$("#rFootNumber").on("change", function () {
		validateAndWriteCMDByInput("rFootNumber", "rFootLabel", "d")
	})

	$("#bt_rFootNumberPlus").click(function () {
		validateClickOnBtPlus("rFootNumber")
		validateAndWriteCMDByInput("rFootNumber", "rFootLabel", "d")
	})

	$("#bt_rFootNumberMinus").click(function () {
		validateClickOnBtMinus("rFootNumber")
		validateAndWriteCMDByInput("rFootNumber", "rFootLabel", "d")
	})
}

function validateClickOnBtPlus(inputId, defaultValue = "90", max = 180) {
	elemet = document.getElementById(inputId)
	value = elemet.value
	if (value == null || value == "") {
		elemet.value = defaultValue
	} else {
		newValue = parseInt(value) + 1
		if (newValue <= max) {
			elemet.value = newValue
		}
	}
}

function validateClickOnBtMinus(inputId, defaultValue = "90", min = 0) {
	elemet = document.getElementById(inputId)
	value = elemet.value
	if (value == null || value == "") {
		elemet.value = defaultValue
	} else {
		newValue = parseInt(value) - 1
		if (newValue >= min) {
			elemet.value = newValue
		}
	}
}

function validateAndWriteCMDByInput(inputId, labelId, cmd, defaultValue = "90", min = 0, max = 180) {
	elemet = document.getElementById(inputId)
	value = elemet.value
	if (value == null || value == "" || value > max || value < min) {
		elemet.value = defaultValue
	} else {
		$(labelId).text(" = " + value + "º")
		writeToPort(value + cmd)
	}
}

function declareOnMouseMovimentEventsToChangeOttoImage() {
	$("#lLegDiv").mouseover(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoLL.jpg')
		$("#ottoImg").attr("src", src_new)

	})

	$("#lLegDiv").mouseout(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoMain.jpg')
		$("#ottoImg").attr("src", src_new)

	})

	$("#rLegDiv").mouseover(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoRL.jpg')
		$("#ottoImg").attr("src", src_new)

	})

	$("#rLegDiv").mouseout(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoMain.jpg')
		$("#ottoImg").attr("src", src_new)

	})

	$("#lFootDiv").mouseover(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoLF.jpg')
		$("#ottoImg").attr("src", src_new)

	})

	$("#lFootDiv").mouseout(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoMain.jpg')
		$("#ottoImg").attr("src", src_new)

	})

	$("#rFootDiv").mouseover(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoRF.jpg')
		$("#ottoImg").attr("src", src_new)

	})

	$("#rFootDiv").mouseout(function () {
		src_new = path.join(__dirname, '../../www/assets/otto/OttoMain.jpg')
		$("#ottoImg").attr("src", src_new)

	})
}

async function getSerialPortsOnMouseOver() {
	await SerialPort.list().then((ports, err) => {
		if (err) {
			ipcRenderer.send("print", err.message)
			return
		}
		if (ports.length === 0) {
			ipcRenderer.send("print", 'No ports discovered')
		}
		var portserie = document.getElementById('portserie')
		var nb_com = localStorage.getItem("nb_com")
		var menu_opt = portserie.getElementsByTagName('option')
		if (ports.length > nb_com) {
			ports.forEach(function (port, index) {
				if (port.vendorId) {
					var opt = document.createElement('option')
					opt.value = port.path
					opt.text = port.path
					portserie.appendChild(opt)
					localStorage.setItem("com", port.path)
				}
			})
			localStorage.setItem("nb_com", ports.length)
			localStorage.setItem("com", portserie.options[1].value)
		}
		if (ports.length < nb_com) {
			while (menu_opt[1]) {
				portserie.removeChild(menu_opt[1])
			}
			localStorage.setItem("com", "com")
			localStorage.setItem("nb_com", ports.length)
		}
	})
}

async function getSerialPorts() {
	await SerialPort.list().then((ports, err) => {
		if (err) {
			ipcRenderer.send("print", err.message)
			return
		}
		//ipcRenderer.send("print", ports);

		if (ports.length === 0) {
			ipcRenderer.send("print", 'No ports discovered')
		}
		var opt = document.createElement('option')
		opt.value = "com"
		opt.text = Blockly.Msg.com1
		portserie.appendChild(opt)
		ports.forEach(function (port) {
			if (port.vendorId) {
				var opt = document.createElement('option')
				opt.value = port.path
				opt.text = port.path
				portserie.appendChild(opt)
			}
		})
		localStorage.setItem("nb_com", ports.length)
		if (portserie.options.length > 1) {
			portserie.selectedIndex = 1
			localStorage.setItem("com", portserie.options[1].value)
		} else {
			localStorage.setItem("com", "com")
		}
	})
}


function startVerifyPortTimeout(timeout) {
	timeoutIdConnection = setInterval(function () {
		getSerialPortsOnMouseOver()
	}, timeout);
}

function verifyCode(path) {
	var carte = localStorage.getItem('card')
	var prog = localStorage.getItem('prog')
	var portserie = document.getElementById('portserie')
	var com = portserie.value

	msg = Blockly.Msg.check + '<i class="fa fa-spinner fa-pulse fa-1_5x fa-fw"></i>'
	showMessageDiv('#000000', msg, null, false)

	if (prog == "python") {
		fs.writeFile('./compilation/python/py/sketch.py', data, function (err) {
			if (err) return ipcRenderer.send("print", err)
		})
		exec('python -m pyflakes ./py/sketch.py', { cwd: "./compilation/python" }, function (err, stdout, stderr) {
			if (stderr) {
				rech = RegExp('token')
				if (rech.test(stderr)) {
					showMessageDiv('#ff0000', Blockly.Msg.error)
				} else {
					showMessageDiv('#ff0000', err.toString())
				}
				return
			}
			msg = Blockly.Msg.check + ':✅ OK'
			showMessageDiv('#009000', msg)
		})
	} else {
		upload_arg = window.profile[carte].upload_arg
		cmd = `${arduino_ide_cmd} compile --fqbn ` + upload_arg + ` ${path}`
		return new Promise((resolve, reject) => {
			let check = exec(cmd, { cwd: arduino_basepath })
			check.on('exit', (code) => {
				if (code === 0) {
					resolve('Command executed!');
				}
			})
			check.stderr.on('data', function (data) {
				reject(data.toString())
			})
		})
	}
	localStorage.setItem("verif", true)
}

function createSketchTempFolder() {
	fs.mkdir(`${sketch_temp_path}`, { recursive: true }, (err) => {
		if (err)
			throw err
	})
}

function uploadOK() {
	msg = '✅\tCode uploaded'
	showMessageDiv('#009000', msg, 3000)
}

function showMessageDiv(color, msg, timeout = null, close_bt = true) {
	messageDiv.style.color = color
	messageDiv.innerHTML = msg

	if (close_bt) {
		messageFooter.innerHTML = html_bt_quit
	} else {
		messageFooter.innerHTML = ''
	}

	// $('#message').modal({
	// 	keyboard: false,
	// 	backdrop: static
	// })
	$('#message').modal("show")
	if (timeoutId != null) {
		clearTimeout(timeoutId)
	}
	if (timeout != null) {
		timeoutId = setTimeout(function () {
			$('#message').modal('hide');
		}, timeout);
	}
}

function writeToPort(data, msg = null, timeout = 3000) {
	connect().then((successMessage) => {
		sp_conn.write(data, function (err) {
			if (err) {
				showMessageDiv('#ff0000', err.toString())
				return
			}
			ipcRenderer.send("print", 'Message written:' + data)
			if (msg) {
				showMessageDiv('#009000', msg, timeout)
			}
			return true
		})
	}).catch(function (errorMessage) {
		showMessageDiv('#ff0000', errorMessage)
	})

}

function isConnetionOpened() {
	return sp_conn !== null && sp_conn.isOpen
}

function connect() {
	portserie = document.getElementById('portserie')
	com = portserie.value
	baud = 9600
	return new Promise((resolve, reject) => {
		if (com == "com") {
			reject(Blockly.Msg.com2)
			return
		}
		if (com == "" || com === null) {
			reject("The port is not defined!")
			return
		}
		if (isConnetionOpened()) {
			if (com == currentCom) {
				resolve("The connection is already oppened!")
				return
			} else {
				closeConnection()
			}
		}
		sp_conn = new SerialPort({
			path: com,
			baudRate: baud,
			autoOpen: false
		})

		let check = sp_conn.open((err) => {
			if (err) {
				reject(err.toString())
				return
			}
			currentCom = com
			resolve('✅ - Port connected!');
		})
	})
}

function closeConnection() {
	return new Promise((resolve, reject) => {
		if (isConnetionOpened()) {
			let check = sp_conn.close((err) => {
				if (err) {
					reject(err.toString())
					return
				}
				currentCom = null
				resolve('✅ - Port disconnected!');
			})
		} else {
			reject("The connection is not opened!")
		}
	})

}

function flashCode(path) {
	var data = $('#pre_previewArduino').text()
	var portserie = document.getElementById('portserie')
	var carte = localStorage.getItem('card')
	var prog = profile[carte].prog
	var speed = profile[carte].speed
	var cpu = profile[carte].cpu
	var com = portserie.value
	var upload_arg = window.profile[carte].upload_arg

	connect().then((successMessage) => {
		showMessageDiv('#009000', successMessage, 3000)
		var promise = new Promise(function (resolve, reject) {
			if (localStorage.getItem('verif') == "false") {
				verifyCode(path).then(() => {
					msg = '✅ - The code is ready to upload'
					showMessageDiv('#009000', msg, 3000)
					localStorage.setItem("verif", true)
					resolve()
				}).catch(err => {
					reject(err.toString())
				})
			} else {
				resolve()
			}
		})

		promise
			.then(function (successMessage) {
				msg = Blockly.Msg.upload + '<i class="fa fa-spinner fa-pulse fa-1_5x fa-fw"></i>'
				showMessageDiv('#000000', msg, null, false)
				if (prog == "python") {
					flasCodehPython(cpu, data, com)
				} else {
					flashCodeArduino(path, upload_arg)
				}
				localStorage.setItem("verif", false)
			})
			.catch(function (errorMessage) {
				showMessageDiv('#ff0000', errorMessage.toString())
			});
	}).catch(function (errorMessage) {
		showMessageDiv('#ff0000', errorMessage)
		console.log(errorMessage);
	})
}

function flashCodeArduino(path, upload_arg) {
	cmd = `${arduino_ide_cmd} upload --port ` + portserie.value + ' --fqbn ' + upload_arg + ` ${path}`
	exec(cmd, { cwd: `${arduino_basepath}` }, function (err, stdout, stderr) {
		if (err) {
			showMessageDiv('#ff0000', err.toString())
			return
		}
		uploadOK()
	})
}

function flasCodehPython(cpu, data, com) {
	if (cpu == "cortexM0") {
		var cheminFirmware = "./compilation/python/firmware.hex"
		var fullHexStr = ""
		exec('wmic logicaldisk get volumename', function (err, stdout) {
			if (err)
				return ipcRenderer.send("print", err)
			localStorage.setItem("volumename", stdout.split('\r\r\n').map(value => value.trim()))
		})
		exec('wmic logicaldisk get name', function (err, stdout) {
			if (err)
				return ipcRenderer.send("print", err)
			localStorage.setItem("name", stdout.split('\r\r\n').map(value => value.trim()))
		})
		var volume = localStorage.getItem("volumename")
		var drive = localStorage.getItem("name")
		var volumeN = volume.split(',')
		var driveN = drive.split(',')
		var count = volumeN.length
		var disk = ""
		for (var i = 0; i < count; i++) {
			if (volumeN[i] == "MICROBIT")
				disk = driveN[i]
		}
		if (disk != "") {
			fs.readFile(cheminFirmware, function (err, firmware) {
				firmware = String(firmware)
				fullHexStr = upyhex.injectPyStrIntoIntelHex(firmware, data)
				fs.writeFile(disk + '\sketch.hex', fullHexStr, function (err) {
					if (err) {
						showMessageDiv('#ff0000', err.toString())
					}
				})
			})
			setTimeout(uploadOK, 7000)
		} else {
			showMessageDiv('#000000', 'Connect micro:bit!')
		}
	} else {
		exec('python -m ampy -p ' + com + ' -b 115200 -d 1 run --no-output ./py/sketch.py', { cwd: "./compilation/python" }, function (err, stdout, stderr) {
			if (err) {
				showMessageDiv('#ff0000', err.toString())
				return
			}
			uploadOK()
		})
	}
}
