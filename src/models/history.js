const { app } = require('electron');
const Datastore = require('nedb');

// TODO: Try to copy the previous entries into something new!
const historyDb = new Datastore({
  filename: app.getPath('appData')+'/excel-to-db/data/history/new.db',
  timestampData: true,
  autoload: true,
});

historyDb.loadHistory = window => {
  historyDb.find({}).sort({ time: -1, updatedAt: -1 }).limit(100).exec((error, docs) => {
    if(!error){
      window.webContents.send('startup-history', docs);
    }
  });
};

module.exports = historyDb;
