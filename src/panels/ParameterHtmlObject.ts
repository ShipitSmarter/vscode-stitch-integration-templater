import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString, removeQuotes, disabledString, backgroundColorString, escapeHtml, isEmpty, selectOptions} from "../utilities/functions";

// fixed fields indices
const parameterIndex = 0;
const codecompanyIndex = 1;
const handlingagentIndex = 2;
const environmentIndex = 3;
const filesIndex = 4;
const noflinesIndex = 5;
const saveIndex = 6;
const allChangeReasonsIndex = 7;
const userIndex = 8;
const pwIndex = 9;

// type defs
type ResponseObject = {
  status:number;
  value:string;
  message:string;
};

type CodeCompanyObject = {
  company: string;
  codecompany: string;
};

export class ParameterHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: ParameterHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],
    private _fieldValues: string[],
    private _codeCompanyValues: string[],
    private _codeCustomerValues: string[],
    private _parameterNameValues: string[],
    private _parameterSearchValues: string[][],
    private _previousValues: string[],
    private _newValues: string[],
    private _changeReasonValues: string[],
    private _setResponseValues: ResponseObject[],
    private _currentValues: string[],
    private _currentChangeReasonValues: string[],
    private _currentTimestampValues: string[],
    private _extendedHistoryValues: string[],
    private _getResponseValues: ResponseObject[],
    private _previous: boolean,
    private _showAuth: boolean,
    private _processingSet: boolean,
    private _processingGet: boolean,
    private _environmentOptions: string[],
    private _codeCompanies: CodeCompanyObject[],
    private _focusLine: number
  ) { }

  // METHODS
  public getHtml() {
    // define necessary extension Uris
    const toolkitUri    = this._uris[0];
    const codiconsUri   = this._uris[1];
    const mainUri       = this._uris[2];
    const styleUri      = this._uris[3];

    // define panel HTML
    let html =  /*html*/`
		<!DOCTYPE html>
		<html>
			<head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <script type="module" src="${mainUri}"></script>
				<link rel="stylesheet" href="${styleUri}"/> 
        <link rel="stylesheet" href="${codiconsUri}">
			</head>
			<body>

				<div class="row11" id="main">
          <section id="farleft">
					  <h1>Get/set parameters</h1>       
          </section>
          <section id="farright">

          </section>
				</div>

        <section id="hidden">
            ${this._codeCompanyFields()}
            <vscode-text-field id="focusline" value="${this._focusLine > 0 ? this._focusLine+'' : ''}" hidden></vscode-text-field>
        </section>

        ${this._getAuthenticationItems()}
        
        <section class="rowflex">
          <section class="rowsingle">
               ${this._getDetailsGrid()}
          </section>

          <section class="component-example">
            <div class="floatleftlesspadding">
              ${this._getButton('getparameters','Get Parameters','codicon-refresh','secondary')}
            </div>
            <div class="floatleftnopadding">
              <vscode-progress-ring id="processingget" ${hiddenString(this._processingGet)}></vscode-progress-ring>
            </div>
          </section>

          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">
                <h2>Parameter inputs</h2>
                ${this._parameterInputs()}
              </div>
            </section> 
          </section>

          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">
                <h2>Current values</h2>
                ${this._getCurrentValues()}
              </div>
            </section> 
          </section>

        </section>
			</body>
		</html>
	  `;

    return html;
  }

  private _getButton(id:string, title:string, codicon:string = '',appearance:string = 'primary',hidden:string = ''): string {
    let codiconString: string = isEmpty(codicon) ? '' : `<span slot="start" class="codicon ${codicon}"></span>`;
    let button: string = /*html*/ `
      <vscode-button id="${id}" appearance="${appearance}" ${hidden}>
        ${title}
        ${codiconString}
      </vscode-button>
      `;
    return button;
  }

  private _codeCompanyFields(): string {
    let html: string = '';

    for (let index = 0; index < this._codeCompanies.length; index++) {
      let cc: CodeCompanyObject = this._codeCompanies[index];
      html += /*html*/ `
        <vscode-text-field id="${cc.codecompany}" class="codecompanylookupfield" value="${cc.company}" hidden></vscode-text-field>
      `;
    }

    return html;
  }

  private _getAuthenticationItems(): string {

    let userField: string = /*html*/ `<vscode-text-field id="user" class="field" index="${userIndex}" ${valueString(this._fieldValues[userIndex])}></vscode-text-field>`;
    let pwField: string = /*html*/ `<vscode-text-field id="pw" class="field" index="${pwIndex}" ${valueString(this._fieldValues[pwIndex])}></vscode-text-field>`;

    let html: string = /*html*/ `

    <section class="rowsingle">
      <vscode-divider role="separator"></vscode-divider>

      <section class="component-example">
        <vscode-checkbox id="showauth" class="showauth" ${checkedString(this._showAuth)}>Authentication</vscode-checkbox>
      </section>

      <section id="authsection" class="component-example" ${hiddenString(this._showAuth)}>
        <div class="floatleftnopadding">
          User:
        </div>
        <div class="floatleft">
          ${userField}
        </div>
        <div class="floatleftnopadding">
          Password:
        </div>
        <div class="floatleft">
          ${pwField}
        </div>
        <div class="floatleft">
          ${this._getButton('checkauth','Check','','secondary')}
        </div>
        <div class="floatleft">
          ${this._getButton('saveauth','Save','codicon-arrow-right','secondary')}
        </div>
      </section>

      <vscode-divider role="separator"></vscode-divider>
    </section>
    
    `;

    return html;
  }

  private _getDetailsGrid(): string {

    let getParametersGrid = /*html*/ `
      <section class="component-example">
        <div class="floatleftnopadding">
          Environment:
        </div>
        <div class="floatleft">
          <vscode-dropdown id="environment" class="dropdown" index="${environmentIndex}" ${backgroundColorString(this._fieldValues[environmentIndex] === 'PROD' ? 'red' : '')} ${valueString(this._fieldValues[environmentIndex])} position="below">
              ${dropdownOptions(this._environmentOptions)}
          </vscode-dropdown>
        </div>
        <div class="floatleftnopadding">
          nofLines:
        </div>
        <div class="floatleft">
          <vscode-dropdown id="noflines" class="dropdown" index="${noflinesIndex}" ${valueString(this._fieldValues[noflinesIndex])} position="below">
            ${dropdownOptions(arrayFrom1(100))}
          </vscode-dropdown>
        </div>
        <div class="floatleft">
          <vscode-checkbox id="previous" class="previous" ${disabledString(this._previousValues.length > 0)} ${checkedString(this._previous)}>Revert to Previous</vscode-checkbox>
        </div>
        <div class="floatleftlesspadding">
          ${this._getButton('setparameters','Set Parameters','codicon-arrow-right')}
        </div>
        <div class="floatleftnopadding">
          <vscode-progress-ring id="processingset" ${hiddenString(this._processingSet)}></vscode-progress-ring>
        </div>
        
      </section>

      <section class="component-example">
        <div class="floatleftnopadding" title="Must contain a valid directory or file path">
          Save file to:
        </div>
        <div class="floatleft">
          <vscode-text-field id="save" class="field" index="${saveIndex}" ${valueString(this._fieldValues[saveIndex])}></vscode-text-field>
        </div>
        <div class="floatleft">
          ${this._getButton('savetofile','Save input','codicon-arrow-right','secondary')}
        </div>

        <div class="floatleftmuchpadding">
          Set all change reasons:
        </div>
        <div class="floatleftnopadding">
          <vscode-text-field id="allchangereasons" class="field" index="${allChangeReasonsIndex}" ${valueString(this._fieldValues[allChangeReasonsIndex])}></vscode-text-field>
        </div>
      </section>
      `;

    return getParametersGrid;
  }

  private _getFileLoadOptions() : string[] {
    //this._pmcObjects.map(el => el.path);
    var options: string[] = [];

    // for (let index = 0; index < this._pmcObjects.length; index++) {
    //   let pmc = this._pmcObjects[index];
    //   options[index] = pmc.parent + ' > ' + pmc.file;
    // }

    // return options.sort();
    return ['file1.csv','file2.csv','file3.csv'];
  }

  private _getBackgroundColorString(input:string) : string {
    // if input is 'OK': green
    // else if input is '': ''
    // else: red
    return input === 'OK' ? backgroundColorString('darkgreen') : (isEmpty(input) ? '' : backgroundColorString('maroon'));
  }

  private _getOptionText(status:number, message:string) : string {
    // if message 'OK' : 'OK'
    // else if status 0: ''
    // else : '[status] : [message]'
    return message === 'OK' ? message : ( status === 0 ? '' : (status.toString() + ' : ' + message));
  }

  private _getCurrentValues(): string {
    let currentValues: string = ``;
    let currentChangeReasons: string = '';
    let currentTimestamps: string = '';
    let getResponseValues: string = '';

    for (let index = 0; index < +this._fieldValues[noflinesIndex]; index++) {

      currentValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="currentvalue${index}" class="currentvaluefield" value="${escapeHtml(this._currentValues[index] ?? '')}" readonly></vscode-text-field>
        </section>
      `;

      currentChangeReasons += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="currentchangereason${index}" class="currentchangereasonfield" value="${this._currentChangeReasonValues[index] ?? ''}" readonly></vscode-text-field>
        </section>
      `;

      currentTimestamps += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="currenttimestamp${index}" class="currenttimestampfield" value="${this._currentTimestampValues[index] ?? ''}" title="${this._extendedHistoryValues[index] ?? ''}" readonly></vscode-text-field>
        </section>
      `;

      // api response    
      let bColorString:string =  this._getBackgroundColorString(this._getResponseValues[index]?.message ?? '');
      let optionText = this._getOptionText(this._getResponseValues[index]?.status ?? 0, this._getResponseValues[index]?.message ?? '');
      
      getResponseValues += /*html*/`
        <section class="component-option-fixed">
          <div id="getresponse${index}" class="getresponsefield" index="${index}">
            <vscode-option ${bColorString}>${optionText}</vscode-option>
          </div>
        </section>
      `;
    }

    let html: string = /*html*/ `
      <section class="component-example">
        <section class="floatleftnopadding">
          <p>Current value</p>
          ${currentValues}
        </section>

        <section class="floatleftnopadding">
          <p>Change reason</p>
          ${currentChangeReasons}
        </section>

        <section class="floatleftnopadding">
          <p>Timestamp</p>
          ${currentTimestamps}
        </section>

        <section class="floatleft">
          <p>Get Response</p>
          ${getResponseValues}
        </section>
      </section>`;

    return html;

    return html;
  }

  private _parameterInputs(): string {
    let nofRows = +this._fieldValues[noflinesIndex];
    let codeCompanys: string = '';
    let codeCustomers: string = '';
    let parameterNames: string = '';
    let previousValues: string = '';
    let newValues: string = '';
    let changeReasonValues: string = '';
    let setResponseValues: string = '';
    for (let row = 0; row < nofRows; row++) {

      // code company
      codeCompanys += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="codecompany${row}" class="codecompanyfield" index="${row}" tabindex="${row +1}0" ${valueString(this._codeCompanyValues[row])} placeholder="CodeCompany"></vscode-text-field>
        </section>
      `;

      // code customer
      codeCustomers += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="codecustomer${row}" class="codecustomerfield" index="${row}" tabindex="${row +1}1" ${valueString(this._codeCustomerValues[row])} placeholder="CodeCustomer"></vscode-text-field>
        </section>
      `;

      var showSearch: boolean = this._parameterSearchValues[row] !== undefined;

      var select: string = /*html*/ `
        <select id="parameteroptions${row}" class="parameteroptionsfield" index="${row}" tabindex="${row +1}2" position="below" ${hiddenString(showSearch)}>
          ${selectOptions(this._parameterSearchValues[row] ?? [''])}
        </select>`;

      parameterNames += /*html*/`
        <section class="component-pname">
          <div class="floatpname">
            <vscode-text-field id="parametername${row}" class="parameternamefield" index="${row}" tabindex="${row +1}3" ${valueString(this._parameterNameValues[row])} placeholder="parameter name" ${hiddenString(!showSearch)}></vscode-text-field>
            ${select}
          </div>
          
        </section>
      `;

      // previous parameter value
      previousValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="previousvalue${row}" class="previousvaluefield" index="${row}" tabindex="-1" ${valueString(escapeHtml(this._previousValues[row]??''))} readonly></vscode-text-field>
        </section>
      `;

      // new parameter value
      newValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="newvalue${row}" class="newvaluefield" index="${row}" tabindex="${row +1}5" ${valueString(escapeHtml(this._newValues[row]??''))} placeholder="new parameter value"></vscode-text-field>
        </section>
      `;

      // change reason
      changeReasonValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="changereason${row}" class="changereasonfield" index="${row}" tabindex="${row +1}6" ${valueString(escapeHtml(this._changeReasonValues[row]??''))} placeholder="change reason"></vscode-text-field>
        </section>
      `;

      // api response
      let bColorString:string =  this._getBackgroundColorString(this._setResponseValues[row]?.message ?? '');
      let optionText = this._getOptionText(this._setResponseValues[row]?.status ?? 0, this._setResponseValues[row]?.value ?? '');
      setResponseValues += /*html*/`
        <section class="component-option-fixed">
          <div id="setresponse${row}" class="setresponsefield" index="${row}">
            <vscode-option ${bColorString} title="${this._setResponseValues[row]?.message ?? ''}">${optionText}</vscode-option>
          </div>
        </section>
      `;

    }

    let html: string = /*html*/ `
      <section class="component-example">
        <section class="floatleftnopadding">
          <p>CodeCompany</p>
          ${codeCompanys}
        </section>
        <section class="floatleftnopadding">
          <p>CodeCustomer</p>
          ${codeCustomers}
        </section>
        <section class="floatleftnopadding">
          <p title="Enter to search, Ctrl + Enter to confirm">Parameter Name</p>
          ${parameterNames}
        </section>
        <section class="floatleftnopadding">
          <p>Previous Value</p>
          ${previousValues}
        </section>
        <section class="floatleftnopadding">
          <p>New Value</p>
          ${newValues}
        </section>
        <section class="floatleftnopadding">
          <p>Change Reason</p>
          ${changeReasonValues}
        </section>
        <section class="floatleft">
          <p>Set Response</p>
          ${setResponseValues}
        </section>
      </section>`;

    return html;
  }

}