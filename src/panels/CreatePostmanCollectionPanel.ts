import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, uniqueSort, toBoolean, isEmpty, getAvailableIntegrations, getFromScript, getAvailableScenarios, getModularElements, getModularElementsWithParents, getPostmanCollectionFiles, isModular} from "../utilities/functions";
import * as fs from 'fs';
import { CreatePostmanCollectionHtmlObject } from "./CreatePostmanCollectionHtmlObject";
import { create } from "domain";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const companyIndex = 3;
const nofHeadersIndex = 4;
const accountNumberIndex = 5;
const costCenterIndex = 6;
const nofScenariosIndex = 7;
const carrierCodeIndex = 8;
const pmcIndex = 9;

export class CreatePostmanCollectionPanel {
  // PROPERTIES
  public static currentPanel: CreatePostmanCollectionPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];
  private _initialValues: string[] = [];
  private _headers: {name: string, value: string}[] = [];
  private _carriers: string[] = [];
  private _apis: string[] = [];
  private _modules: string[] = [];
  private _scenarioFieldValues: string[] = [];
  private _availableScenarios: string[] = [];
  private _modularElementsWithParents: {parent:string, element:string, multi:boolean}[] = [];
  private _independent: boolean = false;
  private _modularValue: boolean = false;
  private _multiFieldValues: {[details: string] : string;} = {};
  private _nofPackages: string[] = [];
  private _integrationObjects:      {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios: {name:string, structure:string}[]}[] = [];

  private _pmcObjects : {parent:string, file:string, path:string}[] = [];

  private _showLoad : boolean = false;
  private _scenarioCustomFields: string[] = [];
  private _codeCompanies: {
    company: string,
    codecompany: string
  }[] = [];
  private _restUrls: {
    module: string,
    url: string
  }[] = [];

  private _carrierCodes: {
    carrier: string,
    carriercode: string
  }[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._panel = panel;

    // predefine some fixed fields
    this._fieldValues[moduleIndex] = 'booking';
    this._fieldValues[nofHeadersIndex] = "3";
    this._fieldValues[nofScenariosIndex] = "1";
    
    // pre-allocate headers array
    this._headers = new Array<{name: string, value: string}>(20);

    // set content
    this._getWebviewContent(this._panel.webview, extensionUri).then(html => this._panel.webview.html = html);

    // set message listener
    this._setWebviewMessageListener(extensionUri, this._panel.webview, context);

    // set ondidchangeviewstate
    this._panel.onDidChangeViewState(e => {
      const panel = e.webviewPanel;
      let isVisible = panel.visible;

      if (isVisible) {
        this._updateWebview(extensionUri);
      }
    },
      null,
      context.subscriptions
    );

    // on dispose
    this._panel.onDidDispose(this.dispose, null, this._disposables);
  }

  // METHODS
  // initial rendering
  public static render(extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    if (CreatePostmanCollectionPanel.currentPanel) {
      CreatePostmanCollectionPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("create-postman-collection", "Create Postman collection", vscode.ViewColumn.One, {
        enableScripts: true
      });

      CreatePostmanCollectionPanel.currentPanel = new CreatePostmanCollectionPanel(panel, extensionUri, context);
    }
  }

  // update panel
  private _updateWebview(extensionUri: vscode.Uri) {
    this._getWebviewContent(this._panel.webview, extensionUri).then(html => this._panel.webview.html = html);
  }

  // message listener
  private _setWebviewMessageListener(extensionUri: vscode.Uri, webview: vscode.Webview, context: vscode.ExtensionContext) {
    // Pre-allocate terminal and terminalExists
    let terminal: vscode.Terminal;

    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {

          case 'refreshpanel':
            this._updateWebview(extensionUri);
            break;

          case 'refreshcontent':
            this._refreshContent().then( () => {
              this._updateWebview(extensionUri);
            });
            break;

          case 'createpostmancollection':
            this._createPostmanCollection(terminal, extensionUri);
            break;

          case 'loadpmc':
            this._loadPmc(text);
            this._updateWebview(extensionUri);
            break;

          case 'showerrormessage':
            vscode.window.showErrorMessage(text);
            break;

          case 'showinformationmessage':
            vscode.window.showInformationMessage(text);
            break;

          case "savemultivalue":
            // extract
            var idIndexValue = text.split('|');
            var id = idIndexValue[0];
            var index = +idIndexValue[1];
            var value = idIndexValue[2];

            // save
            this._multiFieldValues[id] = value;
            
            break;
          case "savevalue":
            var classIndexValue = text.split('|');
            var clas = classIndexValue[0];
            var index = +classIndexValue[1];
            var value = classIndexValue[2];
            
            // do some updating and refreshing
            switch(clas) {
              case 'dropdown':
                this._fieldValues[index] = value;
                switch (index) {
                  case carrierIndex:
                    // api array: filter on carrier
                    let carrierIOs                      = this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier);
                    this._apis                          = uniqueSort(carrierIOs.map(el => el.api));
                    this._fieldValues[apiIndex]         = this._apis[0];
                    this._fieldValues[carrierCodeIndex] = carrierIOs[0].carriercode;
    
                    // no break: fall-through is intentional!
                  case apiIndex:
                    // module array: filter on carrier and api
                    let carrierApiIOs                   = this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier && this._fieldValues[apiIndex] === el.api );
                    this._modules                       = uniqueSort(carrierApiIOs.map(el => el.module));
                    this._fieldValues[moduleIndex]      = this._modules[0];
    
                    this._updateWebview(extensionUri);
                    break;
                  case moduleIndex:
                    break;
                  case companyIndex:
                    // update code company header field and refresh
                    this._headers[0].value = this._getCompany().codecompany;
                    this._updateWebview(extensionUri);
                    break;
                  case nofHeadersIndex:
                    // crop headers array
                    // --> direct headers array cropping will break it -> instead, tactical cropping in getWebviewContent()
                    this._updateWebview(extensionUri);
                    break;
                  case nofScenariosIndex:
                    // crop scenarios array
                    this._scenarioFieldValues = this._scenarioFieldValues.slice(0, +this._fieldValues[nofScenariosIndex]);
                    this._updateWebview(extensionUri);
                    break;
                }
                break;

              case 'dropdownfield':
                this._fieldValues[index] = value;
                switch (index) {
                  case carrierIndex:
                    this._fieldValues[carrierCodeIndex] = this._carrierCodes.filter(el => el.carrier === this._fieldValues[carrierIndex])[0].carriercode;
                    this._updateWebview(extensionUri);
                    break;
                  case moduleIndex:
                    getAvailableScenarios(this._fieldValues[moduleIndex]).then(scen => {
                      this._availableScenarios = scen;
                      getModularElementsWithParents(this._fieldValues[moduleIndex]).then(elementsWithParents => {
                        this._modularElementsWithParents = elementsWithParents;
                        this._updateWebview(extensionUri);
                      });
                    });
                    break;
                }
                break;
              case 'field':
                this._fieldValues[index] = value;
                break;
              
              case 'headername':
                this._headers[index].name = value;
                break;
              
              case 'headervalue':
                this._headers[index].value = value;
                break;

              case 'independent':
                this._independent = toBoolean(value);
                if (this._independent) {
                  this._fieldValues[carrierIndex] = this._carrierCodes[0].carrier;
                  this._fieldValues[apiIndex]     = '';
                  this._fieldValues[moduleIndex]  = 'booking';
                  this._fieldValues[carrierCodeIndex] = this._carrierCodes[0].carriercode;
                } else {
                  this._fieldValues[carrierIndex] = this._initialValues[carrierIndex];
                  this._fieldValues[apiIndex]     = this._initialValues[apiIndex];
                  this._fieldValues[moduleIndex]  = this._initialValues[moduleIndex];
                  this._fieldValues[carrierCodeIndex] = this._initialValues[carrierCodeIndex];
                }
                
                this._updateWebview(extensionUri);
                break;

              case 'modular':
                this._modularValue = toBoolean(value);
                this._scenarioFieldValues = [];
                this._updateWebview(extensionUri);
                break;

              case 'nofpackagesdropdown':
                this._nofPackages[index] = value;
                break;

              case 'scenariofield':
                this._scenarioFieldValues[index] = value;
                break;
              
              case 'scenariocustomfield':
                this._scenarioCustomFields[index] = value;
                break;

              case 'showload':
                this._showLoad = toBoolean(value);
                break;

              case 'pmcs':
                this._fieldValues[pmcIndex] = value;
            }
            
        }
      },
      undefined,
      this._disposables
    );
  }

  private _getIntegrationObject() : {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:{name:string, structure:string}[]} {
    return this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier && this._fieldValues[apiIndex] === el.api  && this._fieldValues[moduleIndex] === el.module)[0];
  }

  private _loadPmc(file:string) {
    // extract file path
    var fileName = file.replace(/[\s\S]*\s/g,'');
    var path = this._pmcObjects.filter(el => el.file === fileName)[0].path;

    // load pmc file
    var pmc = JSON.parse(fs.readFileSync(path, 'utf8'));

    if (!pmc.info.carrier) {
      vscode.window.showErrorMessage('Selected Postman Collection file is not compatible.');
    } else {
      // update fields
      this._fieldValues[carrierIndex]     = pmc.info.carrier;
      this._fieldValues[apiIndex]         = pmc.info.api;
      this._fieldValues[moduleIndex]      = pmc.info.module;
      this._fieldValues[companyIndex]     = pmc.info.customer;
      this._fieldValues[accountNumberIndex] = pmc.info.account;
      this._fieldValues[costCenterIndex]  = pmc.info.costcenter;
      this._fieldValues[carrierCodeIndex] = pmc.info.carriercode;
  
      this._independent = pmc.info.api === '';
  
      // update headers
      var header = pmc.item[0].request.header;
      this._fieldValues[nofHeadersIndex] = header.length;
      this._headers = new Array<{name: string, value: string}>(header.length);
      this._headers[0] = {
        name: header.filter((el:any) => el.key === 'CodeCompany')[0].key,
        value: header.filter((el:any) => el.key === 'CodeCompany')[0].value
      };
  
      var remainingHeaders = header.filter((el:any) => el.key !== 'CodeCompany');
      for (let index = 0; index < remainingHeaders.length; index++) {
        this._headers[index+1] = {
          name: remainingHeaders[index].key,
          value: remainingHeaders[index].value
        };
      }
  
      // update scenarios
      this._modularValue = isModular(pmc.item[0].name);
      this._fieldValues[nofScenariosIndex] = pmc.item.length;
      this._scenarioFieldValues = [];
      this._nofPackages = [];
      for (let index = 0; index < pmc.item.length; index++) {
  
        if (this._modularValue) {
          this._scenarioFieldValues[index] = pmc.item[index].name;
  
          // extract nofPackages
          var nofPackages = pmc.item[index].name.match('(?<=multi_)\\d+');
          if (nofPackages) {
            this._nofPackages[index] = nofPackages[0];
          }
        } else {
          this._scenarioFieldValues[index] = this._availableScenarios.filter(el => el.match(' ' + pmc.item[index].name + '$'))[0];
        }
      }
    }

  }

  private _createPostmanCollection(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
    // getWorkspaceFile is async -> all following steps must be executed within the 'then'
    getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {
      // show info message
      vscode.window.showInformationMessage('Creating Postman Collection for ' + this._getIntegrationName());

      // execute powershell
      this._runScript(terminal, functionsPath);
    });
  }

  private _getCompany() : {company: string, codecompany: string} {
    return this._codeCompanies.filter(el => el.company === this._fieldValues[companyIndex])[0];
  }

  private _getHeaderString() : string {
    let headerString : string = '';
    for (let index = 0; index < this._headers.length; index++) {
      let header = this._headers[index];
      if (!isEmpty(header.name)) {
        headerString += `"${header.name}": "${header.value}"`;


        // check if comma is needed
      let remaining : string[] = this._headers.slice(index+1, this._headers.length).map( el => el.name);
      if (!isEmpty(remaining.join(''))) {
        headerString += ', \n';
      }
      }
    }
    return headerString;
  }

  private _getPowerShellCommand() : string {
    // company object
    let companyObject: {company:string, codecompany:string} = this._getCompany();
    let restApiUrl = "";
    let urlObject = this._restUrls.filter(el => el.module === this._fieldValues[moduleIndex]);
    if (urlObject.length > 0) {
      restApiUrl = urlObject[0].url;
    }

    // string replace list
    // - CUSTOMERNAME
    // - CARRIERNAME
    // - APINAME
    // - MODULENAME
    // - SISRESTAPIURL
    // - CARRIERCODE

    // optional:
    // - ACCOUNTNUMBER
    // - COSTCENTER

    let accountNumberString = isEmpty(this._fieldValues[accountNumberIndex]) ? '' : `ACCOUNTNUMBER       = '${this._fieldValues[accountNumberIndex]}'`;
    let costCenterString    = isEmpty(this._fieldValues[costCenterIndex])    ? '' : `COSTCENTER          = '${this._fieldValues[costCenterIndex]}'`;

    let stringReplaceList = `$StringReplaceList = @{
      CUSTOMERNAME       = '${companyObject.company}'
      CARRIERNAME         = '${this._fieldValues[carrierIndex]}'
      APINAME             = '${this._fieldValues[apiIndex]}'
      MODULENAME          = '${this._fieldValues[moduleIndex]}'
      SISRESTAPIURL       = '${restApiUrl}'
      CARRIERCODE         = '${this._fieldValues[carrierCodeIndex]}'
      ${accountNumberString}
      ${costCenterString}      
    }`;

    let headers : string = `$Headers = '{
      ${this._getHeaderString()}
    }'`;

    // scenarios string
    let newScenariosString =  this._getNewScenarios().join(`",\n"`);
    let defScenariosString = (this._independent) ? `$Scenarios = @( \n "${newScenariosString}" \n)` : '';

    let applyScenariosString = (this._independent) ? '-Scenarios $Scenarios' : '';
    let loadFunctions = `. "..\\..\\scenario-templates\\scripts\\functions.ps1"`;
    let createPostmanCollection = `New-PostmanCollection -StringReplaceList $StringReplaceList -Headers $Headers ${applyScenariosString} -Test`;
    let nl = '\n';

    return stringReplaceList + nl + headers + nl + defScenariosString + nl + loadFunctions + nl + createPostmanCollection;
  }

  private _runScript(terminal: vscode.Terminal, functionsPath: string) {
    // get script string
    let command = this._getPowerShellCommand();

    // check if terminal exists and is still alive
    let terminalExists: boolean = (terminal && !(terminal.exitStatus));
    // open terminal if not yet exists
    if (!terminalExists) {
      terminal = startScript('', '');
    }

    // determine filepath
    let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
    let subPath = this._independent ? `postman/${this._fieldValues[carrierCodeIndex]}` : `carriers/${this._fieldValues[carrierIndex]}`;
    let cdDir = `${filesPath}/${subPath}`;
    if (this._independent) {
      fs.mkdirSync(cdDir, { recursive: true });
    }
  
    // execute script write script input
    terminal.sendText(`cd '${cdDir}'`);
    terminal.sendText(command);
  }

  private _getNewScenarioValue(fieldValue:string) : string {
    let newScenarioValue = '';
    if (!isEmpty(fieldValue)) {
      newScenarioValue = fieldValue.replace(/[^\>]+\> /g, '');
    }
    return newScenarioValue;
  }

  private _getNewScenarios() : string[] {
    let newScenarios: string[] = [];
    // if modular: combine with custom names
    if (this._modularValue) {
      for (let index = 0; index < this._scenarioFieldValues.length; index++) {
        if (!isEmpty(this._scenarioFieldValues[index])) {
          newScenarios[index] = this._scenarioFieldValues[index] + '|' + this._scenarioCustomFields[index];
        }
      }
    } else {
      newScenarios =  this._scenarioFieldValues.map( el => this._getNewScenarioValue(el));
    }

    return newScenarios.filter(el => !isEmpty(el)).sort();
  }

  private _getIntegrationName(): string {
    return this._fieldValues[carrierIndex] + '/' + this._fieldValues[apiIndex] + '/' + this._fieldValues[moduleIndex];
  }

  private _getCarrierPath(functionsPath: string): string {
    let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
    return filesPath + '/carriers/' + this._fieldValues[carrierIndex];
  }

  private async _getCompanies() {
    // get companies and codecompanies from translation file
    let translationPath = await getWorkspaceFile('**/templater/postman/CompanyToCodeCompany.csv');
    let translations = fs.readFileSync(translationPath, 'utf8').replace(/\r/g,'').split("\n");

    this._codeCompanies = new Array<{company: string, codecompany: string}>(translations.length);

    for (let index = 0; index < translations.length; index++) {
      this._codeCompanies[index] = {
        company: translations[index].split(',')[0],
        codecompany: translations[index].split(',')[1]
      };
    }

    // sort
    this._codeCompanies = this._codeCompanies.sort((a, b) => (a.company > b.company) ? 1 : -1);

  }

  private async _getCarrierCodes() {
    // get companies and codecompanies from translation file
    let translationPath = await getWorkspaceFile('**/templater/postman/CarrierToCarrierCode.csv');
    let translations = fs.readFileSync(translationPath, 'utf8').replace(/\r/g,'').split("\n");

    this._carrierCodes = new Array<{carrier: string, carriercode: string}>(translations.length);

    for (let index = 0; index < translations.length; index++) {
      this._carrierCodes[index] = {
        carrier: translations[index].split(',')[0],
        carriercode: translations[index].split(',')[1]
      };
    }

    // sort
    this._carrierCodes = this._carrierCodes.sort((a, b) => (a.carrier > b.carrier) ? 1 : -1);
  }

  private async _getRestUrls() {
    // get companies and codecompanies from translation file
    let translationPath = await getWorkspaceFile('**/templater/postman/ModuleToTestRestApiUrl.csv');
    let translations = fs.readFileSync(translationPath, 'utf8').replace(/\r/g,'').split("\n");

    this._restUrls = new Array<{module: string, url: string}>(translations.length);

    for (let index = 0; index < translations.length; index++) {
      this._restUrls[index] = {
        module: translations[index].split(',')[0],
        url: translations[index].split(',')[1]
      };
    }
  }

  private _initializeValues() {
    // set carrier array: just all carriers available (in .ps1 integration script files)
    this._carriers                      = uniqueSort(this._integrationObjects.map(el => el.carrier));
    this._fieldValues[carrierIndex]     = this._carriers[0];
    this._initialValues[carrierIndex]   = this._carriers[0];
    this._fieldValues[carrierCodeIndex] = this._integrationObjects.filter(el => el.carrier === this._fieldValues[carrierIndex])[0].carriercode;
    this._initialValues[carrierCodeIndex] = this._fieldValues[carrierCodeIndex];

    // api array: filter on carrier
    let carrierIOs                      = this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier);
    this._apis                          = uniqueSort(carrierIOs.map(el => el.api));
    this._fieldValues[apiIndex]         = this._apis[0];
    this._initialValues[apiIndex]         = this._apis[0];

    // module array: filter on carrier and api
    let carrierApiIOs                   = carrierIOs.filter(el => this._fieldValues[apiIndex] === el.api );
    this._modules                       = uniqueSort(carrierApiIOs.map(el => el.module));
    this._fieldValues[moduleIndex]      = this._modules[0];
    this._initialValues[moduleIndex]      = this._modules[0];

    // set company
    this._fieldValues[companyIndex]     = this._codeCompanies[0].company;
    this._initialValues[companyIndex]   = this._codeCompanies[0].company;

    // set initial headers
    this._headers[0] = {name: 'CodeCompany', value: this._codeCompanies[0].codecompany};
    this._headers[1] = {name: 'Authorization', value: '{{managerlogin}}'};
    this._headers[2] = {name: 'CustomerHandlingAgent', value: ''};

    // default cost center
    this._fieldValues[costCenterIndex] = '000001';
  }

  private async _refreshContent() {
    this._integrationObjects = await getAvailableIntegrations('postman');
    // this._codeCompanies = [];
    // this._carrierCodes = [];
    // this._restUrls = [];
    await this._getCompanies();
    await this._getRestUrls();
    await this._getCarrierCodes();
    this._availableScenarios          = await getAvailableScenarios(this._fieldValues[moduleIndex]);
    this._modularElementsWithParents  = await getModularElementsWithParents(this._fieldValues[moduleIndex]);
    this._pmcObjects                  = await getPostmanCollectionFiles();
  }

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["scripts", "createpostmancollection", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["scripts", "createpostmancollection", "style.css"]);

    // initialize (first time)
    if (this._integrationObjects.length === 0) {
      this._integrationObjects = await getAvailableIntegrations('postman');
      await this._getCompanies();
      await this._getRestUrls();
      await this._getCarrierCodes();
      this._initializeValues();
      this._availableScenarios          = await getAvailableScenarios(this._fieldValues[moduleIndex]);
      this._modularElementsWithParents  = await getModularElementsWithParents(this._fieldValues[moduleIndex]);
      this._pmcObjects                  = await getPostmanCollectionFiles();
    }

    // crop flexible header field values
    for (let index = +this._fieldValues[nofHeadersIndex] ?? 0; index < 20; index++) {
      this._headers[index] = { name: '', value: '' };
    }

    // choose which type of carriers and modules to show
    let carriers = this._independent ? this._carrierCodes.map(el => el.carrier) : this._carriers;
    let modules = this._independent ? this._restUrls.map(el => el.module) : this._modules;

    // construct panel html object and retrieve html
    let createPostmanCollectionHtmlObject: CreatePostmanCollectionHtmlObject = new CreatePostmanCollectionHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      this._fieldValues,
      this._headers,
      carriers,
      this._apis,
      modules,
      this._codeCompanies.map(el => el.company),
      this._carrierCodes,
      this._scenarioFieldValues,
      this._availableScenarios,
      this._modularElementsWithParents,
      this._independent,
      this._modularValue,
      this._multiFieldValues,
      this._nofPackages,
      this._pmcObjects,
      this._showLoad,
      this._scenarioCustomFields
    );

    let html =  createPostmanCollectionHtmlObject.getHtml();

    return html;
  }

  // dispose
  public dispose() {
    CreatePostmanCollectionPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}