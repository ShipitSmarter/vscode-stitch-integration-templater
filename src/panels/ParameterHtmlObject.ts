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
          </section>
          <section id="farright">
            
          </section>
				</div>
        
        <section class="rowflex">

          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">
                <h2>Parameter details</h2>
                ${this._getParametersGrid()}
              </div>
            </section> 
          </section>


          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">
                <h2>Parameter values</h2>
                ${this._parameterValues()}
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

  private _getParametersGrid(): string {

    let getParametersGrid = /*html*/ `
      <section class="component-example">
        <vscode-text-field id="parametername" class="field" index="${parameterIndex}" ${valueString(this._fieldValues[parameterIndex])} placeholder="parameter name" size="15"></vscode-text-field>
      </section>

      <section class="component-example">
        <vscode-text-field id="codecompany" class="field" index="${codecompanyIndex}" ${valueString(this._fieldValues[codecompanyIndex])} placeholder="CodeCompany" size="15"></vscode-text-field>
      </section>

      <section class="component-example">
        <vscode-text-field id="handlingagent" class="field" index="${handlingagentIndex}" ${valueString(this._fieldValues[handlingagentIndex])} placeholder="handling agent" size="15"></vscode-text-field>
      </section>


      <section class="component-example">
        <vscode-dropdown id="environment" class="dropdown" index="${environmentIndex}" ${valueString(this._fieldValues[environmentIndex])} position="below">
            ${dropdownOptions(this._environmentOptions)}
        </vscode-dropdown>
      </section>
      

      ${this._getParametersButton()}

      `;

    return getParametersGrid;
  }

  private _parameterValues(): string {
    let html: string = ``;

    for (let index = 0; index < this._currentValues.length; index++) {
      let curValue = this._currentValues[index];

      html += /*html*/`
        <section class="component-example">
          <vscode-text-field id="currentvalue${index}" class="currentvaluefield" value="${curValue}" readonly></vscode-text-field>
        </section>
      `;
    }

    return html;
  }

}