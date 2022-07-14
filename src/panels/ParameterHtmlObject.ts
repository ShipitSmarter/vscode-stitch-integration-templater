import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString, removeQuotes} from "../utilities/functions";

// fixed fields indices
const parameterIndex = 0;
const codecompanyIndex = 1;
const handlingagentIndex = 2;
const environmentIndex = 3;

export class ParameterHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: ParameterHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],
    private _fieldValues: string[],
    private _codeCompanyValues: string[],
    private _handlingAgentValues: string[],
    private _parameterValues: string[],
    private _currentValues: string[],
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
					  <h1>Get parameters</h1> 
            ${this._getDetailsGrid()}
          </section>
          <section id="farright">
            
          </section>
				</div>
        
        <section class="rowflex">

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

  private _getParametersButton(): string {
    let getParametersButton: string = /*html*/ `
      <vscode-button id="getparameters" appearance="primary" >
        Get Parameters
        <span slot="start" class="codicon codicon-add"></span>
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
        ${this._getParametersButton()}
      </section>
      

      

      `;

    //   getParametersGrid = /*html*/ `<section class="component-example">
    //   <vscode-text-field id="parametername" class="field" index="${parameterIndex}" ${valueString(this._fieldValues[parameterIndex])} placeholder="parameter name" size="15"></vscode-text-field>
    // </section>

    // <section class="component-example">
    //   <vscode-text-field id="codecompany" class="field" index="${codecompanyIndex}" ${valueString(this._fieldValues[codecompanyIndex])} placeholder="CodeCompany" size="15"></vscode-text-field>
    // </section>

    // <section class="component-example">
    //   <vscode-text-field id="handlingagent" class="field" index="${handlingagentIndex}" ${valueString(this._fieldValues[handlingagentIndex])} placeholder="handling agent" size="15"></vscode-text-field>
    // </section>
    // ` + getParametersGrid;

    return getParametersGrid;
  }

  private _getCurrentValues(): string {
    let currentValues: string = ``;

    for (let index = 0; index < this._codeCompanyValues.length; index++) {
      let curValue = this._currentValues[index] ?? '';

      currentValues += /*html*/`
        <section class="component-vmargin">
          <vscode-text-field id="currentvalue${index}" class="currentvaluefield" value="${curValue}" readonly></vscode-text-field>
        </section>
      `;
    }

    let html: string = /*html*/ `
      <section class="component-example">
        <section class="floatleftnopadding">
          <p>Parameter Value</p>
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
    let handlingAgents: string = '';
    let parameterNames: string = '';
    for (let row = 0; row < nofRows; row++) {

      // step name dropdown
      codeCompanys += /*html*/`
        <section class="component-vmargin">
        <vscode-text-field id="codecompany${row}" class="codecompanyfield" index="${row}" ${valueString(this._codeCompanyValues[row])} placeholder="CodeCompany"></vscode-text-field>
        </section>
      `;


      // step type dropdown
      handlingAgents += /*html*/`
        <section class="component-vmargin">
          <vscode-text-field id="handlingagent${row}" class="handlingagentfield" index="${row}" ${valueString(this._handlingAgentValues[row])} placeholder="handling agent"></vscode-text-field>
        </section>
      `;

      // step method dropdown
      parameterNames += /*html*/`
        <section class="component-vmargin">
          <vscode-text-field id="parametername${row}" class="parameternamefield" index="${row}" ${valueString(this._parameterValues[row])} placeholder="parameter name"></vscode-text-field>
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
          <p>HandlingAgent</p>
          ${handlingAgents}
        </section>
        <section class="floatleftnopadding">
          <p>Parameter Name</p>
          ${parameterNames}
        </section>
      </section>`;

    return html;
  }

}