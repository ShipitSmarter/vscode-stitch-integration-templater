import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString} from "../utilities/functions";

// fixed fields indices
const variable0Index = 0;
const variable1Index = 1;
const variable2Index = 2;
const variable3Index = 3;

export class NEWNAMEHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: NEWNAMEHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],
    private _fieldValues: string[]
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
					  <h1>New Name Title</h1> 
          </section>
          <section id="farright">
            ${this._getExecuteButton()}
          </section>
				</div>
        
        <section class="rowflex">

          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">
                <div class="floatleft">
                    <h2>Some details</h2>
                    ${this._getDetailsGrid()}
                </div>
              </div>
            </section> 
          </section>

        </section>

			</body>
		</html>
	  `;

    return html;
  }

  private _getExecuteButton(): string {
    let getParametersButton: string = /*html*/ `
      <vscode-button id="execute" appearance="primary" >
        Get Parameters
        <span slot="start" class="codicon codicon-add"></span>
      </vscode-button>
      `;
    return getParametersButton;
  }

  private _getRefreshButton(): string {
    let refreshButton: string = /*html*/ `
    <vscode-button id="refresh" appearance="primary">
      Refresh
      <span slot="start" class="codicon codicon-refresh"></span>
    </vscode-button>
  `;
    return refreshButton;
  }

  private _getDetailsGrid(): string {
    let getParametersGrid = /*html*/ `
      <section class="component-example">
        <vscode-text-field id="variable0" class="field" index="${variable0Index}" ${valueString(this._fieldValues[variable0Index])} placeholder="parameter name" size="15"></vscode-text-field>
      </section>

      <section class="component-example">
        <vscode-text-field id="variable1" class="field" index="${variable1Index}" ${valueString(this._fieldValues[variable1Index])} placeholder="CodeCompany" size="15"></vscode-text-field>
      </section>

      <section class="component-example">
        <vscode-text-field id="variable2" class="field" index="${variable2Index}" ${valueString(this._fieldValues[variable2Index])} placeholder="handling agent" size="15"></vscode-text-field>
      </section>


      <section class="component-example">
        <vscode-dropdown id="variable3" class="dropdown" index="${variable3Index}" ${valueString(this._fieldValues[variable3Index])} position="below">
            ${dropdownOptions(['ACC','PROD'])}
        </vscode-dropdown>
      </section>
      

      ${this._getRefreshButton()}

      `;

    return getParametersGrid;
  }

}