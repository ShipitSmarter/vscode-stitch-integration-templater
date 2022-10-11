import * as vscode from "vscode";
import { getUri, getWorkspaceFile, removeQuotes, toBoolean, isEmpty, cleanPath, parentPath, getFileContentFromGlob, getDateTimeStamp, nameFromPath, isDirectory, getWorkspaceFiles, getAuth, checkAuth, saveAuth, getUserPwdFromAuth } from "../utilities/functions";
import { ParameterHtmlObject } from "./ParameterHtmlObject";
import * as fs from "fs";
import axios from 'axios';
import * as csvParse from "csv-parse/sync";
import * as csvStringify from "csv-stringify/sync";
import { getHeapStatistics } from "v8";

// fixed fields indices
const parameterIndex = 0;
const codecompanyIndex = 1;
const handlingagentIndex = 2;
const environmentIndex = 3;
const filesIndex = 4;
const noflinesIndex = 5;
const saveIndex = 6;
const allChangeReasonsIndex = 7;
const saveNameIndex = 8;

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
  statusText:string;
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
  private _codeCustomerSearchValues: string[][] = [];
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
  private _trim: boolean = vscode.workspace.getConfiguration().get<boolean>('stitch.parametersDefaultAutoTrim') ?? true;
  private _showAuth: boolean = false;
  private _processingSet: boolean = false;
  private _processingGet: boolean = false;
  private _delimiter: string = ';';
  private _urls: UrlObject[] = [];
  private _environmentOptions: string[] = [];
  private _codeCompanies: CodeCompanyObject[] = [];
  private _configGlob: string = "**/templater/parameters/";
  private _settingsGlob: string = "**/.vscode/settings.json";
  private _readmeSetting: string = "stitch.parameters.readmeLocation";
  private _settings: any;
  private _focusField: string = '';
  private _newParameterCodes: string[] = [];
  private _newParameterDescriptionValues: string[] = [];
  private _newParameterExplanationValues: string[] = [];
  private _selectedNewParameterCodes: string[] = [];

  private _emptyResponse: ResponseObject = {
    status: 0,
    statusText: "",
    value: "",
    message: ""
  };

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
          
          case 'checkparametercodes':
            this._checkParameterCodes().then( (paramsExist) => {
              // if no missing parameter codes: show info message
              if (paramsExist) {
                vscode.window.showInformationMessage('All listed parameters exist');
              }
              this._updateWebview(extensionUri);
            });
            break;

          case 'createparametercodes':
            this._createParameterCodes().then(() => {
              this._checkParameterCodes().then(() => {
                this._updateWebview(extensionUri);
              });
            });
            break;
          case 'codecustomersearch':
            if (checkAuth()){
              this._focusField = 'codecustomeroptions' + text;
              this._codeCustomerSearch(+text).then( () => {
                if (this._codeCustomerSearchValues[+text].length === 0 ) {
                  this._focusField = 'codecustomer' + text;
                }
                this._updateWebview(extensionUri);
              });
            }
            break;

          case 'parametersearch':
            if (checkAuth()){
              this._focusField = 'parameteroptions' + text;
              this._parameterSearchButton(+text).then( () => {
                this._updateWebview(extensionUri);
              });
            }
            break;
          case 'getparameters':
            if (checkAuth()){
              // clear previous responses and update webview
              this._clearResponses(true);
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
            if (this._checkSaveFolder() && checkAuth())  {
              this._checkParameterCodes().then((paramsExist) => {
                if (paramsExist) {
                  this._setParametersButton(extensionUri).then(() => {
                    // confirm
                    vscode.window.showInformationMessage('Parameters set');
                    // update panel
                    this._updateWebview(extensionUri);
                  });
                } else {
                  vscode.window.showErrorMessage('Some parameter codes must first be created');
                  this._updateWebview(extensionUri);
                }
              });
              
            } else {
              this._updateWebview(extensionUri);
            }
            break;

          case 'savetofile':
            if (this._checkSaveFolder())  {
              // save to file
              let fileNameProposed:string = 'Saved_' + this._codeCompanyValues[0]+'_'+ this._fieldValues[environmentIndex] +'_' + getDateTimeStamp() + '.csv';
              //let isDir:boolean = isDirectory(this._fieldValues[saveIndex]);
              //let filePath: string = this._fieldValues[saveIndex] + (isDir ? ('/' + fileNameProposed) : '');
              let fileName = isEmpty(this._fieldValues[saveNameIndex]) ? fileNameProposed : this._fieldValues[saveNameIndex];
              let filePath: string = this._fieldValues[saveIndex] + '/' + fileName;
              
              this._writeFile(filePath);
              // confirm
              vscode.window.showInformationMessage('Input saved to ' + nameFromPath(filePath));
            }
            
            break;

          case 'infoclick':
            this._openInfoFile();
            break;

          case 'deloptions':
            let row:number = +text;
            this._parameterSearchValues[row] = [];
            break;

          case 'delcodecustomeroptions':
            let line:number = +text;
            this._codeCustomerSearchValues[line] = [];
            break;

          case 'deleteline':
            this._deleteLine(+text);
            this._updateWebview(extensionUri);
            break;

          case 'clearvalue':
            var classIndex = text.split('|');
            var clas = classIndex[0];
            var index = +classIndex[1];

            switch(clas) {
              case 'getresponse':
                this._getResponseValues[index] = this._emptyResponse;
                break;
              case 'setresponse':
                this._setResponseValues[index] = this._emptyResponse;
                break;
              case 'previousvalue':
                this._previousValues[index] = "";
                break;
              case 'currentvalues':
                this._currentValues[index] = "";
                this._currentChangeReasonValues[index] = "";
                this._currentTimestampValues[index] = "";
                break;
            }
            break;

          case "savevalue":
            var classIndexValue = text.split('|');
            var clas = classIndexValue[0];
            var index = +classIndexValue[1];
            // value: everything after the second pipe '|'
            var valueRegExp: RegExp = new RegExp(`^${classIndexValue[0]}\\\|${classIndexValue[1]}\\\|`);
            var value = text.replace(valueRegExp,'');
            
            // do some updating and refreshing
            switch(clas) {
              case 'dropdown':
              case 'field':
                let oldLines:number = +this._fieldValues[noflinesIndex];
                this._fieldValues[index] = value;
                switch (index) {
                  case noflinesIndex:
                    let nofLines:number = +this._fieldValues[noflinesIndex];

                    // crop line arrays
                    this._cropLines(nofLines);

                    // update company, customer, change reason fields
                    this._codeCompanyValues = this._fillWithLastUnempty(this._codeCompanyValues,nofLines-1);
                    this._codeCustomerValues = this._fillWithLastUnempty(this._codeCustomerValues,nofLines-1);
                    this._changeReasonValues = this._fillWithLastUnempty(this._changeReasonValues,nofLines-1,this._fieldValues[allChangeReasonsIndex]);

                    // apply focus
                    if (nofLines > oldLines) {
                      this._focusLineField(oldLines);
                    }

                    // update webview
                    this._updateWebview(extensionUri);
                    break;

                }
                break;
              case 'newparameterdescription':
                this._newParameterDescriptionValues[index] = value;
                break;
              case 'newparameterexplanation':
                this._newParameterExplanationValues[index] = value;
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
                this._newValues[index] = this._trim ? value.trim() : value;
                break;
              case 'changereasonfield':
                this._changeReasonValues[index] = value;
                break;
              case 'trim':
                this._trim = toBoolean(value);
                break;
              case 'previous':
                this._previous = toBoolean(value);
                break;
              case 'showauth':
                this._showAuth = toBoolean(value);
                break;
              case 'createnewparametercheckbox':
                let pcode = this._newParameterCodes[index];
                if (toBoolean(value)) {
                  this._selectedNewParameterCodes.push(pcode);
                } else {
                  this._selectedNewParameterCodes = this._selectedNewParameterCodes.filter(el => el !== pcode);
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

  private _focusLineField(index:number) {
    if (isEmpty(this._codeCompanyValues[index])) {
      this._focusField = 'codecompany' + index;
    } else if (isEmpty(this._codeCustomerValues[index])) {
      this._focusField = 'codecustomer' + index;
    } else {
      this._focusField = 'parametername' + index;
    }
  }

  private async _openInfoFile() {
    let readmeLocation:string = this._settings[this._readmeSetting];

    if (isEmpty(readmeLocation)) {
      // settting missing
      vscode.window.showErrorMessage("Missing repo setting " + this._readmeSetting);

    } else if (readmeLocation.startsWith('**')) {
      // location is a glob 
      const filePath:string = await getWorkspaceFile(this._settings[this._readmeSetting]);
      if (!isEmpty(filePath)) {
        const openPath = vscode.Uri.file(filePath);
        // const doc = await vscode.workspace.openTextDocument(openPath);
        // vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
        await vscode.commands.executeCommand("markdown.showPreview", openPath);
      }
    } else {
      // location is a URL: try tab in VSCode, else open in browser
      try {
        await vscode.commands.executeCommand("simpleBrowser.show",readmeLocation);
      } catch (err) {
        await vscode.env.openExternal(vscode.Uri.parse(readmeLocation));
      }
    }
    
  }

  private _deleteLine(index:number) {
    this._codeCompanyValues.splice(index,1);
    this._codeCustomerValues.splice(index,1);
    this._parameterNameValues.splice(index,1);
    this._parameterSearchValues.splice(index,1);
    this._previousValues.splice(index,1);
    this._newValues.splice(index,1);
    this._changeReasonValues.splice(index,1);
    this._setResponseValues.splice(index,1);
    this._currentValues.splice(index,1);
    this._currentChangeReasonValues.splice(index,1);
    this._currentTimestampValues.splice(index,1);
    this._getResponseValues.splice(index,1);

    this._fieldValues[noflinesIndex] = (parseInt(this._fieldValues[noflinesIndex]) -1).toString();

    this._focusLineField(Math.min(index, this._codeCompanyValues.length -1));
  }

  private _loadFileIfPresent(extensionUri:vscode.Uri, loadFile:string) {
    if (!isEmpty(loadFile)) {
      this._fieldValues[filesIndex] = loadFile;
      this._getPath();
      this._loadFile(loadFile);

      // clear previous responses and update webview
      this._clearResponses();
      this._updateWebview(extensionUri);
    }
  }

  private _clearResponses(excludeSetResponses:boolean = false) {
    this._currentValues= [];
    this._currentChangeReasonValues = [];
    this._currentTimestampValues = [];
    this._extendedHistoryValues = [];
    this._getResponseValues = [];

    if (!excludeSetResponses) {
      this._setResponseValues = [];
    }
  }

  private _checkSaveFolder(): boolean {
    let isValid: boolean = (fs.existsSync(this._fieldValues[saveIndex]));
    if (!isValid) {
      vscode.window.showErrorMessage('Save folder is not an existing directory');
    }

    return isValid;
  }

  private _getPath(): boolean {
    let updatePath:boolean = false;
    if (fs.existsSync(this._fieldValues[filesIndex])) {
      // let path: string = parentPath(cleanPath(this._fieldValues[filesIndex]));
      // this._fieldValues[saveIndex] = path;
      this._fieldValues[saveIndex] = parentPath(cleanPath(this._fieldValues[filesIndex]));
      this._fieldValues[saveNameIndex] = nameFromPath(cleanPath(this._fieldValues[filesIndex]));

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

  private _getUrl(type:string, environment:string = this._environment()) : string {
    const urls: UrlObject = this._urls.filter(el => el.type === type)[0];

    let url: string = '';
    switch (environment) {
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
      let parameterCodesResponse: ResponseObject = await this._getApiCall(urlGetParameterCodes,getAuth(),this._codeCompanyValues[index]);
  
      if (parameterCodesResponse.status === 200) {
        let responseJson = JSON.parse(parameterCodesResponse.value);
  
        let dropdownOptions: string[] = [];
        dropdownOptions[0] = this._parameterNameValues[index];
        for (let row = 0; row < Math.min(15,responseJson.length ?? 15); row++) {
          dropdownOptions[row+1] = responseJson[row].key + ' (' + responseJson[row].value + ')';
        }
  
        this._parameterSearchValues[index] = dropdownOptions;
      }
    }
  }

  private async _codeCustomerSearch(index:number) {
    if (!isEmpty(this._codeCustomerValues[index]) && !isEmpty(this._codeCompanyValues[index])) { 

      let urlGetCodeCustomers: string = `${this._getUrl('getcodecustomers')}&filter=${this._codeCustomerValues[index] ?? ''}`;
      let codeCustomersResponse: ResponseObject = await this._getApiCall(urlGetCodeCustomers,getAuth(),this._codeCompanyValues[index]);
  
      if (codeCustomersResponse.status === 200) {
        let responseJson = JSON.parse(codeCustomersResponse.value);
  
        let dropdownOptions: string[] = [];
        dropdownOptions[0] = this._codeCustomerValues[index];
        for (let row = 0; row < Math.min(15,responseJson.length ?? 15); row++) {
          dropdownOptions[row+1] = responseJson[row].agentLabel;
        }
  
        this._codeCustomerSearchValues[index] = dropdownOptions;
      }
    }
  }

  private async _checkParameterCodes() : Promise<boolean> {

    // clear any previously found 'new' parameter codes
    this._newParameterCodes = [];
    this._newParameterDescriptionValues = [];
    this._newParameterExplanationValues = [];
    this._selectedNewParameterCodes = [];

    // get url
    const userPwd:string[] = getUserPwdFromAuth(getAuth());
    const user = userPwd[0];
    const pwd = userPwd[1];
    const url:string = this._getUrl('code_param_get');
    const fullUrl = `${url}?userid=${user}&password=${pwd}`;

    for (let index = 0; index < this._parameterNameValues.length; index++) {
      let pcode: string = this._parameterNameValues[index];

      let response: ResponseObject = await this._getApiCall(`${fullUrl}&code_param=${pcode}`,'','');

      if (!this._newParameterCodes.includes(pcode) && isEmpty(response.value)) {
        this._newParameterCodes.push(pcode);
        this._selectedNewParameterCodes.push(pcode);
      }
    }

    // if newParameterCodes is not empty and environment is PROD: check ACC to propose code descriptions/explanations
    if (this._newParameterCodes.length !== 0 && this._fieldValues[environmentIndex] === 'PROD') {
      for (let index = 0; index < this._newParameterCodes.length; index++) {
        let pcode = this._newParameterCodes[index];
        let accUrl = `${this._getUrl('code_param_get','ACC')}?userid=${user}&password=${pwd}&code_param=${pcode}`;
        let response: ResponseObject = await this._getApiCall(accUrl,'','');

        if (response.value !== '') {
          try {
            let rContent = JSON.parse(response.value);
            this._newParameterDescriptionValues[index] = rContent?.Description ?? '';
            this._newParameterExplanationValues[index] = rContent?.Explanation ?? '';
            let henk = '';
          } catch (err) {
            // on error: do nothing
          }
        }
        

      }
    }

    return this._newParameterCodes.length === 0;
  }

  private async _createParameterCodes() {
    // get url
    const userPwd:string[] = getUserPwdFromAuth(getAuth());
    const user = userPwd[0];
    const pwd = userPwd[1];
    const url:string = this._getUrl('code_param_create');
    const fullUrl = `${url}?userid=${user}&password=${pwd}`;

    // apply create
    var responses:ResponseObject[] = [];
    for (let index=0; index<this._newParameterCodes.length; index++) {
      var pcode = this._newParameterCodes[index];
      if (this._selectedNewParameterCodes.includes(pcode)) {
        responses.push(await this._createParameterCode(fullUrl,pcode,this._newParameterDescriptionValues[index] ?? '',this._newParameterExplanationValues[index] ?? ''));
      }
    }

    vscode.window.showInformationMessage(`Created parameters: ${this._selectedNewParameterCodes.sort().join(', ')}`);
  }
  
  private async _createParameterCode(url:string,codeParam:string, description:string,explanation:string="") : Promise<ResponseObject> {
    let result: ResponseObject;
    try {
      const response = await axios({
        method: "POST",
        data: {
          CodeParam: codeParam,
          Description: description,
          Explanation: explanation
      },
        url: url,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      result = {
        status: response.status,
        statusText: response.statusText,
        value: '',
        message: ''
      };

    } catch (err:any) {
      result = {
        status: err.response.status,
        statusText: err.response.statusText,
        value: '',
        message: this._getMessageFromError(err)
      };
    }

    return result;
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
    this._clearResponses();
    this._processingSet = true;
    this._updateWebview(extensionUri);

    // set param values
    // const updatePer: number = 3;
    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      this._setResponseValues[index] = await this._setParameter(url,getAuth(),this._parameterNameValues[index],this._codeCompanyValues[index],this._codeCustomerValues[index],setValues[index], this._changeReasonValues[index]);
      
      // if param does not exist: add to new parameter codes array
      if (this._setResponseValues[index].status === 500) {
        let pcode:string = this._parameterNameValues[index];
      }
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
        statusText: response.statusText,
        value: '',
        message: ''
      };

    } catch (err:any) {
      result = {
        status: err.response.status,
        statusText: err.response.statusText,
        value: '',
        message: this._getMessageFromError(err)
      };
    }

    return result;
  };

  private _getMessageFromError(err:any) : string {
    let message: string;
    if (err?.response?.data.hasOwnProperty('errors')) {
      message = err.response.data.errors[0]?.message;
    } else if (err?.response?.data?.hasOwnProperty('Message')) {
      message = err.response.data.Message;
    } else if (err.hasOwnProperty('message')) {
      message = err.message;
    } else {
      message = '';
    }

    return message;
  }

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
      let parameterResponse: ResponseObject = await this._getApiCall(urlGetParameter,getAuth(),this._codeCompanyValues[index]);

      // step 2: if not exists: '', else execute history call
      if (parameterResponse.status >= 200 && parameterResponse.status <= 299 ) {
        let historyResponse: ResponseObject = await this._getApiCall(urlGetHistory,getAuth(),this._codeCompanyValues[index]);
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
        statusText: response.statusText,
        value: value,
        message: ''
      };

    } catch (err:any) {

      result = {
        status: err.response.status,
        statusText: err.response.statusText,
        value: '',
        message: this._getMessageFromError(err)
      };
    }

    return result;
  };

  private async _getCompanies() {
    // get companies and codecompanies from translation file
    let translationPath = await getWorkspaceFile(this._configGlob + 'CompanyToCodeCompany.csv');
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

  private _loadFile(filePath:string) {

    // load file
    // fix for BOM from: https://github.com/nodejs/node-v0.x-archive/issues/1918#issuecomment-2480359
    const fileContent = fs.readFileSync(filePath, {encoding:'utf8'}).replace(/^\uFEFF/, '');

    // parse
    const content = csvParse.parse( fileContent, {
      columns: true,
      skip_empty_lines: true,
      skip_records_with_empty_values: true,
      delimiter: this._delimiter,
      relax_quotes: true
    });

    // update line arrays
    this._fieldValues[noflinesIndex] = content.length + '';
    this._cropLines(content.length);

    // convert to object arrays
    for (let index=0; index < content.length; index++) {
      // fill parameters
      this._codeCompanyValues[index]    = content[index].CodeCompany;
      this._codeCustomerValues[index]   = content[index].CodeCustomer;
      this._parameterNameValues[index]  = content[index].Name;
      this._previousValues[index]       = content[index].PreviousValue;
      this._newValues[index]            = content[index].NewValue;
      this._changeReasonValues[index]   = content[index].ChangeReason;
    }

    // clear responses, parameter options
    this._clearResponses();
    this._parameterSearchValues = [];

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
    // construct file content array
    let fileContentArray: string[][] = [['CodeCompany','CodeCustomer','Name','PreviousValue','NewValue','ChangeReason']];
    for (let index=0; index < this._codeCompanyValues.length; index++) {
      // add each line
      fileContentArray[index +1] = [
        this._codeCompanyValues[index] ?? '',
        this._codeCustomerValues[index] ?? '',
        this._parameterNameValues[index] ?? '',
        this._previousValues[index] ?? '',
        this._newValues[index] ?? '',
        this._changeReasonValues[index]?? ''
      ];
    }

    // stringify
    const output = csvStringify.stringify(fileContentArray,
      {
        delimiter: this._delimiter
      }
    );

    // write to file
    fs.writeFileSync(filePath,output,{encoding:'utf8',flag:'w'});
  }

  private async _getAPIDetails() {
    this._urls = [];

    // retrieve urls
    this._urls[0] = await this._getUrlObject(this._configGlob + 'parameter_get.json','getparameters');
    this._urls[1] = await this._getUrlObject(this._configGlob + 'parameter_set.json','setparameters');
    this._urls[2] = await this._getUrlObject(this._configGlob + 'parameter_get_history.json','getparameterhistory');
    this._urls[3] = await this._getUrlObject(this._configGlob + 'parameter_get_parameter_codes.json','getparametercodes');
    this._urls[4] = await this._getUrlObject(this._configGlob + 'parameter_get_codecustomers.json','getcodecustomers');
    this._urls[5] = await this._getUrlObject(this._configGlob + 'code_param_get.json','code_param_get');
    this._urls[6] = await this._getUrlObject(this._configGlob + 'code_param_create.json','code_param_create');

  }

  private async _getUrlObject(glob:string, type:string) : Promise<UrlObject> {
    let fileContent:string = await getFileContentFromGlob(glob);
    let details = JSON.parse(fileContent);
    return {type: type, acc: details.Parameters.Uri_ACC ?? '', prod: details.Parameters.Uri_PROD ?? ''};
  }

  private async _getEnvironmentOptions() {
    // get module dropdown options from txt file
    let fileContent: string = await getFileContentFromGlob(this._configGlob + 'EnvironmentOptions.txt');
    this._environmentOptions = fileContent.split("\n").map(el => el.trim());
  }

  private async _getRepoSettings() {
    let settingsContent = await getFileContentFromGlob(this._settingsGlob);
    this._settings = JSON.parse(settingsContent);
  }

  private async _refresh() {
    await this._getRepoSettings();
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

    // reset focus field flag
    let focusField: string = this._focusField;
    this._focusField = '';

    // construct panel html object and retrieve html
    let parameterHtmlObject: ParameterHtmlObject = new ParameterHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      this._fieldValues,
      this._codeCompanyValues,
      this._codeCustomerValues,
      this._parameterNameValues,
      this._parameterSearchValues,
      this._codeCustomerSearchValues,
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
      this._trim,
      this._showAuth,
      this._processingSet,
      this._processingGet,
      this._environmentOptions,
      this._codeCompanies,
      focusField,
      this._newParameterCodes,
      this._newParameterDescriptionValues,
      this._newParameterExplanationValues,
      this._selectedNewParameterCodes
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