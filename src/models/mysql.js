const { app } = require('electron');
const Datastore = require('nedb');

// TODO: Try to copy the previous entries into something new!
const mysqlDb = new Datastore({
  filename: app.getPath('appData')+'/excel-to-db/data/mysql/new.db',
  timestampData: true,
  autoload: true,
});

module.exports = mysqlDb;
