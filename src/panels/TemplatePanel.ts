import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, uniqueSort, toBoolean, isEmpty, getAvailableIntegrations, getFromScript, getAvailableScenarios, getModularElements, getModularElementsWithParents, getPostmanCollectionFiles, isModular} from "../utilities/functions";
import * as fs from 'fs';
import { NEWNAMEHtmlObject } from "./TemplateHtmlObject";

// fixed fields indices
const variable0Index = 0;
const variable1Index = 1;
const variable2Index = 2;
const variable3Index = 3;

export class NEWNAMEPanel {
  // PROPERTIES
  public static currentPanel: NEWNAMEPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._panel = panel;

    // predefine some fixed fields
    // this._fieldValues[variable1Index] = 'USER_CONTENT';

    // set content
    this._getWebviewContent(this._panel.webview, extensionUri).then(html => this._panel.webview.html = html);

    // set message listener
    this._setWebviewMessageListener(extensionUri, this._panel.webview, context);

    // set ondidchangeviewstate: reload panel fields on show
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
    if (NEWNAMEPanel.currentPanel) {
      NEWNAMEPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("new-name", "New Name", vscode.ViewColumn.One, {
        enableScripts: true
      });

      NEWNAMEPanel.currentPanel = new NEWNAMEPanel(panel, extensionUri, context);
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

          case 'refreshbutton':
            this._refreshButton().then( () => {
              this._updateWebview(extensionUri);
            });
            break;

          case 'executebutton':
            this._executeButton(terminal, extensionUri);
            break;

          case 'showerrormessage':
            vscode.window.showErrorMessage(text);
            break;

          case 'showinformationmessage':
            vscode.window.showInformationMessage(text);
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
                  case variable0Index:
                    
                    break;
                  case variable1Index:
                   
                    break;
                
                }
                break;

              case 'field':
                this._fieldValues[index] = value;
                switch (index) {
                  case variable2Index:
                    
                    break;
                  case variable3Index:
                   
                    break;
                
                }
                break;
            }
            
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private _executeButton(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
    // execute someting

    // getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {
    //   // show info message
    //   vscode.window.showInformationMessage('Creating Postman Collection for ' + this._getIntegrationName());

    //   // execute powershell
    //   this._runScript(terminal, functionsPath);
    // });
  }

  private async _refreshButton() {
    // reload dropdowns and field values from local file system
    
    // this._codeCompanies = [];
    // this._carrierCodes = [];
    // this._restUrls = [];
    // await this._getCompanies();
    // await this._getRestUrls();
    // await this._getCarrierCodes();
    // this._availableScenarios          = await getAvailableScenarios(this._fieldValues[moduleIndex]);
    // this._modularElementsWithParents  = await getModularElementsWithParents(this._fieldValues[moduleIndex]);
    // this._pmcObjects                  = await getPostmanCollectionFiles();
  }

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["scripts", "newname", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["scripts", "newname", "style.css"]);

    // construct panel html object and retrieve html
    let parameterHtmlObject: NEWNAMEHtmlObject = new NEWNAMEHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      this._fieldValues
    );

    let html =  parameterHtmlObject.getHtml();

    return html;
  }

  // dispose
  public dispose() {
    NEWNAMEPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}