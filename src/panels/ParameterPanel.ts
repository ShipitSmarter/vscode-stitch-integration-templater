import * as vscode from "vscode";
import { getUri, getWorkspaceFile, removeQuotes, toBoolean, isEmpty, cleanPath, parentPath, getFileContentFromGlob, getDateTimeStamp, nameFromPath, isDirectory, getWorkspaceFiles } from "../utilities/functions";
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

type CodeCompanyObject = {
  company: string;
  codecompany: string;
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
  private _parameterSearchValues: string[][] = [];
  private _previousValues: string[] = [];
  private _newValues: string[] = [];
  private _setResponseValues: ResponseObject[] = [];
  private _changeReasonValues: string[] = [];
  private _currentValues: string[] = [];
  private _currentChangeReasonValues: string[] = [];
  private _currentTimestampValues: string[] = [];
  private _extendedHistoryValues: string[] = [];
  private _getResponseValues: ResponseObject[] = [];
  private _previous: boolean = false;
  private _showAuth: boolean = false;
  private _processingSet: boolean = false;
  private _processingGet: boolean = false;
  private _delimiter: string = ';';
  private _urls: UrlObject[] = [];
  private _environmentOptions: string[] = [];
  private _codeCompanies: CodeCompanyObject[] = [];
  private _settingsGlob: string = "**/templater/parameters/";
  private _authLocation: string = 'parameters_auth/auth.json';
  private _focusLine: number = -1;

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext, loadFile:string = '') {
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

    // if loadFile: load file
    this._loadFileIfPresent(extensionUri,loadFile);
  }

  // METHODS
  public static render(extensionUri: vscode.Uri, context: vscode.ExtensionContext, loadFile:string = '') {
    if (ParameterPanel.currentPanel) {
      ParameterPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);

      // if loadFile: load file
      ParameterPanel.currentPanel._loadFileIfPresent(extensionUri,loadFile);

    } else {
      const panel = vscode.window.createWebviewPanel("get-parameters", "Get/Set Parameters", vscode.ViewColumn.One, {
        enableScripts: true
      });

      ParameterPanel.currentPanel = new ParameterPanel(panel, extensionUri, context, loadFile);
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

          case 'parametersearch':
            if (this._checkAuthentication()){
              this._parameterSearchButton(+text).then( () => {
                this._updateWebview(extensionUri);
              });
            }
            break;
          case 'getparameters':
            if (this._checkAuthentication()){
              // clear previous responses and update webview
              this._currentValues= [];
              this._currentChangeReasonValues = [];
              this._currentTimestampValues = [];
              this._extendedHistoryValues = [];
              this._getResponseValues = [];
              this._processingGet = true;
              this._updateWebview(extensionUri);

              // retrieve 
              this._getCurrentValues().then(() => {
                this._processingGet = false;
                // update panel
                this._updateWebview(extensionUri);
              });
            } else {
              this._updateWebview(extensionUri);
            }
            
            break;

          case 'setparameters':
            if (this._checkSaveFolder() && this._checkAuthentication())  {
              this._setParametersButton(extensionUri).then(() => {
                // confirm
                vscode.window.showInformationMessage('Parameters set');
                // update panel
                this._updateWebview(extensionUri);
              });
            } else {
              this._updateWebview(extensionUri);
            }
            break;

          case 'savetofile':
            if (this._checkSaveFolder())  {
              // save to file
              let fileNameProposed:string = 'Saved_' + this._codeCompanyValues[0]+'_'+ this._fieldValues[environmentIndex] +'_' + getDateTimeStamp() + '.csv';
              let isDir:boolean = isDirectory(this._fieldValues[saveIndex]);
              let filePath: string = this._fieldValues[saveIndex] + (isDir ? ('/' + fileNameProposed) : '');
              this._writeFile(filePath);
              // confirm
              vscode.window.showInformationMessage('Input saved to ' + nameFromPath(filePath));
            }
            
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
                let oldLines:number = +this._fieldValues[noflinesIndex];
                this._fieldValues[index] = value;
                switch (index) {
                  case noflinesIndex:
                    let nofLines:number = +this._fieldValues[noflinesIndex];
                    if (nofLines > oldLines) {
                      this._focusLine = oldLines;
                    }

                    // crop line arrays
                    this._cropLines(nofLines);

                    // update company, customer, change reason fields
                    this._codeCompanyValues = this._fillWithLastUnempty(this._codeCompanyValues,nofLines-1);
                    this._codeCustomerValues = this._fillWithLastUnempty(this._codeCustomerValues,nofLines-1);
                    this._changeReasonValues = this._fillWithLastUnempty(this._changeReasonValues,nofLines-1,this._fieldValues[allChangeReasonsIndex]);

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
              case 'showauth':
                this._showAuth = toBoolean(value);
                break;
            }
            
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private _getAuth() : string {
    // get user/pw from input/file
    // let user: string = this._fieldValues[userIndex];
    // let pw: string = this._fieldValues[pwIndex];
    // let authString:string = Buffer.from(user + ':' + pw).toString('base64');
    // return 'Basic ' + authString;

    // get string from settings
    let authString: string = vscode.workspace.getConfiguration().get<string>('stitch.basicAuthenticationString') ?? '';

    return authString;
  }

  private _loadFileIfPresent(extensionUri:vscode.Uri, loadFile:string) {
    if (!isEmpty(loadFile)) {
      this._fieldValues[filesIndex] = loadFile;
      this._getPath();
      this._loadFile(loadFile);

      // clear previous responses and update webview
      this._currentValues= [];
      this._currentChangeReasonValues = [];
      this._currentTimestampValues = [];
      this._extendedHistoryValues = [];
      this._setResponseValues = [];
      this._getResponseValues = [];
      this._updateWebview(extensionUri);
    }
  }

  private _checkSaveFolder(): boolean {
    let isValid: boolean = (fs.existsSync(this._fieldValues[saveIndex]) || fs.existsSync(parentPath(cleanPath(this._fieldValues[saveIndex]))));
    if (!isValid) {
      vscode.window.showErrorMessage('Save folder is not an existing directory');
    }

    return isValid;
  }

  private _checkAuthentication() : boolean {
    let isValid: boolean = this._getAuth().length > 10;
    if (!isValid) {
      vscode.window.showErrorMessage("Setting 'Stitch: Basic Authentication String' has not been set.");
    }

    return isValid;
  }

  private _getPath(): boolean {
    let updatePath:boolean = false;
    if (fs.existsSync(this._fieldValues[filesIndex])) {
      // let path: string = parentPath(cleanPath(this._fieldValues[filesIndex]));
      // this._fieldValues[saveIndex] = path;
      this._fieldValues[saveIndex] = this._fieldValues[filesIndex];

      updatePath = true;
    }

    return updatePath;
  }

  private _fillWithLastUnempty(array:string[],maxIndex:number, value:string='') : string[] {
    let newArray: string[] = array;
    let startIndex:number = 0;
    for (let index=maxIndex; index>=0; index--) {
      if (!isEmpty(array[index]) || index === 0) {
        startIndex = index + 1;

        if (isEmpty(value)) {
          value = array[index];
        }
        
        break;
      }
    }

    if (!isEmpty(value)) {
      for (let index=startIndex; index<=maxIndex; index++) {
        newArray[index] = value;
      }
    }

    return newArray;
  }

  private _getUrl(type:string) : string {
    const urls: UrlObject = this._urls.filter(el => el.type === type)[0];

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

  private async _parameterSearchButton(index:number) {
    if (!isEmpty(this._parameterNameValues[index]) && !isEmpty(this._codeCompanyValues[index]) && !isEmpty(this._codeCustomerValues[index])) {
      let urlGetParameterCodes: string = `${this._getUrl('getparametercodes')}?filter=${this._parameterNameValues[index] ?? ''}`;
      let parameterCodesResponse: ResponseObject = await this._getApiCall(urlGetParameterCodes,this._getAuth(),this._codeCompanyValues[index]);
  
      if (parameterCodesResponse.status === 200) {
        let responseJson = JSON.parse(parameterCodesResponse.value);
  
        let dropdownOptions: string[] = [];
        dropdownOptions[0] = this._parameterNameValues[index];
        for (let row = 0; row < Math.min(15,responseJson.length ?? 15); row++) {
          dropdownOptions[row+1] = responseJson[row].key + ' (' + responseJson[row].value + ')';
        }
  
        this._parameterSearchValues[index] = dropdownOptions;
  
        let piet = 'bla';
      }
    }
  }

  private async _setParametersButton(extensionUri: vscode.Uri) {

    // get url
    let url: string = this._getUrl('setparameters');

    // refresh current values
    await this._getCurrentValues();

    // update input values
    let setValues: string[] = this._previous ? this._previousValues : this._newValues; 
    this._previousValues = this._currentValues;
    this._newValues = setValues;
    this._previous = false;

    // save values to file
    let fileName:string = 'Set_' + this._codeCompanyValues[0]+'_'+ this._fieldValues[environmentIndex] +'_' + getDateTimeStamp() + '.csv';
    let fileDir: string = isDirectory(this._fieldValues[saveIndex]) ? this._fieldValues[saveIndex] : parentPath(cleanPath(this._fieldValues[saveIndex]));
    this._writeFile(fileDir + '/'+ fileName);

    // clear previous responses and update webview
    this._currentValues= [];
    this._currentChangeReasonValues = [];
    this._currentTimestampValues = [];
    this._extendedHistoryValues = [];
    this._setResponseValues = [];
    this._getResponseValues = [];
    this._processingSet = true;
    this._updateWebview(extensionUri);

    // set param values
    // const updatePer: number = 3;
    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      this._setResponseValues[index] = await this._setParameter(url,this._getAuth(),this._parameterNameValues[index],this._codeCompanyValues[index],this._codeCustomerValues[index],setValues[index], this._changeReasonValues[index]);

      // if ((index % updatePer) === 0 || index === (this._codeCompanyValues.length -1)) {
      //   this._updateWebview(extensionUri);
      // }
    }

    this._processingSet = false;
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
    // get base urls
    let baseUrlGetParameter: string = this._getUrl('getparameters');
    let baseUrlGetHistory: string = this._getUrl('getparameterhistory');
    
    // get param values
    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      // construct urls
      let urlGetParameter: string = `${baseUrlGetParameter}/${this._parameterNameValues[index]}/${this._codeCustomerValues[index]}`;
      let urlGetHistory: string = `${baseUrlGetHistory}/${this._codeCustomerValues[index]}/${this._parameterNameValues[index]}/1`;

      // step 1: parameter service call
      let parameterResponse: ResponseObject = await this._getApiCall(urlGetParameter,this._getAuth(),this._codeCompanyValues[index]);

      // step 2: if not exists: '', else execute history call
      if (parameterResponse.status >= 200 && parameterResponse.status <= 299 ) {
        let historyResponse: ResponseObject = await this._getApiCall(urlGetHistory,this._getAuth(),this._codeCompanyValues[index]);
        let responseJson = JSON.parse(historyResponse.value);      
        this._currentValues[index] = responseJson[0].paramValue;
        this._currentChangeReasonValues[index] = responseJson[0].changeReason;
        this._currentTimestampValues[index] = responseJson[0].dateTimeAction.substring(0,19);
        this._getResponseValues[index] = historyResponse;

        // fill extended history
        this._extendedHistoryValues[index] = '';
        for (let row=0; row < (Math.min(5,responseJson.length)); row++) {
          this._extendedHistoryValues[index] += `${row} | ${responseJson[row].dateTimeAction.substring(0,19)} | ${responseJson[row].changeReason} | ${responseJson[row].paramValue}\r\n`;
        }
      } else {
        this._currentValues[index] = parameterResponse.value;
        this._getResponseValues[index] = parameterResponse;
      }

    }    
  }

  private async _getApiCall(url:string, authorization:string, codeCompany:string): Promise<ResponseObject> {
    let result: ResponseObject;
    try {
      const response = await axios({
        method: "GET",
        url: url,
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

  private async _getCompanies() {
    // get companies and codecompanies from translation file
    let translationPath = await getWorkspaceFile(this._settingsGlob + 'CompanyToCodeCompany.csv');
    let translations = fs.readFileSync(translationPath, 'utf8').replace(/\r/g,'').split("\n");

    this._codeCompanies = new Array<CodeCompanyObject>(translations.length);

    for (let index = 0; index < translations.length; index++) {
      this._codeCompanies[index] = {
        company: translations[index].split(',')[0],
        codecompany: translations[index].split(',')[1]
      };
    }

    // sort
    this._codeCompanies = this._codeCompanies.sort((a, b) => (a.company > b.company) ? 1 : -1);

  }

  private _cropLines(lines:number) {
    // crop line arrays
    this._codeCompanyValues = this._codeCompanyValues.slice(0, lines);
    this._codeCustomerValues = this._codeCustomerValues.slice(0, lines);
    this._parameterNameValues = this._parameterNameValues.slice(0, lines);
    this._previousValues = this._previousValues.slice(0, lines);
    this._newValues = this._newValues.slice(0, lines);
    this._changeReasonValues = this._changeReasonValues.slice(0, lines);
    this._currentValues = this._currentValues.slice(0, lines);
    this._currentChangeReasonValues = this._currentChangeReasonValues.slice(0,lines);
    this._currentTimestampValues = this._currentTimestampValues.slice(0,lines);
    this._extendedHistoryValues = this._extendedHistoryValues.slice(0,lines);
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
    let parameterLines: string[] = fileContent.replace(/\r/g,'').split('\n');

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

    // set environment if present in file name
    const fileName:string = nameFromPath(filePath);
    for (const env of this._environmentOptions) {
      if (fileName.includes(env)) {
        this._fieldValues[environmentIndex] = env;
        break;
      }
    }
  }

  private _writeFile(filePath:string) {
    // construct file content
    let fileContent: string = 'CodeCompany;CodeCustomer;Name;PreviousValue;NewValue;ChangeReason\r\n';
    for (let index=0; index < this._codeCompanyValues.length; index++) {
      // construct line
      fileContent +=  (this._codeCompanyValues[index] ?? '') + this._delimiter
                    + (this._codeCustomerValues[index] ?? '') + this._delimiter
                    + (this._parameterNameValues[index] ?? '') + this._delimiter
                    + (this._previousValues[index] ?? '') + this._delimiter
                    + (this._newValues[index] ?? '') + this._delimiter
                    + (this._changeReasonValues[index]?? '');

      // add newline
      if (index !== this._codeCompanyValues.length -1) {
        fileContent += '\r\n';
      }
    }

    // write to file
    fs.writeFileSync(filePath,fileContent,{encoding:'utf8',flag:'w'});
  }

  private async _getAPIDetails() {
    this._urls = [];

    // retrieve urls
    this._urls[0] = await this._getUrlObject(this._settingsGlob + 'parameter_get.json','getparameters');
    this._urls[1] = await this._getUrlObject(this._settingsGlob + 'parameter_set.json','setparameters');
    this._urls[2] = await this._getUrlObject(this._settingsGlob + 'parameter_get_history.json','getparameterhistory');
    this._urls[3] = await this._getUrlObject(this._settingsGlob + 'parameter_get_parameter_codes.json','getparametercodes');

  }

  private async _getUrlObject(glob:string, type:string) : Promise<UrlObject> {
    let fileContent:string = await getFileContentFromGlob(glob);
    let details = JSON.parse(fileContent);
    return {type: type, acc: details.Parameters.Uri_ACC ?? '', prod: details.Parameters.Uri_PROD ?? ''};
  }

  private async _getEnvironmentOptions() {
    // get module dropdown options from txt file
    let fileContent: string = await getFileContentFromGlob(this._settingsGlob + 'EnvironmentOptions.txt');
    this._environmentOptions = fileContent.split("\n").map(el => el.trim());
  }


  private async _refresh() {
    await this._getAPIDetails();
    await this._getEnvironmentOptions();
    this._fieldValues[environmentIndex] = this._environmentOptions[0];
    await this._getCompanies();
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

    // clear parameter search values before rendering
    let psearchValues: string[][] = this._parameterSearchValues;
    this._parameterSearchValues = [];

    // reset updatelines flag
    let focusLine:number = this._focusLine;
    this._focusLine = -1;

    // construct panel html object and retrieve html
    let parameterHtmlObject: ParameterHtmlObject = new ParameterHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      this._fieldValues,
      this._codeCompanyValues,
      this._codeCustomerValues,
      this._parameterNameValues,
      psearchValues,
      this._previousValues,
      this._newValues,
      this._changeReasonValues,
      this._setResponseValues,
      this._currentValues,
      this._currentChangeReasonValues,
      this._currentTimestampValues,
      this._extendedHistoryValues,
      this._getResponseValues,
      this._previous,
      this._showAuth,
      this._processingSet,
      this._processingGet,
      this._environmentOptions,
      this._codeCompanies,
      focusLine
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