var UIController = (function() {
    var DOMSelectors, templates;
    
    var getDOMSelectors = function() {
        return DOMSelectors = {
            inputFile: document.querySelector('#input-file'),
            tokenInput: document.querySelector('#input-token'),
            clientIDInput: document.querySelector('#input-client-id'),
            clientSecretInput: document.querySelector('#input-client-secret'),
            APIKeyInput: document.querySelector('#input-api-key'),
            connectKeyButton: document.querySelector('#connect-key-button'),
            tenantStatus: document.querySelector('#tenantStatus'),
            sectionHeader: document.querySelector('#sectionHeader'),
            sectionContent: document.querySelector('#sectionContent'),
            setupStep: document.querySelector('#setupStep'),
            progressStep: document.querySelector('#progressStep'),
            resultsStep: document.querySelector('#resultsStep'),
            authButtons: Array.from(document.getElementsByClassName('authButton')),
            hubFileCheckbox: document.querySelector('#hub-file-link'),
            collapsibleDiv: document.querySelector('.collapsible'),
            collapsibleIcon: document.querySelector('.collapsible > .fas')
        };
    };
        
    
    var getAccessToken = function() {
        let accessToken;
        
        if (DOMSelectors.tokenInput == null && sessionStorage.getItem('accessToken') != null) {
            accessToken = sessionStorage.getItem('accessToken');
        }
        else if (DOMSelectors.tokenInput.value != '') {
            accessToken = DOMSelectors.tokenInput.value;
            sessionStorage.setItem('accessToken', accessToken);
        }
        else {
            return null;
        }
        console.log('Access Token: ' + accessToken);
        return accessToken;  
    };
    
    var getClientCredentials = function() {
        let clientCredentials;
        
        getDOMSelectors();
        
        clientCredentials = {
            "grant_type": "password",
            "client_id": DOMSelectors.clientIDInput.value,
            "client_secret": DOMSelectors.clientSecretInput.value,
            "api_key": DOMSelectors.APIKeyInput.value
        }
        
        return clientCredentials;
    };
    
    var showActiveTenant = function(tenantName) {
        if (tenantName == null) {
            DOMSelectors.tenantStatus.textContent = 'no tenant connected';
            DOMSelectors.tenantStatus.classList.add('inactive-grey');
            DOMSelectors.tenantStatus.classList.remove('active-green');
        }
        else {
            DOMSelectors.tenantStatus.textContent = tenantName;
            DOMSelectors.tenantStatus.classList.add('active-green');
            DOMSelectors.tenantStatus.classList.remove('inactive-grey');
        }
    };
    
    var showSetupPage = function() {
        getDOMSelectors();
        DOMSelectors.sectionHeader.textContent = 'Setup';
        activateStep(DOMSelectors.setupStep);
        
        if (sessionStorage.getItem('accessToken') == null || true) {
            DOMSelectors.sectionContent.innerHTML = templates['setup-start'];
            DOMSelectors.sectionContent.classList.add('text-center');
        }
        else {
            // TODO DOMSelectors.sectionContent.innerHTML = templates['setup-import'];
        }
    };
    
    var showAuthMethod = function(method, storeTokenCB, tenantNameCB) {
        DOMSelectors.sectionContent.innerHTML = templates[`setup-${method}`];
        DOMSelectors.sectionContent.classList.remove('text-center');
        getDOMSelectors();

        DOMSelectors.collapsibleDiv.addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
              content.style.display = "none";
              DOMSelectors.collapsibleIcon.classList.toggle('fa-chevron-down');
              DOMSelectors.collapsibleIcon.classList.toggle('fa-chevron-up');
            } else {
              content.style.display = "block";
              DOMSelectors.collapsibleIcon.classList.toggle('fa-chevron-down');
              DOMSelectors.collapsibleIcon.classList.toggle('fa-chevron-up');
            }
        });
    };
    
    var activateStep = function(step) {
        Array.from(document.getElementById('steps').getElementsByTagName('span')).forEach(s => {
            s.classList.remove('active-orange');
        });
        
        step.classList.add('active-orange');
    };
    
    templates = {
        'setup-start': `<h4>Choose Authentication Method</h4>
                
            <div class="authButton" id="token">
                <p>Access Token</p>
                <p class="subText">Access the Hub with an Access Token that expires after 15 minutes. Recommended for small tasks such as adding user groups.</p>
            </div>
                
            <div class="authButton" id="key">
                <p>OAuth 2.0 with API Key</p>
                <p class="subText">Access the Hub with an API key that won’t expire. Recommended for larger tasks such as adding a large number of files.</p>
            </div>`,
        'setup-token': `<h3>Access Token</h3>
                    <button type="button" class="collapsible">Show Instructions<i class="fas fa-chevron-down"></i></button>
                    <div class="instructions">
                        <ol>
                            <li>Go to <a href="https://pubapi.bigtincan.com/">https://pubapi.bigtincan.com</a> and click the User Login button.</li>
                            <li>Log into the tenant you wish to connect using your Hub username/password and grant access to Bigtincan Hub.</li>
                            <li>Double click the Access Token field to select the text, then copy/paste it into the field below and click Connect.</li>
                        </ol>
                    </div>
                <label for="input-token">Access Token</label><br>
                <input id="input-token" class="text-input" type="text" placeholder="Paste access token here..">`,
        'setup-key': `<h3>OAuth 2.0 with API Key</h3>
                <button type="button" class="collapsible">Show Instructions<i class="fas fa-chevron-down"></i></button>
                    <div class="instructions">
                        <ol>
                            <li>Go to Platform Configuration > Custom Apps and click the Add Application button.<br><sup>*if you already have a Public API Tool application, click the Edit button and skip to step 5</sup></li>
                            <li>Click the OAuth 2.0 with API key (Server Authentication) button.</li>
                            <li>Name the application: Public API Tool</li>
                            <li>Select all of the boxes within Application Scopes section and click the Save button.</li>
                            <li>Copy and paste the Client ID, Client Secret, and API Key to the cooresponding field below.</li>
                            <li>Click the Connect button.</li>
                        </ol>
                    </div>
                <form action="/action_page.php">
                    <label for="input-client-id">Client ID</label><br>
                    <input id="input-client-id" class="text-input" type="text" placeholder="Paste Client ID here..">
                    <br>
                    <label for="input-client-secret">Client Secret</label><br>
                    <input id="input-client-secret" class="text-input" type="text" placeholder="Paste Client Secret here..">
                    <br>
                    <label for="input-api-key">API Key</label><br>
                    <input id="input-api-key" class="text-input" type="text" placeholder="Paste API Key here..">
                </form>
                <br>
                <span id="connect-key-button" class="button-input">Connect</span>`,
        'setup-import': ``
    };
    
    return {
        getSelectors: function() {
            return getDOMSelectors();
        },
        getAccessToken: function() {
            return getAccessToken();
        },
        getClientCredentials: function() {
            return getClientCredentials();  
        },
        getHubFileCheckboxState: function() {
            return DOMSelectors.hubFileCheckbox.checked;
        },
        initUISetup: function() {
            showSetupPage();
        },
        showAuthMethod: function(method) {
            showAuthMethod(method);
        },
        showActiveTenant(tenantName) {
            showActiveTenant(tenantName);
        },
        getTemplates: function() {
            return templates;
        }
    };
})();

