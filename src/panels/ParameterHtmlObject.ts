import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString, removeQuotes, disabledString, escapeHtml, isEmpty} from "../utilities/functions";

// fixed fields indices
const parameterIndex = 0;
const codecompanyIndex = 1;
const handlingagentIndex = 2;
const environmentIndex = 3;
const filesIndex = 4;
const noflinesIndex = 5;
const saveIndex = 6;

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
    private _previousValues: string[],
    private _newValues: string[],
    private _changeReasonValues: string[],
    private _setResponseValues: string[],
    private _currentValues: string[],
    private _getResponseValues: string[],
    private _previous: boolean,
    private _showLoad: boolean,
    private _environmentOptions: string[]
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

        ${this._getLoadItems()}
        
        <section class="rowflex">
          <section class="rowsingle">
                ${this._getDetailsGrid()}
          </section>

          <section class="component-header">
            ${this._getParametersButton()}
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

  private _setParametersButton(): string {
    let getParametersButton: string = /*html*/ `
      <vscode-button id="setparameters" appearance="primary" >
        Set Parameters
        <span slot="start" class="codicon codicon-arrow-right"></span>
      </vscode-button>
      `;
    return getParametersButton;
  }

  private _getParametersButton(): string {
    let getParametersButton: string = /*html*/ `
      <vscode-button id="getparameters" appearance="primary" >
        Get Parameters
        <span slot="start" class="codicon codicon-refresh"></span>
      </vscode-button>
      `;
    return getParametersButton;
  }

  private _getDetailsGrid(): string {

    let getParametersGrid = /*html*/ `
      <section class="component-example">
        <div class="floatleftnopadding">
          Environment:
        </div>
        <div class="floatleft">
          <vscode-dropdown id="environment" class="dropdown" index="${environmentIndex}" ${valueString(this._fieldValues[environmentIndex])} position="below">
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
        <div class="floatleft">
          ${this._setParametersButton()}
        </div>
      </section>

      <section class="component-example">
        <div class="floatleftnopadding">
          Save file to folder:
        </div>
        <div class="floatleft">
        <vscode-text-field id="save" class="field" index="${saveIndex}" ${valueString(this._fieldValues[saveIndex])}></vscode-text-field>
        </div>
      </section>
      `;

    return getParametersGrid;
  }

  private _getLoadItems(): string {
    let filesDropdown: string = /*html*/ `
      <vscode-dropdown id="files" class="files" position="below" ${hiddenString(this._showLoad)}>
        ${dropdownOptions(this._getFileLoadOptions())}
      </vscode-dropdown>`;

    let filesField: string = /*html*/ `<vscode-text-field id="files" class="field" index="${filesIndex}" ${valueString(this._fieldValues[filesIndex])} ${hiddenString(this._showLoad)}></vscode-text-field>`;
    
    let html: string = /*html*/ `

    <section class="rowsingle">
      <vscode-divider role="separator"></vscode-divider>

      <section class="component-example">
        <vscode-checkbox id="showload" class="showload" ${checkedString(this._showLoad)}>Load from file</vscode-checkbox>
      </section>

      <section class="component-example">
        <div class="floatleft">
          ${filesField}
        </div>
        <div class="floatleft">
          <vscode-button id="load" appearance="primary" ${hiddenString(this._showLoad)}>
            Load
            <span slot="start" class="codicon codicon-arrow-up"></span>
          </vscode-button>
        </div>
      </section>

      <vscode-divider role="separator"></vscode-divider>
    </section>
    
    `;

    return html;
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

  private _getCurrentValues(): string {
    let currentValues: string = ``;
    let getResponseValues: string = '';

    for (let index = 0; index < +this._fieldValues[noflinesIndex]; index++) {
      let curValue = this._currentValues[index] ?? '';

      currentValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="currentvalue${index}" class="currentvaluefield" value="${curValue}" readonly></vscode-text-field>
        </section>
      `;

      // set response
      const okEmoji: string = '&#9989;';
      const badEmoji: string = '&#10060;';
      let emoji:string = this._getResponseValues[index] === 'OK' ? okEmoji : (isEmpty(this._getResponseValues[index]) ? '-' : badEmoji);
      getResponseValues += /*html*/`
        <section class="component-response-minvmargin">
          <div id="getresponse${index}" class="getresponsefield" index="${index}" title="${this._getResponseValues[index]??''}">${emoji}</div>
        </section>
      `;
    }

    let html: string = /*html*/ `
      <section class="component-example">
        <section class="floatleftnopadding">
          <p>Current Value</p>
          ${currentValues}
        </section>

        <section class="floatleftnopadding">
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
        <vscode-text-field id="codecompany${row}" class="codecompanyfield" index="${row}" ${valueString(this._codeCompanyValues[row])} placeholder="CodeCompany"></vscode-text-field>
        </section>
      `;

      // code customer
      codeCustomers += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="codecustomer${row}" class="codecustomerfield" index="${row}" ${valueString(this._codeCustomerValues[row])} placeholder="CodeCustomer"></vscode-text-field>
        </section>
      `;

      // parameter name
      parameterNames += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="parametername${row}" class="parameternamefield" index="${row}" ${valueString(this._parameterNameValues[row])} placeholder="parameter name"></vscode-text-field>
        </section>
      `;

      // previous parameter value
      previousValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="previousvalue${row}" class="previousvaluefield" index="${row}" ${valueString(escapeHtml(this._previousValues[row]??''))} readonly></vscode-text-field>
        </section>
      `;

      // new parameter value
      newValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="newvalue${row}" class="newvaluefield" index="${row}" ${valueString(escapeHtml(this._newValues[row]??''))} placeholder="new parameter value"></vscode-text-field>
        </section>
      `;

      // change reason
      changeReasonValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="changereason${row}" class="changereasonfield" index="${row}" ${valueString(escapeHtml(this._changeReasonValues[row]??''))} placeholder="change reason"></vscode-text-field>
        </section>
      `;

      // set response
      const okEmoji: string = '&#9989;';
      const badEmoji: string = '&#10060;';
      // this._setResponseValues[row] = '401';
      let emoji:string = this._setResponseValues[row] === 'OK' ? okEmoji : (isEmpty(this._setResponseValues[row]) ? '-' : badEmoji);
      setResponseValues += /*html*/`
        <section class="component-response-minvmargin">
          <div id="setresponse${row}" class="setresponsefield" index="${row}" title="${this._setResponseValues[row]??''}">${emoji}</div>
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
          <p>Parameter Name</p>
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