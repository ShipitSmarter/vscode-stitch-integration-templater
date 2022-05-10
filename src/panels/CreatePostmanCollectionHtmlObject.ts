import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort} from "../utilities/functions";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const companyIndex = 3;

export class CreatePostmanCollectionHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: CreatePostmanCollectionHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],
    private _fieldValues: string[],
    private _carriers: string[],
    private _apis: string[],
    private _modules: string[],
    private _companies: string[]
  ) { }

  // METHODS
  public getHtml() {
    // define necessary extension Uris
    const toolkitUri  = this._uris[0];
    const codiconsUri = this._uris[1];
    const mainUri     = this._uris[2];
    const styleUri    = this._uris[3];

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
      <vscode-button id="createpostmancollection" appearance="primary">
        Create Postman Collection
        <span slot="start" class="codicon codicon-add"></span>
      </vscode-button>
      `;
    return createButton;
  }

  private _getCarrierFolderStructureGrid(): string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">
        <p>Folder structure:    <b>carrier / api-name / module</b></p>
        <vscode-dropdown id="carriername" class="dropdown" index="${carrierIndex}" ${this._valueString(this._fieldValues[carrierIndex])} position="below">
            ${dropdownOptions(this._carriers)}
          </vscode-dropdown>
        /
        <vscode-dropdown id="carrierapiname" class="dropdown" index="${apiIndex}" ${this._valueString(this._fieldValues[apiIndex])} position="below">
            ${dropdownOptions(this._apis)}
          </vscode-dropdown>
        /
        <vscode-dropdown id="modulename" class="dropdown" index="${moduleIndex}" ${this._valueString(this._fieldValues[moduleIndex])} position="below">
          ${dropdownOptions(this._modules)}
        </vscode-dropdown>

      </section>
      
      <section class="component-example">
        <p>Select customer</p>
        <vscode-dropdown id="company" class="dropdown" index="${companyIndex}" ${this._valueString(this._fieldValues[companyIndex])} position="below">
            ${dropdownOptions(this._companies)}
          </vscode-dropdown>
      </section>
      
      `;

    return carrierFolderStructureGrid;
  }

}