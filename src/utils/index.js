const { app, dialog, shell } = require('electron');
const request = require('node-fetch');

const historyDb = require('../models/history');

const handleProgress = (window, progress, total, sent) => {
  window.webContents.send('progress', progress/total);
  window.setProgressBar(progress/total);
  if(progress === total && sent === 0){
    sent = 1;
    showMessageDialogBox({
      sync: true,
      type: 'info',
      buttons:['Close'],
      title: 'Success',
      detail: 'Operation Completed Successfully!'
    })
    window.setProgressBar(-1);
  }
  return sent;
};

const constructCommonOptions = userOptions => {
  const options = { ...userOptions };
  if(userOptions.customPoints){
    options.customStartEnd = true;
    options.startRow = userOptions.custom.rowStart;
    options.endRow = userOptions.custom.rowEnd;
    options.startCol = userOptions.custom.columnStart;
    options.endCol = userOptions.custom.columnEnd;
  }

  return options;
};

const handleCredAndHistory = (database, destination, data) => {
  //Remove the previously stored credentials
  database.remove({}, { multi: true });
  //Insert the new credentials
  database.insert({ table: data.table, db: data.db, host: data.host, user: data.username });
  //Add this transaction as a history
  historyDb.insert({ table: data.table, db:data.db, files: data.files, time: new Date(), destination: destination });
};

//Function to check for updates of app
//Refer here https://gist.github.com/ngudbhav/7e9d429229fc78644c44d58f78dc5bda
const checkUpdates = (source, window) => {
  request(
    'https://api.github.com/repos/ngudbhav/TriCo-electron-app/releases/latest',
    {headers: { 'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:59.0) Gecko/20100101 ' }}
  )
    .then(res => res.text())
    .then(body => {
      // Add error handler to send failure to renderer
      const currentVersion = app.getVersion().replace(' ', '');
      const latestVersion = JSON.parse(body).tag_name.replace('v', '');
      const changeLog = JSON.parse(body).body.replace(
        '<strong>Changelog</strong>',
        'Update available. Here are the changes:\n'
      );
      if(latestVersion !== currentVersion){
        showMessageDialogBox({
          sync: true,
          type: 'info',
          buttons:['Open Browser to download link', 'Close'],
          title: 'Update Available',
          detail: changeLog,
        }, response => {
          if(response === 0){
            shell.openExternal('https://github.com/ngudbhav/TriCo-electron-app/releases/latest').then();
          }
        });
        // Add notification to notify about the update
      }
      else{
        if(source === 'user'){
          showMessageDialogBox({
            sync: true,
            type: 'info',
            buttons:['Close'],
            title: 'No update available!',
            detail: 'You already have the latest version installed.'
          });
        }
      }
      window.webContents.send('updateCheckup', null);
    });
};

const showMessageDialogBox = (options, callback = () => {}) => {
  return options.sync ?
    dialog.showMessageBoxSync(options) :
    dialog.showMessageBox(options).then(callback);
};

const isDevelopment = () => process.env.NODE_ENV === 'development';

module.exports = {
  handleProgress,
  constructCommonOptions,
  handleCredAndHistory,
  checkUpdates,
  showMessageDialogBox,
  isDevelopment,
};
