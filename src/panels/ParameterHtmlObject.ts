import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString, removeQuotes, disabledString, escapeHtml} from "../utilities/functions";

// fixed fields indices
const parameterIndex = 0;
const codecompanyIndex = 1;
const handlingagentIndex = 2;
const environmentIndex = 3;
const filesIndex = 4;

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
    private _currentValues: string[],
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
        <p>Environment</p>
        <vscode-dropdown id="environment" class="dropdown" index="${environmentIndex}" ${valueString(this._fieldValues[environmentIndex])} position="below">
            ${dropdownOptions(this._environmentOptions)}
        </vscode-dropdown>
        <vscode-checkbox id="previous" class="previous" ${disabledString(this._previousValues.length > 0)} ${checkedString(this._previous)}>Revert to Previous</vscode-checkbox>
        ${this._setParametersButton()}
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

    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      let curValue = this._currentValues[index] ?? '';

      currentValues += /*html*/`
        <section class="component-minvmargin">
          <vscode-text-field id="currentvalue${index}" class="currentvaluefield" value="${curValue}" readonly></vscode-text-field>
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
          
        </section>
      </section>`;

    return html;

    return html;
  }

  

  private _parameterInputs(): string {
    let nofRows = this._codeCompanyValues.length;
    let codeCompanys: string = '';
    let codeCustomers: string = '';
    let parameterNames: string = '';
    let previousValues: string = '';
    let newValues: string = '';
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
          <vscode-text-field id="handlingagent${row}" class="codecustomerfield" index="${row}" ${valueString(this._codeCustomerValues[row])} placeholder="handling agent"></vscode-text-field>
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
        <section class="floatleft">
          <p>New Value</p>
          ${newValues}
        </section>
      </section>`;

    return html;
  }

}