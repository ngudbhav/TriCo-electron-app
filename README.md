# TriCo-electron-app
This App Converts your correctly formatted Excel Spreadsheet to a specified table/collection in specified Database in MYSQL/MongoDB.

# Excel Formats Supported
Supported Excel formats are XLS/XLSX

# Usage
The Database must already be there. A table name should be provided.

# Spreadsheet Format
Please have a look at the sample Excel sheets provided to have a clear view of the File. <a href="https://go.microsoft.com/fwlink/?LinkID=521962">Microsoft Sample Sheet</a>

# Starting The App
```sh
sudo npm install -g electron
git clone https://github.com/ngudbhav/excel-to-mysql-electron-app.git
cd excel-to-mysql-electron-app
npm install
npm start
```

This app saves the previosuly entered information in the systems %APPDATA% directory so that the whole information is not typed again.
NOTHING is collected by me. This app doesn't even establish connection to the internet. A fully standalone app.
