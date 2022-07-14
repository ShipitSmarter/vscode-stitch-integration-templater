import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getParameter, removeQuotes, toBoolean } from "../utilities/functions";
import { ParameterHtmlObject } from "./ParameterHtmlObject";
import * as fs from "fs";

// fixed fields indices
const parameterIndex = 0;
const codecompanyIndex = 1;
const handlingagentIndex = 2;
const environmentIndex = 3;

export class ParameterPanel {
  // PROPERTIES
  public static currentPanel: ParameterPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];
  private _codeCompanyValues: string[] = ['','',''];
  private _handlingAgentValues: string[] = [];
  private _parameterNameValues: string[] = [];
  private _previousValues: string[] = [];
  private _newValues: string[] = [];
  private _currentValues: string[] = [];
  private _previous: boolean = false;
  private _managerAuth: string = '';
  private _urls: {type:string, acc:string, prod:string}[] = [];
  private _environmentOptions: string[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._panel = panel;

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
  public static render(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    if (ParameterPanel.currentPanel) {
      ParameterPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("get-parameters", "Get/Set Parameters", vscode.ViewColumn.One, {
        enableScripts: true
      });

      ParameterPanel.currentPanel = new ParameterPanel(panel, extensionUri, context);
    }
  }

   // update panel
   private _updateWebview(extensionUri: vscode.Uri) {
    this._getWebviewContent(this._panel.webview, extensionUri).then(html => this._panel.webview.html = html);
  }

  private _setWebviewMessageListener(extensionUri: vscode.Uri, webview: vscode.Webview, context: vscode.ExtensionContext) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {

          case 'refreshpanel':
            this._updateWebview(extensionUri);
            break;

          case 'refreshcontent':
            // this._refreshContent().then( () => {
            //   this._updateWebview(extensionUri);
            // });
            break;

          case 'getparameters':
            this._getParametersButton(extensionUri).then(() => {
              // update panel
              this._updateWebview(extensionUri);
            });
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
              case 'field':
                this._fieldValues[index] = value;
                switch (index) {
                  case environmentIndex:

                    break;
                }
                break;

              case 'codecompanyfield':
                this._codeCompanyValues[index] = value;
                break;
              case 'handlingagentfield':
                this._handlingAgentValues[index] = value;
                break;
              case 'parameternamefield':
                this._parameterNameValues[index] = value;
                break;
              case 'newvaluefield':
                this._newValues[index] = value;
                break;
              case 'previous':
                this._previous = toBoolean(value);
                break;
            }
            
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private async _getParametersButton(extensionUri: vscode.Uri) {
    const urls: {type:string, acc:string, prod:string} = this._urls.filter(el => el.type === 'getparameters')[0];
    let url: string = '';
    switch (this._environment()) {
      case 'ACC':
        url = urls.acc;
        break;
      case 'PROD':
        url = urls.prod;
        break;
    }
    
    // get param values
    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      this._currentValues[index] = await getParameter(url,this._managerAuth,this._parameterNameValues[index],this._codeCompanyValues[index],this._handlingAgentValues[index]);
    }    
  }

  private async _getAPIDetails() {
    this._urls = [];

    // get urls from each file and add to array 
    let getParametersPath = await getWorkspaceFile('**/templater/parameters/parameter_get.json');
    let getParameterAPIDetails = JSON.parse(fs.readFileSync(getParametersPath, 'utf8'));

    this._managerAuth = getParameterAPIDetails.Headers.Authorization;
    this._urls[0] = {type: 'getparameters', acc: getParameterAPIDetails.Parameters.Uri_ACC ?? '', prod: getParameterAPIDetails.Parameters.Uri_PROD ?? ''};
  }

  private async _getEnvironmentOptions() {
    // get module dropdown options from txt file
    let environmentOptionsPath = await getWorkspaceFile('**/templater/parameters/EnvironmentOptions.txt');
    this._environmentOptions = fs.readFileSync(environmentOptionsPath, 'utf8').split("\n").map(el => el.trim());
  }


  private async _refresh() {
    await this._getAPIDetails();
    await this._getEnvironmentOptions();
    this._fieldValues[environmentIndex] = this._environmentOptions[0];
  }

  private _environment(): string {
    return this._fieldValues[environmentIndex];
  }

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["scripts", "parameter", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["scripts", "parameter", "style.css"]);

    if (this._urls.length === 0) {
      await this._refresh();
    }

    // construct panel html object and retrieve html
    let parameterHtmlObject: ParameterHtmlObject = new ParameterHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      this._fieldValues,
      this._codeCompanyValues,
      this._handlingAgentValues,
      this._parameterNameValues,
      this._previousValues,
      this._newValues,
      this._currentValues,
      this._previous,
      this._environmentOptions
    );

    let html =  parameterHtmlObject.getHtml();

    return html;
  }

  // dispose
  public dispose() {
    ParameterPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}