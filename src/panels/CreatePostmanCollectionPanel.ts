import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, toBoolean, isEmptyStringArray, isEmpty} from "../utilities/functions";
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

  // update number of step fields
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

  private _getModularFromScript(scriptContent: string): boolean {
    let isModular: boolean = false;

    // extract modular value from ps script content using regex
    let rawModular: string[] = scriptContent.match(/\$ModularXMLs\s+=\s+\$(\S+)/) ?? [''];
    if (rawModular.length >= 2) {
      let modularString: string = rawModular[1];
      if (modularString.toLowerCase() === 'true') {
        isModular = true;
      }
    }

    return isModular;
  }


  private _getIntegrationName(): string {
    return this._fieldValues[carrierIndex] + '/' + this._fieldValues[apiIndex] + '/' + this._fieldValues[moduleIndex];
  }

  private _getCarrierPath(functionsPath: string): string {
    let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
    return filesPath + '/carriers/' + this._fieldValues[carrierIndex];
  }

  private async _getAvailableModularScenarioElements(): Promise<string[]> {
    let elementXmls: string[] = await getWorkspaceFiles('**/scenario-templates/modular/' + this._fieldValues[moduleIndex] + '/**/*.xml');

    let elements: string[] = [];

    for (let index = 0; index < elementXmls.length; index++) {
      let elementName = (cleanPath(elementXmls[index]).split('/').pop() ?? '').replace(/.xml$/, '');
      let elementParentName = parentPath(cleanPath(elementXmls[index])).split('/').pop() ?? '';
      // only show parent indicator if not [module]
      if (elementParentName === this._fieldValues[moduleIndex]) {
        elementParentName = '';
      }
      elements[index] = elementName;
    }

    return elements.sort();
  }

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["panels", "createintegration", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["panels", "createintegration", "style.css"]);

    // get available scenarios, available modular elements
    let modularElements : string[] = await this._getAvailableModularScenarioElements();

    // construct panel html object and retrieve html
    let createPostmanCollectionHtmlObject: CreatePostmanCollectionHtmlObject = new CreatePostmanCollectionHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      modularElements,
      this._fieldValues
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