import * as vscode from "vscode";
import {  dropdownOptions, toBoolean} from "../utilities/functions";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;

export class CreatePostmanCollectionHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: CreatePostmanCollectionHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],
    private _modularElements: string[],
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
					  <h1>Create Postman Collection</h1> 
          </section>
          <section id="farright">
            ${this._getCreateButton()}
          </section>
				</div>
        
          <section class="rowsingle">
            <section class="component-container">
              <h2>Carrier</h2>
              ${this._getCarrierFolderStructureGrid()}
            </section> 
          </section>

			</body>
		</html>
	  `;

    return html;
  }
  
  private _valueString(string: string): string {
    let outString = '';
    if (string !== undefined && string !== "") {
      outString = `value="${string}"`;
    }
    return outString;
  }

  private _hiddenString(ifTrue: boolean): string {
    let hiddenString = 'hidden';
    if (ifTrue) {
      hiddenString = '';
    }

    return hiddenString;
  }

  private _getCreateButton(): string {
    let createButton: string = /*html*/ `
      <vscode-button id="createintegration" appearance="primary">
        CreatePostman Collection
        <span slot="start" class="codicon codicon-add"></span>
      </vscode-button>
      `;
    return createButton;
  }

  private _getCarrierFolderStructureGrid(): string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">
        <p>Folder structure:    <b>carrier / api-name / module</b></p>
        <vscode-text-field id="carriername" title="test hover carrier name" class="field" index="${carrierIndex}" ${this._valueString(this._fieldValues[carrierIndex])} placeholder="carrier" size="5"></vscode-text-field>
        /
        <vscode-text-field id="carrierapiname" class="field" index="${apiIndex}" ${this._valueString(this._fieldValues[apiIndex])} placeholder="api-name" size="5"></vscode-text-field>
        /
        <vscode-dropdown id="modulename" class="dropdown" index="${moduleIndex}" ${this._valueString(this._fieldValues[moduleIndex])} position="below">
          ${dropdownOptions(['booking', 'tracking', 'cancel', 'pickup', 'pickup_cancel'])}
        </vscode-dropdown>

        <section class="component-example">
          <vscode-button id="checkintegrationexists" appearance="primary">
            Check
            <span slot="start" class="codicon codicon-refresh"></span>
          </vscode-button>
        </section>
      </section>`;

    return carrierFolderStructureGrid;
  }

}