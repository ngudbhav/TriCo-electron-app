const {app, BrowserWindow, Menu, ipcMain, dialog, shell} = require('electron');
var fs = require('fs');
var excelToMYSQL = require('excel-to-mysql');
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
let win, win2, addWin;
var menuTemplate = [
	{
		label: 'File',
		submenu: [
			{
				label: 'Convert to MongoDB',
				click: function(menuItem, BrowserWindow, event){
					if(win){
						createWindow2();
					}
				}
			},
			{
				label: 'Convert to MySQL',
				click: function(menuItem, BrowserWindow, event){
					if(win2){
						createWindow();
					}
				}
			},
			{
				label: 'Close',
				role: 'quit'
			}
		]
	},
	{
		label: 'Help',
		submenu: [
			{
				label: 'About',
				click: function(menuItem, BrowserWindow, event){
					dialog.showMessageBox(
						{
							type: 'info',
							buttons:['Open Browser?', 'Close'],
							title: 'Created By NGUdbhav',
							detail: 'TriCO stands for Tri-Covertor. This app converts excel to mysql/mongodb data. Visit me! www.ngudbhav.me',

						}
					, function(response){
						if(response === 0){
							shell.openExternal('https://www.ngudbhav.me');
						}
					});
				}
			}
		]
	}
];
function createWindow2(){
	win2 = new BrowserWindow({width: 530, height: 650, icon: image});
	win2.loadFile('mongo.html');
	win2.on('closed', function(){
		win2 = null;
	});
	win2.webContents.on('did-finish-load', function(){
		db2.find({}, function (err, docs) {
			if(!err){
				if(docs.length){
					win2.webContents.send('startup', docs);
				}
			}
		});
	});
	win.close();
}
function createWindow(){
	win = new BrowserWindow({width: 530, height: 800, icon: image});
	win.loadFile('index.html');
	if(win2){
		win2.close();
	}
	win.on('closed', function(){
		win = null;
	});
	win.webContents.on('did-finish-load', function(){
		db.find({}, function (err, docs) {
			if(!err){
				if(docs.length){
					win.webContents.send('startup', docs);
				}
			}
		});
	});
	var menuBuild = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menuBuild);
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
			if(win2){
				win2.webContents.send('progress', 1);
				win2.setProgressBar(1);
			}
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
			}
		}
	});
});
if(process.platform==='darwin'){
	menuTemplate.unshift({});
}
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