import * as vscode from "vscode";
import { getUri, getWorkspaceFile, removeQuotes, toBoolean, isEmpty, cleanPath, parentPath, getFileContentFromGlob, getDateTimeStamp } from "../utilities/functions";
import { ParameterHtmlObject } from "./ParameterHtmlObject";
import * as fs from "fs";
import axios from 'axios';
import * as csvParse from "csv-parse";

// fixed fields indices
const parameterIndex = 0;
const codecompanyIndex = 1;
const handlingagentIndex = 2;
const environmentIndex = 3;
const filesIndex = 4;
const noflinesIndex = 5;
const saveIndex = 6;
const allChangeReasonsIndex = 7;

// type defs
type ParameterObject = {
  codecompany: string;
  codecustomer: string;
  name: string;
  previousvalue: string;
  newvalue: string;
};

type UrlObject = {
  type:string;
  acc:string; 
  prod:string;
};

type ResponseObject = {
  status:number;
  value:string;
  message:string;
};

export class ParameterPanel {
  // PROPERTIES
  public static currentPanel: ParameterPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];
  private _codeCompanyValues: string[] = [''];
  private _codeCustomerValues: string[] = [];
  private _parameterNameValues: string[] = [];
  private _previousValues: string[] = [];
  private _newValues: string[] = [];
  private _setResponseValues: ResponseObject[] = [];
  private _changeReasonValues: string[] = [];
  private _currentValues: string[] = [];
  private _getResponseValues: ResponseObject[] = [];
  private _previous: boolean = false;
  private _showLoad: boolean = false;
  private _managerAuth: string = '';
  private _delimiter: string = ';';
  private _urls: UrlObject[] = [];
  private _environmentOptions: string[] = [];
  // private _parameterObjects: ParameterObject[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._panel = panel;

    // set initial values
    this._fieldValues[noflinesIndex] = '1';

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
          case 'showerrormessage':
            vscode.window.showErrorMessage(text);
            break;

          case 'showinformationmessage':
            vscode.window.showInformationMessage(text);
            break;

          case 'refreshpanel':
            this._updateWebview(extensionUri);
            break;

          case 'refreshcontent':
            // this._refreshContent().then( () => {
            //   this._updateWebview(extensionUri);
            // });
            break;

          case 'getparameters':
            this._getCurrentValues().then(() => {
              // update panel
              this._updateWebview(extensionUri);
            });
            break;

          case 'setparameters':
            if (this._checkSaveFolder())  {
              this._setParametersButton(extensionUri).then(() => {
                // confirm
                vscode.window.showInformationMessage('Parameters set');
                // update panel
                this._updateWebview(extensionUri);
              });
            }

          case 'savetofile':
            if (this._checkSaveFolder())  {
              // save to file
              let fileName:string = 'Saved_' + this._codeCompanyValues[0]+'_'+ this._fieldValues[environmentIndex] +'_' + getDateTimeStamp() + '.csv';
              this._writeFile(this._fieldValues[saveIndex]+ '/'+ fileName);
              // confirm
              vscode.window.showInformationMessage('Input saved to ' + fileName);
            }
            
            break;

          case 'loadfile':
            this._loadFile(text);
            this._updateWebview(extensionUri);
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
                  case noflinesIndex:
                    // crop line arrays
                    this._cropLines(+this._fieldValues[noflinesIndex]);
                    // update webview
                    this._updateWebview(extensionUri);
                    break;
                  case filesIndex:
                    if (this._getPath()) {
                      this._updateWebview(extensionUri);
                    }
                    break;
                }
                break;

              case 'codecompanyfield':
                this._codeCompanyValues[index] = value;
                break;
              case 'codecustomerfield':
                this._codeCustomerValues[index] = value;
                break;
              case 'parameternamefield':
                this._parameterNameValues[index] = value;
                break;
              case 'newvaluefield':
                this._newValues[index] = value;
                break;
              case 'changereasonfield':
                this._changeReasonValues[index] = value;
                break;
              case 'previous':
                this._previous = toBoolean(value);
                break;

              case 'showload':
                this._showLoad = toBoolean(value);
                break;
            }
            
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private _checkSaveFolder(): boolean {
    let isValid: boolean = fs.existsSync(this._fieldValues[saveIndex]);
    if (!isValid) {
      vscode.window.showErrorMessage('Save folder is not an existing directory');
    }

    return isValid;
  }

  private _getPath(): boolean {
    let updatePath:boolean = false;
    if (fs.existsSync(this._fieldValues[filesIndex])) {
      let path: string = parentPath(cleanPath(this._fieldValues[filesIndex]));
      this._fieldValues[saveIndex] = path;
      updatePath = true;
    }

    return updatePath;
  }

  private _getUrl(urls:UrlObject) : string {
    let url: string = '';
    switch (this._environment()) {
      case 'ACC':
        url = urls.acc;
        break;
      case 'PROD':
        url = urls.prod;
        break;
    }

    return url;
  }

  private async _setParametersButton(extensionUri: vscode.Uri) {

    // get url
    const urls: UrlObject = this._urls.filter(el => el.type === 'setparameters')[0];
    let url: string = this._getUrl(urls);

    // refresh current values
    await this._getCurrentValues();

    // update input values
    let setValues: string[] = this._previous ? this._previousValues : this._newValues; 
    this._previousValues = this._currentValues;
    this._newValues = setValues;
    this._previous = false;

    // save values to file
    let fileName:string = 'Set_' + this._codeCompanyValues[0]+'_'+ this._fieldValues[environmentIndex] +'_' + getDateTimeStamp() + '.csv';
    this._writeFile(this._fieldValues[saveIndex]+ '/'+ fileName);

    // clear previous responses and update webview
    this._currentValues= [];
    this._setResponseValues = [];
    this._getResponseValues = [];
    this._updateWebview(extensionUri);

    // set param values
    const updatePer: number = 3;
    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      this._setResponseValues[index] = await this._setParameter(url,this._managerAuth,this._parameterNameValues[index],this._codeCompanyValues[index],this._codeCustomerValues[index],setValues[index], this._changeReasonValues[index]);

      if ((index % updatePer) === 0 || index === (this._codeCompanyValues.length -1)) {
        this._updateWebview(extensionUri);
      }
    }  

  }

  private async _setParameter(baseurl:string, authorization:string, parameterName:string, codeCompany:string, codeCustomer:string,parameterValue:string, changeReason:string) : Promise<ResponseObject> {
    let result: ResponseObject;
    try {
      const response = await axios({
        method: "POST",
        data: {
          codeParam: parameterName,
          paramDescription: "",
          value: parameterValue,
          changeReason: (isEmpty(changeReason) ? "" : changeReason),
          codeCustomer: codeCustomer
      },
        url: baseurl,
        headers: {
          'Content-Type': 'application/json',
          'CodeCompany': codeCompany,
          'Authorization': authorization
        }
      });
      result = {
        status: response.status,
        value: response.statusText,
        message: response.statusText
      };

    } catch (err:any) {
      let message: string;
      if (err.response.data.hasOwnProperty('errors')) {
        message = err.response.data?.errors[0]?.message;
      } else if (err.response.data.hasOwnProperty('Message')) {
        message = err.response.data.Message;
      } else {
        message = '';
      }

      result = {
        status: err.response.status,
        value: err.response.statusText,
        message: err.response.statusText + ' : ' + message
      };
    }

    return result;
  };

  private async _getCurrentValues() {
    const urls: UrlObject = this._urls.filter(el => el.type === 'getparameters')[0];
    let url: string = this._getUrl(urls);
    
    // get param values
    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      let response: ResponseObject = await this._getParameter(url,this._managerAuth,this._parameterNameValues[index],this._codeCompanyValues[index],this._codeCustomerValues[index]);
      this._currentValues[index] = response.value;
      this._getResponseValues[index] = response;
    }    
  }

  private async _getParameter(baseurl:string, authorization:string, parameterName:string, codeCompany:string, handlingAgent:string): Promise<ResponseObject> {
    let result: ResponseObject;
    try {
      const response = await axios({
        method: "GET",
        url: `${baseurl}/${parameterName}/${handlingAgent}`,
        responseType: 'arraybuffer',
        responseEncoding: "binary",
        headers: {
          'CodeCompany': codeCompany,
          'Authorization': authorization
        }
      });

      let value: string = removeQuotes(Buffer.from(response.data).toString());

      result = {
        status: response.status,
        value: value,
        message: response.statusText
      };

    } catch (err:any) {
      result = {
        status: err.response.status,
        value: '',
        message: err.response.statusText
      };
    }

    return result;
  };

  private _cropLines(lines:number) {
    // crop line arrays
    this._codeCompanyValues = this._codeCompanyValues.slice(0, lines);
    this._codeCustomerValues = this._codeCustomerValues.slice(0, lines);
    this._parameterNameValues = this._parameterNameValues.slice(0, lines);
    this._previousValues = this._previousValues.slice(0, lines);
    this._newValues = this._newValues.slice(0, lines);
    this._changeReasonValues = this._changeReasonValues.slice(0, lines);
    this._currentValues = this._currentValues.slice(0, lines);
  }

  private _preParse(input:string):string {
    // preparse: replace double quotes, delimiter by strings
    let quote = '{quote}';
    let delim = '{delim}';

    // replace in-value quotes
    let prep = input.replace(/""/g,quote);

    // replace in-value delimiters (from https://stackoverflow.com/a/37675638/1716283)
    prep = (this._delimiter + prep + this._delimiter).replace(/(?<=;")[\s\S]*(?=";)/g, (m:string) => {
      return m.replace(/;/g, delim);
     });
    // remove first and last added delimiters
    prep = prep.replace(/^;/,'').replace(/;$/,'');

    // remove remaining quotes
    prep = prep.replace(/"/g,'');

    return prep;
  }

  private _postParse(input:string):string {
    // postparse: replace strings by original characters
    let quote = '{quote}';
    let delim = '{delim}';

    let post = input.replace(new RegExp(quote,'g'),'"').replace(new RegExp(delim,'g'),this._delimiter);

    return post;
  }

  private _loadFile(filePath:string) {

    // load file
    const fileContent = fs.readFileSync(filePath, {encoding:'utf8'});

    let skipheader:boolean = true;
    let parameterLines: string[] = fileContent.split('\r\n');

    // remove empty lines and header line
    parameterLines = parameterLines.filter(el => !el.startsWith(this._delimiter)).filter(el => !isEmpty(el));
    if (skipheader) {
      parameterLines.shift();
    }

    // update line arrays
    this._fieldValues[noflinesIndex] = parameterLines.length + '';
    this._cropLines(parameterLines.length);

    // convert to object array
    //let parameterObjects: ParameterObject[] = new Array<ParameterObject>(parameterLines.length);
    for (let index=0; index < parameterLines.length; index++) {

      // preparse: replace in-value delimiters and quotes
      let prep = this._preParse(parameterLines[index]);

      let line: string[] = prep.split(this._delimiter);

      // fill parameters
      this._codeCompanyValues[index] = this._postParse(line[0]);
      this._codeCustomerValues[index] = this._postParse(line[1]);
      this._parameterNameValues[index] = this._postParse(line[2]);
      this._previousValues[index] = this._postParse(line[3]);
      this._newValues[index] = this._postParse(line[4]);
      this._changeReasonValues[index] = this._postParse(line[5]);
    }
  }

  private _writeFile(filePath:string) {
    // construct file content
    let fileContent: string = 'CodeCompany;CodeCustomer;Name;PreviousValue;NewValue;ChangeReason\r\n';
    for (let index=0; index < this._codeCompanyValues.length; index++) {
      // construct line
      fileContent +=  this._codeCompanyValues[index] + this._delimiter
                    + this._codeCustomerValues[index] + this._delimiter
                    + this._parameterNameValues[index] + this._delimiter
                    + this._previousValues[index] + this._delimiter
                    + this._newValues[index] + this._delimiter
                    + this._changeReasonValues[index];

      // add newline
      if (index !== this._codeCompanyValues.length -1) {
        fileContent += '\r\n';
      }
    }

    // write to file
    fs.writeFileSync(filePath,fileContent);
  }

  private async _getAPIDetails() {
    this._urls = [];

    // get stuff
    let fileContent = await getFileContentFromGlob('**/templater/parameters/stuff.json');
    let stuffDetails = JSON.parse(fileContent);
    this._managerAuth = stuffDetails.Stuff;

    // retrieve urls
    this._urls[0] = await this._getUrlObject('**/templater/parameters/parameter_get.json','getparameters');
    this._urls[1] = await this._getUrlObject('**/templater/parameters/parameter_set.json','setparameters');
  }

  private async _getUrlObject(glob:string, type:string) : Promise<UrlObject> {
    let fileContent:string = await getFileContentFromGlob(glob);
    let details = JSON.parse(fileContent);
    return {type: type, acc: details.Parameters.Uri_ACC ?? '', prod: details.Parameters.Uri_PROD ?? ''};
  }

  private async _getEnvironmentOptions() {
    // get module dropdown options from txt file
    let fileContent: string = await getFileContentFromGlob('**/templater/parameters/EnvironmentOptions.txt');
    this._environmentOptions = fileContent.split("\n").map(el => el.trim());
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
      this._codeCustomerValues,
      this._parameterNameValues,
      this._previousValues,
      this._newValues,
      this._changeReasonValues,
      this._setResponseValues,
      this._currentValues,
      this._getResponseValues,
      this._previous,
      this._showLoad,
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