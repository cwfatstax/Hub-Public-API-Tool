/* INSTRUCTIONS
1. Update the auth credentials in the authClientCredentials function
2. place files to upload in /import_files
3. ensure the data.csv is relevant to files
4. open terminal and cd to js folder
5. type 'node upload-files.js'

NOTES
Currently if file extensions are uppercase they won't get a hub file name because it won't match
- to fix, make all file ext in folder and csv lowercase

*/

var inputFiles, filenames, folderFileNames, fileStream, fileExtRegex, currIndex, accessToken, batchSize;

var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM('<html></html>');
var $ = require('jquery')(window);
const request = require('request');
const fs = require('fs');
const Papa = require('./papaparse.min.js');
fileStream = fs.createReadStream('../data.csv');
filenames = [];
currIndex = 0;
batchSize = 50;
/* filenames objects
{
name: 'name',
skip: false
}
*/
folderFileNames = [];
fileExtRegex = /\.[0-9a-z]+$/;

Papa.parse(fileStream, {
    delimiter: ',',
    header: true,
    download: false,
    complete: function (results, file) {
        //console.log(results.data);
        inputFiles = results.data;
        createFileNameArray(inputFiles);
    }
});

/*
Possible Scenarios
1. included in data.csv & folder
2. included in data.csv, but not in folder
3. included in folder, but not in data.csv
*/

function createFileNameArray(input) {
    // create list of all filenames from input file
    let tempFileNames = []; // used for import folder check
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
            filenames.push({
                name: row['File Name'],
                skip: dupe
            });
            tempFileNames.push(row['File Name']);
        }
    });

    fs.readdir('../import_files', {
        withFileTypes: true
    }, (err, files) => {
        files.forEach(file => {
            // create a list of all filenames from import_files folder
            if (file.name == '.DS_Store') {
                //console.log(file.name + ' has been skipped');
            }
            else if (tempFileNames.includes(file.name)) {
                folderFileNames.push(file.name);
            }
            else if (!tempFileNames.includes(file.name)) {
                //console.log(file.name + ' is missing from data.csv and will not be uploaded.');
            }
        });
        
        // skips files that are missing from import_files folder
        filenames.forEach((filename, index) => {
            if (!folderFileNames.includes(filename.name)) {
                //console.log(filename.name + ' is missing from /import_files');
                filename.skip = true;
                }                          
        });
        authClientCredentials();
    });
}




async function uploadFiles(files, startIndex) {
    
    return new Promise(async (resolve, reject) => {
        let req = request.post({
                url: `https://pubapi.bigtincan.com/v1/story/upload/file`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'rhr': 1
                },
                json: true
            },
            (err, response, body) => {
                if (err) {
                    console.error('error in uploading file', err);
                    reject(err);
                    downloadCSV(inputFiles);
                } else {
                    if (body.error) {
                        console.error('error in uploading file', body.error);
                        reject(body.error);
                        downloadCSV(inputFiles);
                    } else {
                        let hubFileNames = {};
                        console.log(`${body.data.length} File(s) uploaded`);
                        resolve(body.data); // {filename: '', description: '', ..}
                        console.log(body.data);
                        body.data.forEach(file => {
                            let fullFileName = file.description + file.filename.match(fileExtRegex)[0];
                            hubFileNames[fullFileName] = file.filename;
                        });
                        addHubFileNames(hubFileNames, startIndex);
                        if (files.length <= currIndex) {
                            downloadCSV(inputFiles);
                        }
                        else {
                            console.log('starting next batch..');
                            authClientCredentials();
                        }
                        
                    }
                }
            }
        );
        let form = req.form();
        form.append('upload_type', 'file');
        files.slice(startIndex, startIndex + batchSize).forEach(filename => {
            if (filename.skip == false) {
                form.append('files[]', fs.createReadStream(`../import_files/${filename.name}`));
                console.log('Adding: ' + filename.name);
            }
            else {
                //console.log('Skipping: ' + filename.name);
            }
            currIndex++;
        });
    });
}

function authClientCredentials () {  
    $.ajax({
        url: "https://pubapi.bigtincan.com/services/oauth2/token?",
        crossDomain: true,
        method: "POST",
        dataType: "json",
        data: { // update xxx with api credentials
            "grant_type": "password",
            "client_id": 'xxx',
            "client_secret": 'xxx',
            "api_key": 'xxx'
        },
        success: function (res) {
            if (res['access_token'] !== undefined && res['refresh_token'] !== undefined) {
                console.log('Client authorization successful!');
                accessToken = res['access_token'];
                console.log(res['access_token']);
                uploadFiles(filenames, currIndex);
            }
        },
        error: function (data) {
            console.log(data.status + ': ' + data.statusText + ' | ' + data.responseText);
        }
    });
}

var addHubFileNames = function (hubFileNames, startIndex) {
    inputFiles.slice(startIndex, startIndex + batchSize).forEach(row => {
        if (row['File Name'] != '') {
            row['Hub File Name'] = hubFileNames[row['File Name']];
        }
    });
};

var downloadCSV = function (data) {

    var csv = Papa.unparse(data);
    
    fs.writeFile('../data-hub-files.csv', csv, (err) => {
      if (err) {
          throw err;
      }  
      else {
          console.log('csv created');
      }
    });
};
