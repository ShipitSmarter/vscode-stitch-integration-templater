import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString, removeQuotes, disabledString, backgroundColorString, escapeHtml, isEmpty, selectOptions, nameFromPath, getButton} from "../utilities/functions";

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
const parameterNameWidthIndex = 9;
const newValueWidthIndex = 10;

// type defs
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
    private _codeCustomerSearchValues: string[][],
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
    private _trim: boolean,
    private _showAuth: boolean,
    private _processingSet: boolean,
    private _processingGet: boolean,
    private _environmentOptions: string[],
    private _codeCompanies: CodeCompanyObject[],
    private _focusField: string,
    private _newParameterCodes: string[],
    private _newParameterDescriptionValues: string[],
    private _newParameterExplanationValues: string[],
    private _selectedNewParameterCodes: string[]
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
            <vscode-option id="info" title="Click to view documentation">info</vscode-option>    
          </section>
          <section id="farright">

          </section>
				</div>

        <section id="hidden">
            ${this._codeCompanyFields()}
            <vscode-text-field id="focusfield" ${valueString(this._focusField)} hidden></vscode-text-field>
            <vscode-text-field id="missingparametercodes" ${valueString(this._newParameterCodes.join('|'))} hidden></vscode-text-field>
              <vscode-dropdown id="noflines" class="dropdown" index="${noflinesIndex}" ${valueString(this._fieldValues[noflinesIndex])} position="below" hidden>
                ${dropdownOptions(arrayFrom1(100))}
              </vscode-dropdown>
        </section>

        ${this._getSaveItems()}

        ${this._getCreateParameterCodes()}
        
        <section class="rowflex">
          <section class="rowsingle">
               ${this._getDetailsGrid()}
          </section>

          <section class="grid1flex">
            <div>-</div>
            <div class="component-nomargin">
              ${getButton('getparameters','Get Parameters','codicon-refresh','secondary')}
              <div class="component-nomargin">
                <vscode-progress-ring id="processingget" ${hiddenString(this._processingGet)}></vscode-progress-ring>
              </div>
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

  private _getSaveItems(): string {
    let html: string = /*html*/ `
      <section class="rowsingle">
        <vscode-divider role="separator"></vscode-divider>

        <section class="component-example">
          <div class="floatleftnopadding">
            <p title="Must contain an existing directory">Save folder</p>
            <vscode-text-field id="save" class="field" index="${saveIndex}" ${valueString(this._fieldValues[saveIndex])}></vscode-text-field>
          </div>

          <div class="floatleftlesspadding">
            <p title="If no file is given, system will generate file name">Save file</p>
            <vscode-text-field id="savename" class="field" index="${saveNameIndex}" ${valueString(this._fieldValues[saveNameIndex])}></vscode-text-field>
          </div>

          <div class="floatleft">
            <p> - </p>
            ${getButton('savetofile','Save input','codicon-arrow-right','secondary')}
          </div>
        </section>

        <vscode-divider role="separator"></vscode-divider>
      <section class="rowsingle">`;

      return html;
  }

  private _getCreateParameterCodes(): string {

    // list of parameter code buttons
    let newParamGrid: string = '';
    for (let index = 0; index < this._newParameterCodes.length; index++) {
      let newParamCode:string = this._newParameterCodes[index];
      newParamGrid += /*html*/ `
        <section class="component-nomargin">
          <vscode-checkbox id="createnewparameter${index}" class="createnewparametercheckbox" index="${index}" ${checkedString(this._selectedNewParameterCodes.includes(newParamCode))}></vscode-checkbox>
        </section>
        <section class="component-nomargin">
          <vscode-text-field id="newparametercode${index}" class="newparametercode" index="${index}" value="${newParamCode}" title="${newParamCode}" readonly></vscode-text-field>
        </section>
        <section class="component-nomargin">
          <vscode-text-field id="newparameterdescription${index}" class="newparameterdescription" index="${index}" value="${escapeHtml(this._newParameterDescriptionValues[index] ?? '')}"></vscode-text-field>
        </section>
        <section class="component-nomargin">
          <vscode-text-field id="newparameterexplanation${index}" class="newparameterexplanation" index="${index}" value="${escapeHtml(this._newParameterExplanationValues[index] ?? '')}"></vscode-text-field>
        </section>
        `;
    }

    let newParamSection:string = this._newParameterCodes.length === 0 ? '' : /*html*/ `
      <section class="flexwrapper">
        <section class="grid4flex">
          <div>-</div>
          <div>Param code</div>
          <div>Description</div>
          <div>Explanation</div>
          ${newParamGrid}
        </section>
      </section>

      <section class="component-topmargin">
          ${getButton('createnewparametercodes','Create','codicon-add','primary')}
      </section>
    `;

    let html: string = /*html*/ `
      <section class="rowsingle">
        <h3 title="Deselect parameter codes that should not be created">Create missing parameter codes</h3>
        <section class="component-vmargin">
            ${getButton('checknewparametercodes','Check','codicon-refresh','primary')}
        </section>

        ${newParamSection}

        <vscode-divider role="separator"></vscode-divider>
      <section class="rowsingle">`;

      return html;
  }

  private _getDetailsGrid(): string {

    let getParametersGrid = /*html*/ `
      <section class="grid7flex somemargin">
        <div class="nowrap">Environment</div>
        <div class="nowrap">Auto-trim values</div>
        <div class="nowrap">Revert to previous</div>
        <div class="nowrap">Param name width</div>
        <div class="nowrap">New value width</div>
        <div class="nowrap">Set all change reasons</div>
        <div>-</div>        
        <div class="component-nomargin">
          <vscode-dropdown id="environment" class="dropdown" index="${environmentIndex}" ${backgroundColorString(this._fieldValues[environmentIndex] === 'PROD' ? 'red' : '')} ${valueString(this._fieldValues[environmentIndex])} position="below">
              ${dropdownOptions(this._environmentOptions)}
          </vscode-dropdown>
        </div>
        <div class="component-nomargin">
          <vscode-checkbox id="trim" class="trim" ${checkedString(this._trim)}></vscode-checkbox>
        </div>
        <div class="component-nomargin">
          <vscode-checkbox id="previous" class="previous" ${disabledString(this._previousValues.length > 0)} ${checkedString(this._previous)}></vscode-checkbox>
        </div>
        <div class="component-nomargin">
          <vscode-dropdown id="parameternamewidth" class="dropdown" index="${parameterNameWidthIndex}" ${valueString(this._fieldValues[parameterNameWidthIndex])} position="below">
              ${dropdownOptions([15,20,30,40])}
          </vscode-dropdown>
        </div>
        <div class="component-nomargin">
          <vscode-dropdown id="newvaluewidth" class="dropdown" index="${newValueWidthIndex}" ${valueString(this._fieldValues[newValueWidthIndex])} position="below">
              ${dropdownOptions([15,20,30,40])}
          </vscode-dropdown>
        </div>

        <div class="component-nomargin">
          <vscode-text-field id="allchangereasons" class="field" index="${allChangeReasonsIndex}" ${valueString(this._fieldValues[allChangeReasonsIndex])}></vscode-text-field>
        </div>

        <div class="component-nomargin">
          ${getButton('setparameters','Set Parameters','codicon-arrow-right','','','nowrap')}
          <div class="component-nomargin">
            <vscode-progress-ring id="processingset" ${hiddenString(this._processingSet)}></vscode-progress-ring>
          </div>
        </div>
        
      </section>
      `;

    return getParametersGrid;
  }

  private _getOptionText(response:ResponseObject) : string {
    // if statusText 'OK' : 'OK'
    // else if status 0: ''
    // else : '[status] : [statusText]'
    return response?.statusText === 'OK' ? response?.statusText : ( response?.status === 0 ? '' : (response?.status.toString() + ' : ' + response?.statusText));
  }

  private _getResponseOption(idString:string, index:number, response:ResponseObject ): string {
    let isOk:boolean = (response?.statusText ?? '') === 'OK';

    let okClassString: string =  isOk ? ' ok' : '';
    let optionText = this._getOptionText(response);
    let titleString = isOk ? response?.statusText : `${response?.statusText ?? ''} : ${response?.message ?? ''}`;

    let html: string = /*html*/`
        <section class="component-nomargin">
          <div id="${idString}response${index}" class="${idString}responsefield" index="${index}" ${hiddenString(!isEmpty(response?.statusText ?? ''))}>
            <vscode-option id="${idString}responsefieldoption${index}" class="${idString}responsefieldoption${okClassString}" title="${titleString}">${optionText}</vscode-option>
          </div>
        </section>
      `;

    return html;
  }

  private _getCurrentValues(): string {
    let currentValuesGrid: string = '';

    for (let index = 0; index < +this._fieldValues[noflinesIndex]; index++) {

      currentValuesGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="currentvalue${index}" class="currentvaluefield" value="${escapeHtml(this._currentValues[index] ?? '')}" readonly></vscode-text-field>
        </section>
      `;

      currentValuesGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="currentchangereason${index}" class="currentchangereasonfield" value="${this._currentChangeReasonValues[index] ?? ''}" readonly></vscode-text-field>
        </section>
      `;

      currentValuesGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="currenttimestamp${index}" class="currenttimestampfield" value="${this._currentTimestampValues[index] ?? ''}" title="${this._extendedHistoryValues[index] ?? ''}" readonly></vscode-text-field>
        </section>
      `;

      // api response      
      currentValuesGrid += this._getResponseOption('get',index,this._getResponseValues[index]);
    }

    let html: string = /*html*/ `
      <section class="flexwrapper">
        <section class="grid4flex">
          <div>Current value</div>
          <div>Change reason</div>
          <div>Timestamp</div>
          <div class="responsediv">Get Response</div>
          ${currentValuesGrid}
        </section>
      </section>
      `;

    return html;
  }

  private _parameterInputs(): string {
    let nofRows = +this._fieldValues[noflinesIndex];
    let inputGrid: string = '';
    for (let row = 0; row < nofRows; row++) {

      // code company
      inputGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="codecompany${row}" class="codecompanyfield" index="${row}" tabindex="${row +1}0" ${valueString(this._codeCompanyValues[row])} placeholder="CodeCompany"></vscode-text-field>
        </section>
      `;

      // code customer
      var showCodeCustomerSearch: boolean = (this._codeCustomerSearchValues[row] !== undefined) && (this._codeCustomerSearchValues[row].length > 0);
      let selectedCodeCustomerOption = showCodeCustomerSearch ? this._codeCustomerSearchValues[row].filter(el => el.includes(`(${this._codeCustomerValues[row]})`))[0] ?? this._codeCustomerValues[row] ?? '' : '';
      inputGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="codecustomer${row}" class="codecustomerfield" index="${row}" tabindex="${row +1}1" ${valueString(this._codeCustomerValues[row])} placeholder="CodeCustomer" ${hiddenString(!showCodeCustomerSearch)}></vscode-text-field>
          <select id="codecustomeroptions${row}" class="codecustomeroptionsfield" index="${row}" tabindex="${row +1}2" position="below" title="${selectedCodeCustomerOption}" ${hiddenString(showCodeCustomerSearch)}>
            ${selectOptions(this._codeCustomerSearchValues[row] ?? [''],selectedCodeCustomerOption)}
          </select>
        </section>
      `;

      // parameter name
      var showSearch: boolean = (this._parameterSearchValues[row] !== undefined) && (this._parameterSearchValues[row].length > 0);
      let selectedOption = showSearch ? this._parameterSearchValues[row].filter(el => el.startsWith(this._parameterNameValues[row] + ' '))[0] ?? this._parameterNameValues[row] ?? '' : '';

      inputGrid += /*html*/`
        <section class="component-nomargin">
            <vscode-text-field id="parametername${row}" class="parameternamefield" index="${row}" tabindex="${row +1}3" ${valueString(this._parameterNameValues[row])} placeholder="parameter name" style="width: ${this._fieldValues[parameterNameWidthIndex]}rem;" ${hiddenString(!showSearch)}></vscode-text-field>
            <select id="parameteroptions${row}" class="parameteroptionsfield" index="${row}" tabindex="${row +1}4" position="below" title="${selectedOption}" style="width: ${this._fieldValues[parameterNameWidthIndex]}rem;" ${hiddenString(showSearch)}>
              ${selectOptions(this._parameterSearchValues[row] ?? [''],selectedOption)}
            </select>
        </section>
      `;

      // previous parameter value
      inputGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="previousvalue${row}" class="previousvaluefield" index="${row}" tabindex="-1" ${valueString(escapeHtml(this._previousValues[row]??''))} readonly></vscode-text-field>
        </section>
      `;

      // new parameter value
      inputGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="newvalue${row}" class="newvaluefield" index="${row}" tabindex="${row +1}5" ${valueString(escapeHtml(this._newValues[row]??''))} placeholder="new parameter value" style="width: ${this._fieldValues[newValueWidthIndex]}rem;"></vscode-text-field>
        </section>
      `;

      // change reason
      inputGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-text-field id="changereason${row}" class="changereasonfield" index="${row}" tabindex="${row +1}6" ${valueString(escapeHtml(this._changeReasonValues[row]??''))} placeholder="change reason"></vscode-text-field>
        </section>
      `;

      // api response
      inputGrid += this._getResponseOption('set',row, this._setResponseValues[row]);
    }

    let html: string = /*html*/ `
      <section class="flexwrapper">
        <section class="grid7flex">
          <div>CodeCompany</div>
          <div>CodeCustomer</div>
          <div title="Enter to search, Ctrl + Enter to type">Parameter Name</div>
          <div>Previous Value</div>
          <div>New Value</div>
          <div>Change Reason</div>
          <div class="responsediv">Set Response</div>
          ${inputGrid}
          <div>
            ${getButton('removeline','-','','primary')}
            ${getButton('addline','+','','primary')}
          </div>
        </section>
      </section>
      `;

    return html;
  }

}