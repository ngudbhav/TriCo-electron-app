const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
var excelToMYSQL = require('excel-to-mysql');
const notifier = require('node-notifier');
var Datastore = require('nedb')
, db = new Datastore({ filename: app.getPath('appData')+'/excel-to-db/data/mysql/new.db'})
, db2 = new Datastore({ filename: app.getPath('appData')+'/excel-to-db/data/mongo/new.db'})
, historydb = new Datastore({filename: app.getPath('appData')+'/excel-to-db/data/history/new.db'});
db.loadDatabase();
db2.loadDatabase();
historydb.loadDatabase();
var path = require('path');
var excelToMongoDB = require('excel-to-mongodb');
var request = require('request');
let image;
if (process.platform === 'darwin') {
	image = path.join(__dirname, 'images', 'logo.icns');
}
else{
	image = path.join(__dirname, 'images', 'logo.ico');
}
let win;
function createWindow(){
	win = new BrowserWindow({width: 1000, height: 600, icon: image, webPreferences: {
		nodeIntegration: true
	}, frame: false });
	win.loadFile('index.html');
	win.setMenu(null);
	win.openDevTools();
	win.on('closed', function(){
		win = null;
	});
	win.webContents.on('did-finish-load', function(){
		db.find({}, function (err, docs) {
			if(!err){
				if(docs.length){
					win.webContents.send('startupMySQL', docs);
					db2.find({}, function(err, docs){
						if(!err){
							if(docs.length){
								win.webContents.send('startupMongoDB', docs);
								historydb.find({}, function(err, docs){
									if(!err){
										if(docs.length){
											win.webContents.send('startupHistory', docs);
										}
									}
								});
							}
						}
					});
				}
			}
		});
	});
	checkUpdates();
}
function checkUpdates(e){
	request('https://api.github.com/repos/ngudbhav/TriCo-electron-app/releases/latest', {headers: {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:59.0) Gecko/20100101 '}}, function(error, html, body){
		if(!error){
			var v = app.getVersion().replace(' ', '');
			var latestV = JSON.parse(body).tag_name.replace('v', '');
			var changeLog = JSON.parse(body).body.replace('<strong>Changelog</strong>', 'Update available. Here are the changes:\n');
			if(latestV!=v){
				dialog.showMessageBox(
					{
						type: 'info',
						buttons:['Open Browser to download link', 'Close'],
						title: 'Update Available',
						detail: changeLog,
					}, function(response){
						if(response === 0){
							shell.openExternal('https://github.com/ngudbhav/TriCo-electron-app/releases/latest');
						}
					}
				);
				notifier.notify(
				{
					appName: "NGUdbhav.TriCo",
					title: 'Update Available',
					message: 'A new version is available. Click to open browser and download.',
					icon: path.join(__dirname, 'images', 'logo.ico'),
					sound: true,
					wait:true
				});
				notifier.on('click', function(notifierObject, options) {
					shell.openExternal('https://github.com/ngudbhav/TriCo-electron-app/releases/latest');
				});
			}
			else{
				if(e === 'f'){
					dialog.showMessageBox({
						type: 'info',
						buttons:['Close'],
						title: 'No update available!',
						detail: 'You already have the latest version installed.'
					});
				}
			}
			win.webContents.send('updateCheckup', null);
		}
		else{
			if(e === 'f'){
				dialog.showMessageBox({
					type: 'error',
					buttons:['Close'],
					title: 'Update check failed!',
					detail: 'Failed to connect to the update server. Please check your internet connection'
				});
			}
			win.webContents.send('updateCheckup', null);
		}
	});
}
ipcMain.on('update', function(e, item){
	checkUpdates('f');
});
ipcMain.on('clearHistory', function(e, item){
	dialog.showMessageBox(
		{
			type: 'info',
			buttons:['Yes', 'No'],
			title: 'Clear everything?',
			detail: 'This will clear the records. The data backups won\'t be removed. You can remove the backups manually in the installation directory.',
		}, function(response){
			if(response === 0){
				historydb.remove({}, {multi:true});
			}
		}
	);
});
ipcMain.on('readXlsForMongo', function(e, item){
	var count = 0;
	var pathArray = item.path;
	var options = {};
	if(item.safeMode){
		options.safeMode = true;
	}
	if(item.customStartEnd){
		options.customStartEnd = true;
		options.startRow = item.rowS;
		options.endRow = item.rowE;
		options.startCol = item.colS;
		options.endCol = item.colE;
	}
	db2.remove({}, { multi: true });
	db2.insert({table:item.table,db:item.db}, function(error, results){
		if(error){}
		else{
		}
	});
	historydb.insert({table:item.table,db:item.db, files: pathArray, time: new Date(), destination:'MONGO'}, function(error, results){
		if(error){}
	});
	let i = 0;
	while(i<pathArray.length){
		excelToMongoDB.covertToMongo({host: "localhost",path: pathArray[i],collection: item.table,db: item.db}, options, function(error, results){
			if(error){
				if(error.errorLabels){
					dialog.showErrorBox('Some Error occured!', 'There may be a connection error!');
					return;
				}
			}
			else{
				win.webContents.send('progress', i/pathArray.length);
				win.setProgressBar(i/pathArray.length);
				if(i===pathArray.length && count===0){
					count = 1;
					dialog.showMessageBox({
						type: 'info',
						buttons:['Close'],
						title: 'Success',
						detail: 'Operation Completed Successfully!'
					});
					notifier.notify(
					{
						appName: "NGUdbhav.TriCo",
						title: 'Sent to MongoDB',
						message: 'Coversion to mongo completed successfully. Click to send Feedback.',
						icon: path.join(__dirname, 'images', 'logo.ico'),
						sound: true,
						wait:true
					});
					notifier.on('click', function(notifierObject, options) {
						shell.openExternal('https://www.softpedia.com/get/Internet/Servers/Database-Utils/TriCO.shtml');
					});
				}
			}
		});
		i++;
	}
});
ipcMain.on('readXls', function(e, item){
	var count = 0;
	var pathArray = item.path;
	var options = {};
	if(item.autoid){
		options.autoId = true;
	}
	if(item.safeMode){
		options.safeMode = true;
	}
	if(item.customStartEnd){
		options.customStartEnd = true;
		options.startRow = item.rowS;
		options.endRow = item.rowE;
		options.startCol = item.colS;
		options.endCol = item.colE;
	}
	db.find({}, function (err, docs) {
		if(err){}
		
	});
	db.remove({}, { multi: true });
	db.insert({user: item.user,table:item.table,db:item.db}, function(error, results){
		if(error){}
	});
	let i = 0;
	historydb.insert({table:item.table,db:item.db, files: pathArray, time: new Date(), destination:'SQL'}, function(error, results){
		if(error){}
	});
	while(i<pathArray.length){
		excelToMYSQL.covertToMYSQL({host: "localhost",user: item.user,pass: item.pass,path: pathArray[i],table: item.table,db: item.db}, options, function(error, results){
			if(error){
				dialog.showErrorBox('Some Error occured!', error);
				return;
			}
			else{
				if(win){
					win.webContents.send('progress', i/pathArray.length);
					win.setProgressBar(i/pathArray.length);
					if(i===pathArray.length && count === 0){
						count = 1;
						dialog.showMessageBox({
							type: 'info',
							buttons:['Close'],
							title: 'Success',
							detail: 'Operation Completed Successfully!'
						});
						notifier.notify(
						{
							appName: "NGUdbhav.TriCo",
							title: 'Sent to MySQL',
							message: 'Coversion to mysql completed successfully. Click to send Feedback.',
							icon: path.join(__dirname, 'images', 'logo.ico'),
							sound: true,
							wait:true
						});
						notifier.on('click', function(notifierObject, options) {
							shell.openExternal('https://www.softpedia.com/get/Internet/Servers/Database-Utils/TriCO.shtml');
						});
					}
				}
			}
		});
		i++;
	}
});
app.on('ready', ()=>{
	createWindow();
	if (process.platform === 'win32') {app.setAppUserModelId('NGUdbhav.TriCo');}
});
app.on('window-all-closed', function(){
	if(process.platform!=='darwin'){
		app.quit();
	}
});
app.on('activate', function(){
	if(win===null){
		createWindow();
	}
});