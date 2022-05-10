import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, uniqueSort, toBoolean} from "../utilities/functions";
import * as fs from 'fs';
import { CreatePostmanCollectionHtmlObject } from "./CreatePostmanCollectionHtmlObject";
import { create } from "domain";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const companyIndex = 3;

export class CreatePostmanCollectionPanel {
  // PROPERTIES
  public static currentPanel: CreatePostmanCollectionPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];
  private _carriers: string[] = [];
  private _apis: string[] = [];
  private _modules: string[] = [];
  private _integrationObjects: { 
    path: string, 
    carrier: string, 
    api: string, 
    module: string,
    carriercode: string
  }[] = [];
  private _codeCompanies: {
    company: string,
    codecompany: string
  }[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._panel = panel;

    // predefine some fixed fields
    this._fieldValues[moduleIndex] = 'booking';

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

          case 'createpostmancollection':
            this._createPostmanCollection(terminal, extensionUri);
            break;

          case 'showerrormessage':
            vscode.window.showErrorMessage(text);
            break;

          case 'showinformationmessage':
            vscode.window.showInformationMessage(text);
            break;

          case "savevalue":
            var classIndexValue = text.split('|');
            var index = +classIndexValue[1];
            var value = classIndexValue[2];
            this._fieldValues[index] = value;

            // do some updating and refreshing
            switch (index) {
              case carrierIndex:
                // api array: filter on carrier
                let carrierIOs                      = this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier);
                this._apis                          = uniqueSort(carrierIOs.map(el => el.api));
                this._fieldValues[apiIndex]         = this._apis[0];

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
            }
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private _getIntegrationObject() : {path:string, carrier:string, api:string, module:string, carriercode:string} {
    return this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier && this._fieldValues[apiIndex] === el.api  && this._fieldValues[moduleIndex] === el.module)[0];
  }

  private _createPostmanCollection(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
    // getWorkspaceFile is async -> all following steps must be executed within the 'then'
    getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {

      // show info message
      vscode.window.showInformationMessage('Creating Postman Collection for ' + this._getIntegrationName());

      // execute powershell
      this._runScript(terminal, functionsPath);

      //let henk = '';

      // refresh window? TODO: possibly write refresh window functionality
      // ...
    });
  }

  private _getPowerShellCommand() : string {
    // company object
    let companyObject: {company:string, codecompany:string} = this._codeCompanies.filter(el => el.company === this._fieldValues[companyIndex])[0];

    // string replace list
    let stringReplaceList: string = `$StringReplaceList = @{
      COLLECTIONNAME      = '${companyObject.company}_${this._fieldValues[carrierIndex]}_${this._fieldValues[apiIndex]}_${this._fieldValues[moduleIndex]}'
      CARRIERNAME         = '${this._fieldValues[carrierIndex]}'
      SISRESTAPIURL       = 'https://www2.shipitsmarter.com/api/ext/v1/shipments'
      MODULENAME          = '${this._fieldValues[moduleIndex]}'
    }`;

    let headers : string = `$Headers = '{
      "CodeCompany": "${companyObject.codecompany}",
      "Authorization": "{{managerlogin}}"
    }'`;

    let modulePath = `$ModulePath = '${this._fieldValues[apiIndex]}\\${this._fieldValues[moduleIndex]}'`;
    let loadFunctions = `. "..\\..\\scenario-templates\\scripts\\functions.ps1"`;
    let createPostmanCollection = `New-PostmanCollection -StringReplaceList $StringReplaceList -Headers $Headers -ModulePath $ModulePath -Test`;
    let nl = '\n';

    return stringReplaceList + nl + headers + nl + modulePath + nl + loadFunctions + nl + createPostmanCollection;
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

    // execute script write script input
    terminal.sendText(`cd ${this._getCarrierPath(functionsPath)}`);
    terminal.sendText(command);
  }

  private _getFromScript(scriptContent: string, variableName: string) : string {
    let variableValue: string = '';
    let variableRegex = new RegExp(variableName + "\\s+=\\s+(\\S+)");
    let rawVariable: string[] = scriptContent.match(variableRegex) ?? [''];
    if (rawVariable.length >= 2) {
      variableValue = rawVariable[1].replace(/["'`]*/g,'');
    }

    return variableValue;
  }

  private _getIntegrationName(): string {
    return this._fieldValues[carrierIndex] + '/' + this._fieldValues[apiIndex] + '/' + this._fieldValues[moduleIndex];
  }

  private _getCarrierPath(functionsPath: string): string {
    let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
    return filesPath + '/carriers/' + this._fieldValues[carrierIndex];
  }

  private async _getAvailableIntegrations() {
    // integration script path array
    let integrationScripts: string[] = await getWorkspaceFiles('**/carriers/*/create-*integration*.ps1');

    // build integration array
    for (const script of integrationScripts) {
      // load script content
      let scriptContent = fs.readFileSync(script, 'utf8');

      // extract carrier, api, module
      let carrier: string   = this._getFromScript(scriptContent,'CarrierName');
      let api: string       = this._getFromScript(scriptContent, 'CarrierAPI');
      let module: string    = this._getFromScript(scriptContent,'Module');
      let modular: boolean  = toBoolean(this._getFromScript(scriptContent, 'ModularXMLs').replace(/\$/,''));

      // check if any scenarios available, and if not, skip
      let scenarioGlob = modular ? `**/carriers/${carrier}/${api}/${module}/scenario-xmls/*.xml` : `**/scenario-templates/${module}/**/*.xml`;
      let scenarios: string[] = await getWorkspaceFiles(scenarioGlob);
      if (scenarios.length === 0) {
        continue;
      }

      // add array element
      this._integrationObjects.push({
        path: script,
        carrier: this._getFromScript(scriptContent,'CarrierName'),
        api: this._getFromScript(scriptContent, 'CarrierAPI'),
        module: this._getFromScript(scriptContent,'Module'),
        carriercode: this._getFromScript(scriptContent,'CARRIERCODE')
      });

    }
  }

  private async _getCompanies() {
    // get companies and codecompanies from translation file
    let translationPath = await getWorkspaceFile('**/CompanyToCodeCompany.csv');
    let translations = fs.readFileSync(translationPath, 'utf8').replace(/\r/g,'').split("\n");

    for (const translation of translations) {
      this._codeCompanies.push({
        company: translation.split(',')[0],
        codecompany: translation.split(',')[1]
      });
    }

    // sort
    this._codeCompanies = uniqueSort(this._codeCompanies);

  }

  private _initializeValues() {
    // set carrier array: just all carriers available (in .ps1 integration script files)
    this._carriers                      = uniqueSort(this._integrationObjects.map(el => el.carrier));
    this._fieldValues[carrierIndex]     = this._carriers[0];

    // api array: filter on carrier
    let carrierIOs                      = this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier);
    this._apis                          = uniqueSort(carrierIOs.map(el => el.api));
    this._fieldValues[apiIndex]         = this._apis[0];

    // module array: filter on carrier and api
    let carrierApiIOs                   = carrierIOs.filter(el => this._fieldValues[apiIndex] === el.api );
    this._modules                       = uniqueSort(carrierApiIOs.map(el => el.module));
    this._fieldValues[moduleIndex]      = this._modules[0];

    // set company
    this._fieldValues[companyIndex]     = this._codeCompanies[0].company;
  }



  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["panels", "createpostmancollection", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["panels", "createpostmancollection", "style.css"]);

    // initialize (first time)
    if (this._integrationObjects.length === 0) {
      await this._getAvailableIntegrations();
      await this._getCompanies();
      this._initializeValues();      
    }

    // construct panel html object and retrieve html
    let createPostmanCollectionHtmlObject: CreatePostmanCollectionHtmlObject = new CreatePostmanCollectionHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      this._fieldValues,
      this._carriers,
      this._apis,
      this._modules,
      this._codeCompanies.map(el => el.company)
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