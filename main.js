const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
app.setAppUserModelId("TriCo-Dev");
var excelToMYSQL = require('excel-to-mysql');
const notifier = require('node-notifier');
var Datastore = require('nedb')
, db = new Datastore({ filename: app.getPath('appData')+'/excel-to-db/data/mysql/new.db'})
, db2 = new Datastore({ filename: app.getPath('appData')+'/excel-to-db/data/mongo/new.db'});
db.loadDatabase();
db2.loadDatabase();
var path = require('path');
var excelToMongoDB = require('excel-to-mongodb');
let image;
if (process.platform === 'darwin') {
	image = path.join(__dirname, 'images/logo.icns');
}
else{
	image = path.join(__dirname, 'images/logo.ico');
}
let win;
/*
Updater
*/
function createWindow(){
	win = new BrowserWindow({width: 1000, height: 600, icon: image, webPreferences: {
		nodeIntegration: true
	}, frame: false });
	win.loadFile('index.html');
	win.removeMenu()
	win.webContents.openDevTools();
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
							}
						}
					});
				}
			}
		});
	});
}

ipcMain.on('readXlsForMongo', function(e, item){
	var data = {
		host: "localhost",
		path: item.path,
		collection: item.table,
		db: item.db
	};
	var options = {};
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
			console.log(results);
		}
	});
	excelToMongoDB.covertToMongo(data, options, function(error, results){
		if(error){
			if(error.errorLabels){
				dialog.showErrorBox('Some Error occured!', 'There may be a connection error!');
				return;
			}
		}
		else{
			win.webContents.send('progress', 1);
			win.setProgressBar(1);
			notifier.notify(
			{
				title: 'Sent to MongoDB',
				message: 'Coversion to mongo completed successfully. Click to send Feedback.',
				icon: 'images/logo.png',
				sound: true,
				wait:true
			});
			notifier.on('click', function(notifierObject, options) {
				shell.openExternal('https://www.softpedia.com/get/Internet/Servers/Database-Utils/TriCO.shtml');
			});
		}
	});
});
ipcMain.on('readXls', function(e, item){
	var data = {
		host: "localhost",
		user: item.user,
		pass: item.pass,
		path: item.path,
		table: item.table,
		db: item.db
	};
	var options = {};
	if(item.autoid){
		options.autoId = true;
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
		console.log(docs);
	});
	db.remove({}, { multi: true });
	db.insert({user: item.user,table:item.table,db:item.db}, function(error, results){
		if(error){}
		else{
			console.log(results);
		}
	});
	excelToMYSQL.covertToMYSQL(data, options, function(error, results){
		if(error){
			dialog.showErrorBox('Some Error occured!', error);
			return;
		}
		else{
			if(win){
				win.webContents.send('progress', 1);
				win.setProgressBar(1);
				notifier.notify(
				{
					title: 'Sent to MySQL',
					message: 'Coversion to mysql completed successfully. Click to send Feedback.',
					icon: 'images/logo.png',
					sound: true,
					wait:true
				});
				notifier.on('click', function(notifierObject, options) {
					shell.openExternal('https://www.softpedia.com/get/Internet/Servers/Database-Utils/TriCO.shtml');
				});
			}
		}
	});
});
app.on('ready', createWindow);
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