const {app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage} = require('electron');
if (handleSquirrelEvent(app)) {
    return;
}
function handleSquirrelEvent(application) {
	if (process.argv.length === 1) {
		return false;
	}
	const ChildProcess = require('child_process');
	const path = require('path');
	const appFolder = path.resolve(process.execPath, '..');
	const rootAtomFolder = path.resolve(appFolder, '..');
	const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
	const exeName = path.basename(process.execPath);
	const spawn = function(command, args) {
		let spawnedProcess, error;
		try{
			spawnedProcess = ChildProcess.spawn(command, args, {
				detached: true
			});
		}catch (error) {}
		return spawnedProcess;
	};
	const spawnUpdate = function(args) {
		return spawn(updateDotExe, args);
	};
	const squirrelEvent = process.argv[1];
	switch (squirrelEvent) {
		case '--squirrel-install':
		case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus
            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);
            setTimeout(application.quit, 1000);
            return true;
        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers
            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);
            setTimeout(application.quit, 1000);
            return true;
        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated
            application.quit();
            return true;
    }
};
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
	win2 = new BrowserWindow({width: 800, height: 800, icon: image});
	win2.loadFile('mongo.html');
	win2.on('closed', function(){
		win2 = null;
	});
	win.close();
}
function createWindow(){
	win = new BrowserWindow({width: 800, height: 800, icon: image});
	win.loadFile('index.html');
	if(win2){
		win2.close();
	}
	win.on('closed', function(){
		win = null;
	});
	win.webContents.on('did-finish-load', function(){
		db.find({}, function (err, docs) {
			if(err) throw err;
			else{
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
		if(error) throw error;
		else{
			console.log(results);
		}
	});
	excelToMongoDB.covertToMongo(data, options, function(error, results){
		if(error){
			dialog.showErrorBox('Some Error occured!', error);
			return;
		}
		else{
			console.log(results);
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
		if(err) throw err;
		console.log(docs);
	});
	db.remove({}, { multi: true });
	db.insert({user: item.user,table:item.table,db:item.db}, function(error, results){
		if(error) throw error;
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
			console.log(results);
		}
	});
	excelToMYSQL.progress.on('progress', function(data){
		console.log(data);
		if(win){
			win.webContents.send('progress', data/100);
			win.setProgressBar(data/100);
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