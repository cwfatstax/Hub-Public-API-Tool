/*
TODO
1. add pre-existing hub entities to tenantstructure and entitiesCreated so they can be deleted

2. Add options to either use api key, secret, and id or token

figure out what to do if story exists but new file needs added within check entity function
test that the entire structure is checked/created before going to next row
*/

var appController = (function (UICtrl, dataCtrl) {
    var DOMSelectors, row, tenantStructure;
    
    rowNum = 0; // starting row for processRow();

    var addEventListeners = function () {
        /* TODO
        - add function param for view (specify which view you're loading)
        - put each set of elisteners in an object value per view
        */
        DOMSelectors.authButtons.forEach(button => {
            button.onclick = function () {
                console.log(this.id + ' selected');
                UICtrl.showAuthMethod(this.id);
                if (this.id == 'token') {
                    UICtrl.getSelectors().tokenInput.oninput = function() {
                        console.log('token input');
                        dataCtrl.storeAccessToken(UICtrl.getAccessToken());
                        dataCtrl.getTenantName(UICtrl.showActiveTenant);
                    };
                }
                else if (this.id == 'key') {
                    UICtrl.getSelectors().connectKeyButton.onclick = function() {
                        let token;
                        console.log('connect button pressed');
                        dataCtrl.authClientCredentials(UICtrl.getClientCredentials());
                        dataCtrl.getTenantName(UICtrl.showActiveTenant);
                    };
                }
            }
        });

        // input file (User Groups, Tab, Channel, Story, Quick File)
        DOMSelectors.inputFile.onchange = function () {
            Papa.parse(DOMSelectors.inputFile.files[0], {
                delimiter: ',',
                header: true,
                complete: function (results, file) {
                    dataCtrl.storeInputData(results.data);
                    processRow();
                }
            });
        };

    };

    var processRow = function () {
        var rowStructure, data;
        
        data = dataCtrl.getInputData();
        
        if (rowNum >= data.length - 1) { 
            if (UICtrl.getHubFileCheckboxState) {
                dataCtrl.downloadModuleLinkCSV();
            }
            return console.log('All rows processed!');
        }
        if (dataCtrl.getAccessToken() == null) { return alert('Missing access token.'); }
        
        rowStructure = {
            'tab': data[rowNum]['Tab'],
            'channel': data[rowNum]['Channel'],
            'story': data[rowNum]['Story'],
            'file': data[rowNum]['Hub File Name'],
            'fileDescription': data[rowNum]['File Display Name'],
            'rowNum': rowNum
        };
        tenantStructure = dataCtrl.getTenantStructure();
        
        // 1st checks if entity was already created by script, if not it checks if it existed in Hub previously, if not creates entity
        if (!tenantStructure.hasOwnProperty(rowStructure.tab)) {
            checkEntity('tab', rowStructure.tab, rowStructure.tab, rowStructure);
        } else if (!tenantStructure[rowStructure.tab]['channels'].hasOwnProperty(rowStructure.channel)) {
            checkEntity('channel', rowStructure.channel, rowStructure.channel, rowStructure);
        } else if (!tenantStructure[rowStructure.tab]['channels'][rowStructure.channel]['stories'].hasOwnProperty(rowStructure.story)) {
            checkEntity('story', tenantStructure[rowStructure.tab]['channels'][rowStructure.channel].id, rowStructure.story, rowStructure);
        }
        // if story exists, but new file needs added
        else {
            rowNum++;
            dataCtrl.updateStory(rowStructure, processRow);
        }
    };

    var createTab = function (row) {
        let entityData = dataCtrl.getTabData(row.tab);
        tenantStructure[row.tab] = {
            "id": null,
            "channels": {}
        };
        dataCtrl.storeTenantStructure(tenantStructure);
        createEntity('tab', entityData, row);
    };

    var createChannel = function (row, tabID) {
        let entityData = dataCtrl.getChannelData(row.channel, tabID);
        tenantStructure[row.tab]['channels'][row.channel] = {
            "id": null,
            "stories": {}
        };
        dataCtrl.storeTenantStructure(tenantStructure);
        createEntity('channel', entityData, row);
    };

    var createStory = function (row, channelID) {
        let entityData = dataCtrl.getStoryData(row.story, channelID, row.file, row.fileDescription);
        tenantStructure[row.tab]['channels'][row.channel]['stories'][row.story] = {
            "id": null,
            "permID": null
        };
        dataCtrl.storeTenantStructure(tenantStructure);
        createEntity('story', entityData, row);
    };

    var createEntity = function (entityType, apiData, row) {
        console.log(entityType + ' with the following data:');
        console.log(apiData);
        $.ajax({
            url: "https://pubapi.bigtincan.com" + dataCtrl.getAddURL(entityType),
            crossDomain: true,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(apiData),
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + dataCtrl.getAccessToken(),
                "Content-Type": "application/json",
                "rhr": 1
            },
            success: function (data, textStatus) {
                if (entityType === 'tab') {
                    dataCtrl.storeEntityCreated('tab', data.data.id);

                    tenantStructure[row.tab].id = data.data.id;
                    dataCtrl.storeTenantStructure(tenantStructure);

                    processRow();

                } else if (entityType === 'channel') {
                    dataCtrl.storeEntityCreated('channel', data.data.id);

                    tenantStructure[row.tab]['channels'][row.channel].id = data.data.id;
                    dataCtrl.storeTenantStructure(tenantStructure);
                    if (row.story != '') {
                        createStory(row, data.data.id);
                    }
                    else {
                        rowNum++;
                        processRow();
                    }
                } else {
                    dataCtrl.storeEntityCreated('story', data.data.revision_id);
                    // if the hub file -> module check is selected, story URLs are added to property 5 of the input CSV
                    if (UICtrl.getHubFileCheckboxState) {
                        dataCtrl.addStoryToInputData(row.rowNum, data.data.perm_id);   
                    }

                    tenantStructure[row.tab]['channels'][row.channel]['stories'][row.story].id = data.data.revision_id;
                    tenantStructure[row.tab]['channels'][row.channel]['stories'][row.story].permID = data.data.perm_id;
                    dataCtrl.storeTenantStructure(tenantStructure);

                    rowNum++;
                    processRow();
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
            }
        });
    };
    
    var checkEntity = function(type, query, name, row) {
        let q = encodeURI(query);
        console.log('checkEntity: ' + `https://pubapi.bigtincan.com${dataCtrl.getGetURL(type)}${q}&limit=10`);
        $.ajax({
            url: `https://pubapi.bigtincan.com${dataCtrl.getGetURL(type)}${q}&limit=10`,
            crossDomain: true,
            method: "GET",
            dataType: "json",
            contentType: "application/json",
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + dataCtrl.getAccessToken(),
                "Content-Type": "application/json",
                "rhr": "1"
            },
            success: function (data, textStatus) {
                let existsInHub = false;
                data.data.forEach(result => {
                    if (result.name == name || result.title == name) {
                        console.log(name + ' already exists');
                        dataCtrl.storeEntityCreated(type, result.id);
                        if (type == 'tab') {
                            tenantStructure[row.tab] = {
                                "id": result.id,
                                "channels": {}
                            };
                            dataCtrl.storeTenantStructure(tenantStructure);
                            processRow();
                        }
                        else if (type == 'channel') {
                            tenantStructure[row.tab]['channels'][row.channel] = {
                                "id": result.id,
                                "stories": {}
                            };
                            dataCtrl.storeTenantStructure(tenantStructure);
                            dataCtrl.addExistingChannel(row, processRow);
                        }
                        else if (type == 'story') {
                            tenantStructure[row.tab]['channels'][row.channel]['stories'][row.story] = {
                                "id": result.revision_id,
                                "permID": result.perm_id
                            };
                            dataCtrl.storeTenantStructure(tenantStructure);
                            dataCtrl.updateStory(row, processRow);
                            rowNum++;
                        }
                        existsInHub = true;
                        return;
                    }
                });
                if (existsInHub == true) {
                    return;
                }
                else if (type == 'tab') {
                    createTab(row);
                }
                else if (type == 'channel') {
                    createChannel(row, tenantStructure[row.tab].id);
                }
                else if (type == 'story') {
                    createStory(row, tenantStructure[row.tab]['channels'][row.channel].id);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
                console.log('checkEntity FAILED');
            }
        });
    };

    var deleteAll = function () {
        console.log('deleteAll()');
        let entitiesCreated = dataCtrl.getEntitiesCreated();
        for (let i = 0; i < entitiesCreated.length; i++) {
            let parameters;

            switch (entitiesCreated[i].type) {
                /* the delete channel call will delete all stories within the channel
                case "story":
                    deleteEntity('story', entitiesCreated[i].id);
                    break;*/

                case "channel":
                    parameters = entitiesCreated[i].id + '?archive_stories=true';
                    deleteEntity('channel', parameters);
                    break;

                case "tab":
                    parameters = entitiesCreated[i].id;
                    deleteEntity('tab', parameters);
                    break;
            }
        }
        console.log('ALL EXISTING ENTITIES DELETED');
    };

    var deleteEntity = function (entityType, parameters) {
        $.ajax({
            url: "https://pubapi.bigtincan.com" + dataCtrl.getDeleteURL(entityType) + parameters,
            crossDomain: true,
            method: "DELETE",
            dataType: "json",
            contentType: "application/json",
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + dataCtrl.getAccessToken(),
                "Content-Type": "application/json",
            },
            success: function (data, textStatus) {
                if (entityType === 'channel') {
                    console.log('channel and children stories deleted');
                } else if (entityType === 'tab') {
                    console.log('tab deleted');
                }
                /*else {
                                   console.log('story deleted');
                               }*/
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
            }
        });
    };
    
    // deletes all existing tabs, channels, and stories
    var deleteAllExisting = function(deleteAll) {
        
        dataCtrl.clearEntitiesCreated();
        dataCtrl.storeExistingEntities('channel', 1, deleteAll);
        
    };

    return {
        init: function () {
            UICtrl.initUISetup();
            DOMSelectors = UICtrl.getSelectors();
            addEventListeners();
            dataCtrl.storeAccessToken(UICtrl.getAccessToken());
            dataCtrl.getTenantName(UICtrl.showActiveTenant);
        },
        deleteAll: function () {
            deleteAll();
        },
        deleteAllExisting: function () {
            deleteAllExisting(deleteAll);
        }
    };

})(UIController, dataController);

appController.init();
