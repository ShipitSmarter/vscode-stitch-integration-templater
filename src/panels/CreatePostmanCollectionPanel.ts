import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, uniqueSort} from "../utilities/functions";
import * as fs from 'fs';
import { CreatePostmanCollectionHtmlObject } from "./CreatePostmanCollectionHtmlObject";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const carrierCodeIndex = 3;

export class CreatePostmanCollectionPanel {
  // PROPERTIES
  public static currentPanel: CreatePostmanCollectionPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];
  private _scriptPath: string = '';
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
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private _createPostmanCollection(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
    // getWorkspaceFile is async -> all following steps must be executed within the 'then'
    getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {

      // show info message
      vscode.window.showInformationMessage('Creating Postman Collection for ' + this._getIntegrationName());


      // load script content
      let scriptContent = fs.readFileSync(this._scriptPath, 'utf8');

      // execute powershell
      this._runScript(terminal, functionsPath);

      // refresh window? TODO: possibly write refresh window functionality
      // ...
    });
  }

  private _runScript(terminal: vscode.Terminal, functionsPath: string) {
    // check if terminal exists and is still alive
    let terminalExists: boolean = (terminal && !(terminal.exitStatus));
    // open terminal if not yet exists
    if (!terminalExists) {
      terminal = startScript('', '');
    }

    // execute script TODO: write script input
    terminal.sendText(`cd ${this._getCarrierPath(functionsPath)}`);
    terminal.sendText(`Write-Host 'Hello World!'`);
  }

  private _getFromScript(scriptContent: string, variableName: string) : string {
    let variableValue: string = '';
    let variableRegex = new RegExp("\\$" + variableName + "\\s+=\\s+(\\S+)");
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

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["panels", "createpostmancollection", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["panels", "createpostmancollection", "style.css"]);

    // get available integration details (first time only)
    if (this._integrationObjects.length === 0) {
      await this._getAvailableIntegrations();

      let firstIntegration: { path: string, carrier: string, api: string, module: string, carriercode: string} = this._integrationObjects[0] ?? { path: "", carrier: "", api: "", module: "booking", carriercode: ""} ;

      this._fieldValues[carrierIndex]     = firstIntegration.carrier;
      this._fieldValues[apiIndex]         = firstIntegration.api;
      this._fieldValues[moduleIndex]      = firstIntegration.module;
      this._fieldValues[carrierCodeIndex] = firstIntegration.carriercode;
    }

    // set carrier array: just all carriers available (in .ps1 integration script files)
    this._carriers      = uniqueSort(this._integrationObjects.map(el => el.carrier));

    // api array: filter on carrier
    let carrierIOs    = this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier);
    this._apis          = uniqueSort(carrierIOs.map(el => el.api));

    // module array: filter on carrier and api
    let carrierApiIOs = carrierIOs.filter(el => this._fieldValues[apiIndex] === el.api );
    this._modules       = uniqueSort(carrierApiIOs.map(el => el.module));

    // construct panel html object and retrieve html
    let createPostmanCollectionHtmlObject: CreatePostmanCollectionHtmlObject = new CreatePostmanCollectionHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      this._fieldValues,
      this._carriers,
      this._apis,
      this._modules
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