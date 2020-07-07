/* INSTRUCTIONS
1. place the data.csv file in the root folder
2. update the line 41 value to the correct column name for the data source
3. open terminal and cd to js folder
4. type 'node upload-files.js'
5. wait until all files are downloaded (empty files will be created before the data gets pulled in)
*/
const download = require('download');
const fs = require('fs');
const Papa = require('./papaparse.min.js');
var fileStream = fs.createReadStream('../data.csv');
var files = [];

Papa.parse(fileStream, {
    delimiter: ',',
    header: true,
    download: false,
    complete: function (results, file) {
        //console.log(results.data);
        inputFiles = results.data;
        createFileArray(inputFiles);
    }
});

function createFileArray(input) {
    console.log('createFileArray()..');
    input.forEach((row, index) => {
        let dupe = false;
        if (row['File Name'] != '') {
            for (let i = 0;i < index;i++) {
                if (input[i]['File Name'] == row['File Name']) {
                    dupe = true;
                    //console.log(row['File Name'] + ' marked as duplicate file.');
                    break;
                }
            }
            //console.log('file added to array..');
            files.push({
                name: row['File Name'],
                url: row['PermalinkURL'],
                skip: dupe
            });
            //console.log(files);
        }
    });
    //console.log(files);
    startDownloadingFiles();
}

function startDownloadingFiles() {
    console.log('start downloading files..');
    files.forEach((row, index) => {
        downloadFile(row.url, '../import_files/' + row.name);
    });
}

async function downloadFile(url, filePath) {
    download(url).pipe(fs.createWriteStream(filePath));
  }