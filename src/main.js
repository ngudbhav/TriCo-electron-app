const {
	app, BrowserWindow, ipcMain, dialog, nativeTheme,
} = require('electron');
const path = require('path');
const excelToMongoDB = require('excel-to-mongodb');
const excelToMYSQL = require('excel-to-mysql');

const historyDb = require('./models/history');
const mysqlDb = require('./models/mysql');
const mongoDb = require('./models/mongo');

const {
	handleProgress, constructCommonOptions, handleCredAndHistory, checkUpdates,
	showMessageDialogBox,
} = require('./utils');

// app.disableHardwareAcceleration();
let mainWindow;
//Create the main window
const createWindow = () => {
	mainWindow = new BrowserWindow({
		backgroundColor: nativeTheme.shouldUseDarkColors ? '#333333' : '#ffffff',
		width: 1200, height: 800, frame: false,
		webPreferences: {
			nodeIntegration: false,
			nodeIntegrationInWorker: false,
			nodeIntegrationInSubFrames: false,
			contextIsolation: true,
			enableRemoteModule: true,
			preload: path.join(__dirname, '../web', 'preload.js'),
			disableBlinkFeatures: "Auxclick",
		}
	});
	mainWindow.loadFile(path.join(__dirname, '../web', 'index.html')).then();
	mainWindow.removeMenu();
	mainWindow.webContents.openDevTools()

	// Send history and other data after window is loaded. Also check for updates.
	mainWindow.on('ready-to-show', () => {
		//Load the previous MySQL credentials
		mysqlDb.find({}, (error, docs) => {
			if(!error){
				if(docs.length){
					mainWindow.webContents.send('startup-mysql', docs);
				}
			}
		});
		mongoDb.find({}, (error, docs) => {
			if(!error){
				if(docs.length){
					mainWindow.webContents.send('startup-mongo', docs);
				}
			}
		});
		//Load the full history
		historyDb.loadHistory(mainWindow);
	});
	checkUpdates('auto', mainWindow);
}

ipcMain.on('update', () => {
	checkUpdates('user', mainWindow);
});

ipcMain.on('error', (_e, item) => {
	dialog.showErrorBox(item, '');
})

//Function to perform onclick of clear history button
ipcMain.on('clearHistory', () => {
	showMessageDialogBox({
		sync: true,
		type: 'question',
		buttons:['Yes', 'No'],
		title: 'Clear everything?',
		detail: 'This will clear the records. The data backups won\'t be removed. You can remove the backups manually in the installation directory.',
	}, response => {
		if(response === 0){
			historyDb.remove({}, {multi:true});
			historyDb.loadHistory(mainWindow);
		}
	});
});

//Initiate the MongoDB Conversion
ipcMain.on('readXlsForMongo', (e, item) => {
	let count = 0;
	const pathArray = item.files;
	const options = constructCommonOptions(item);

	handleCredAndHistory(mongoDb, 'MONGO', item);

	if (item.safeMode) {
		options.destination = dialog.showOpenDialogSync(mainWindow, {
			properties: ['openDirectory']
		});
		if (!options.destination) return;
		options.destination = options.destination[0];
	}

	//Batch processing for all the input files
	pathArray.every((filePath, i) => {
		let success = true;
		if (options.destination)
			options.destination = path.join(options.destination, `trico-${i}.sql`)
		excelToMongoDB.covertToMongo({
			host: "localhost",
			path: filePath,
			collection: item.table,
			db: item.db,
			user: item.username,
			pass: item.password,
			endConnection: true,
		}, options, error => {
			if(error){
				success = false;
				if(error.errorLabels){
					dialog.showErrorBox(
						'Some Error occurred!',
						`There may be a connection error! for file: ${filePath}`
					);
				} else {
					dialog.showErrorBox('Some Error occurred!', `${error} for file: ${filePath}`);
				}
			}
			else{
				count = handleProgress(mainWindow, i + 1, pathArray.length, count);
				success = true;
			}
		});

		return success;
	});
	historyDb.loadHistory(mainWindow);
});
//Initiate the MySQL Conversion
ipcMain.on('readXls', (e, item) => {
	let count = 0;
	const pathArray = item.files;

	//Create the options parameter for 'excel-to-mysql' module
	const options = constructCommonOptions(item);
	handleCredAndHistory(mysqlDb, 'SQL', item);

	if (item.fileConvert || item.safeMode) {
		options.destination = dialog.showOpenDialogSync(mainWindow, {
			properties: ['openDirectory']
		});
		if (!options.destination) return;
		options.destination = options.destination[0];
	}

	//Iterate over all the input files
	pathArray.every((filePath, i) => {
		let success = true;
		if (options.destination)
			options.destination = path.join(options.destination, `trico-${i}.sql`)
		if(item.fileConvert) {
			excelToMYSQL.convertToFile({
				path: filePath,
				table:item.table,
				db:item.db,
			}, options, error => {
				if(error) {
					dialog.showErrorBox('Some Error occurred!', `${error} for file: ${filePath}`);
					success = false;
				} else {
					count = handleProgress(mainWindow, i + 1, pathArray.length, count);
					success = true;
				}
			});
		} else {
			//If the task is to convert to db
			excelToMYSQL.covertToMYSQL({
				host: item.host || "localhost",
				user: item.username,
				pass: item.password,
				path: filePath,
				table: item.table,
				db: item.db,
				endConnection: true,
			}, options, error => {
				if(error) {
					dialog.showErrorBox('Some Error occurred!', `${error} for file: ${filePath}`);
					success = false;
				} else {
					count = handleProgress(mainWindow, i + 1, pathArray.length, count);
					success = true;
				}
			});
		}
		return success;
	});
	historyDb.loadHistory(mainWindow);
});

app.whenReady().then(() => {
	createWindow();
	app.setAppUserModelId('NGUdbhav.TriCo');
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if(process.platform !== 'darwin') app.quit();
});
