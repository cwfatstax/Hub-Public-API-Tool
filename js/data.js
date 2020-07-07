var dataController = (function () {
    var accessToken, tenantName, groups, isQuickFile, inputData, tenantStructure, tabData, channelData, storyData, addURLs, deleteURLS, entitiesCreated;

    groups = [
        {
        "id": "567244", // BTC Admins
        "permissions": 3
        }
    ];
    isQuickFile = false;
    tenantStructure = {};
    addURLs = {
        'tab': '/v1/tab',
        'channel': '/v1.1/channel',
        'story': '/v1.1/story/add'
    };
    getURLs = {
        'tab': '/v1/tab/all?search=',
        'channel': '/v1/channel/all?search=',
        'story': '/v1.1/story/all?channel_id=',
        'users': '/v1.1/admin/user/all'
    };
    putURLs = {
        'channel': '/v1/tabs/',
        'story': '/v1.1/story/edit/'
    };
    deleteURLs = {
        'tab': '/v1/tab/',
        'channel': '/v1/channel/',
        'story': '/v1/story/archive/'
    };
    entitiesCreated = []; // objects. {type: 'story', id: '123456'} gather ids of everything created so they can be deleted if needed
    
    var storeAccessToken = function (token) {
        accessToken = token;
        sessionStorage.setItem('accessToken', token);
    };
    
    var authClientCredentials = function (clientCredentials) {
        $.ajax({
            url: "https://pubapi.bigtincan.com/services/oauth2/token?",
            crossDomain: true,
            method: "POST",
            dataType: "json",
            data: clientCredentials,
            success: function (res) {
                if (res['access_token'] !== undefined && res['refresh_token'] !== undefined) {
                    console.log('Client authorization successful!');
                    storeAccessToken(res['access_token']);
                }
            },
            error: function (data) {
                console.log(data.status + ': ' + data.statusText + ' | ' + data.responseText);
            }
        });
    };
    
    var getTenantName = function (showActiveTenantCB) {
        $.ajax({
            url: `https://pubapi.bigtincan.com${getURLs['users']}`,
            crossDomain: true,
            method: "GET",
            dataType: "json",
            contentType: "application/json",
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json",
            },
            success: function (data, textStatus) {
                console.log('Active Tenant: ' + data.data[0]['company_name']);
                showActiveTenantCB(data.data[0]['company_name']);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
                console.log('unable to get tenant name');
                showActiveTenantCB(null);
            }
        });
    };
    
    var addStoryToInputData = function (rowNum, storyID) {
        inputData[rowNum]['Property 5 Name'] = 'Files';
        inputData[rowNum]['Property 5 Value'] = `https://app.bigtincan.com/story/${storyID}`;
    };
    
    var storeEntityCreated = function(type, id) {
        entitiesCreated.push({
            "type": type,
            "id": id
        });
    };
    
    var updateStory = function (rowData, callback) {
        let storyID = tenantStructure[rowData.tab]['channels'][rowData.channel]['stories'][rowData.story].id;
        let apiData = {
            "channels": [{
                "id": tenantStructure[rowData.tab]['channels'][rowData.channel].id
            }],
            /*"append_files": [{
                "filename": rowData.file,
                "description": rowData.fileDescription
            }],*/
            
        };
        console.log('updateStory() with:');
        console.log(storyID);
        console.log(apiData);
        $.ajax({
            url: `https://pubapi.bigtincan.com${putURLs['story']}${storyID}`,
            crossDomain: true,
            method: "PUT",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(apiData),
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json",
                "rhr": "1"
            },
            success: function (data, textStatus) {
                storeEntityCreated('story', data.data.revision_id);
                addStoryToInputData(rowData.rowNum, data.data.perm_id); 

                tenantStructure[rowData.tab]['channels'][rowData.channel]['stories'][rowData.story].id = data.data.revision_id;
                tenantStructure[rowData.tab]['channels'][rowData.channel]['stories'][rowData.story].permID = data.data.perm_id;
                
                console.log('file added to existing story');
                callback();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
            }
        });
    };
    
    var addExistingChannel = function (rowData, callback) {
        let tabID = tenantStructure[rowData.tab].id;
        let channelID = tenantStructure[rowData.tab]['channels'][rowData.channel].id;
        let apiData = groups;
        console.log('addExistingChannel() with:');
        console.log(channelID);
        console.log(apiData);
        $.ajax({
            url: `https://pubapi.bigtincan.com${putURLs['channel']}${tabID}/channels/${channelID}/groups`,
            crossDomain: true,
            method: "PUT",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(apiData),
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json",
            },
            success: function (data, textStatus) {
                
                console.log('existing channel added to tab');
                callback();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
            }
        });
    };
    
    var storeExistingEntities = function (type, currPage, callback) {
        $.ajax({
            url: `https://pubapi.bigtincan.com${getURLs[type]}&page=${currPage}&limit=100`,
            crossDomain: true,
            method: "GET",
            dataType: "json",
            contentType: "application/json",
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json",
            },
            success: function (data, textStatus) {
                data.data.forEach(result => {
                    storeEntityCreated(type, result.id);
                    console.log(type + ' ' + result.id + ' stored for deletion');
                });
                if (data.page_total > currPage) {
                    storeExistingEntities(type, currPage + 1, callback);
                }
                else if (type == 'channel') {
                    storeExistingEntities('tab', 1, callback);
                }
                else {
                    callback();
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
                console.log('storeExistingEntities FAILED ' + type);
            }
        });
    };
    
    // unparses inputData and makes a downloadable CSV file
    var downloadModuleLinkCSV = function () {
        var csv = Papa.unparse(inputData);

        var csvData = new Blob([csv], {
            type: 'text/csv;charset=utf-8;'
        });
        var csvURL = null;
        if (navigator.msSaveBlob) {
            csvURL = navigator.msSaveBlob(csvData, 'output-with-properties.csv');
        } else {
            csvURL = window.URL.createObjectURL(csvData);
        }

        var tempLink = document.createElement('a');
        tempLink.href = csvURL;
        tempLink.setAttribute('download', 'output-with-properties.csv');
        tempLink.click();
    };

    return {
        storeAccessToken: function (token) {
            storeAccessToken(token);
        },
        getAccessToken: function () {
            return accessToken;
        },
        authClientCredentials: function (clientCredentials) {
            authClientCredentials(clientCredentials);
        },
        getTenantName: function (showActiveTenantCB) {
            getTenantName(showActiveTenantCB);
        },
        storeInputData: function (data) {
            inputData = data;
        },
        getInputData: function () {
            return inputData;
        },
        addStoryToInputData: function (rowNum, storyID) {
            addStoryToInputData(rowNum, storyID);
        },
        storeTenantStructure: function (data) {
            tenantStructure = data;
        },
        getTenantStructure: function () {
            return tenantStructure;
        },
        getTabData: function (tabName) {
            tabData = {
                "name": `${tabName}`,
            };
            return tabData;
        },
        getChannelData: function (channelName, tabID) {
            channelData = {
                "name": channelName,
                "tab_id": tabID,
                "is_hidden": false,
                "groups": groups
            };
            return channelData;
        },
        getStoryData: function (storyName, channelID, fileName, fileDescription) {
            storyData = {
                "title": storyName,
                //"description": hubData[row]['Description'],
                "channels": [{
                    "id": channelID
                }],
                "quickfile": isQuickFile
            };
            if (fileName != '' && fileName != null && fileName != undefined) {
                storyData['new_files'] = [
                    {
                        "filename": fileName,
                        "description": fileDescription
                    }
                ];
            }
            return storyData;
        },
        updateStory: function(rowData, callback) {
            updateStory(rowData, callback);
        },
        addExistingChannel: function(rowData, callback) {
            addExistingChannel(rowData, callback);
        },
        getAddURL: function (type) {
            return addURLs[type];
        },
        getGetURL: function (type) {
            return getURLs[type];
        },
        getDeleteURL: function (type) {
            return deleteURLs[type];
        },
        checkEntity: function(type, query, name) {
            return checkEntity(type, query, name);
        },
        storeEntityCreated: function (type, id) {
            storeEntityCreated(type, id);
        },
        getEntitiesCreated: function () {
            return entitiesCreated;
        },
        storeExistingEntities: function (type, page, callback) {
            storeExistingEntities(type, page, callback);
        },
        clearEntitiesCreated: function () {
            entitiesCreated = [];
        },
        downloadModuleLinkCSV: function () {
            downloadModuleLinkCSV();
        }
    };
})();