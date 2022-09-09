import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString} from "../utilities/functions";
import { ScenarioGridObject } from "../utilities/ScenarioGridObject";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const companyIndex = 3;
const nofHeadersIndex = 4;
const accountNumberIndex = 5;
const costCenterIndex = 6;
const nofScenariosIndex = 7;
const carrierCodeIndex = 8;
const pmcIndex = 9;

export class CreatePostmanCollectionHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: CreatePostmanCollectionHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],
    private _fieldValues: string[],
    private _headers: {name: string, value: string}[],
    private _carriers: string[],
    private _apis: string[],
    private _modules: string[],
    private _companies: string[],
    private _carrierCodes: {carrier: string,  carriercode: string }[] = [],
    private _scenarioFieldValues: string[],
    private _availableScenarios: string[], 
    private _modularElementsWithParents: {parent:string, element:string, multi:boolean}[],
    private _packageTypes: string[],
    private _independent: boolean,
    private _multiFieldValues: {[details: string] : string;},
    private _nofPackages: string[],
    private _pmcObjects : {parent:string, file:string, path:string}[],
    private _showLoad: boolean,
    private _scenarioCustomFields: string[]
  ) { }

  // METHODS
  public getHtml() {
    // define necessary extension Uris
    const toolkitUri  = this._uris[0];
    const codiconsUri = this._uris[1];
    const mainUri     = this._uris[2];
    const styleUri    = this._uris[3];

    // get scenario grid object
    let scenarioGrid: ScenarioGridObject = new ScenarioGridObject(
      this._availableScenarios, 
      this._modularElementsWithParents, 
      this._packageTypes,
      this._scenarioFieldValues, 
      +this._fieldValues[nofScenariosIndex], 
      nofScenariosIndex,
      this._multiFieldValues,
      this._nofPackages,
      this._scenarioCustomFields
    );

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

        <section class="${this._ifDependent('rowsingle')}${this._ifIndependent('rowflex')}">

          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">

                <section class="component-example">
                  <div class="floatleft">
                    <vscode-checkbox id="independent" class="independent" ${checkedString(this._independent)}>Independent of existing integrations</vscode-checkbox>
                  </div>
                  <div class="floatleft">
                    ${this._getRefreshButton()}
                  </div>
                </section>

                <vscode-divider role="separator"></vscode-divider>

                <section class="component-example">
                  <vscode-checkbox id="showload" class="showload" ${checkedString(this._showLoad)}>Load from file</vscode-checkbox>
                </section>

                <section class="component-example">
                  <div class="floatleft">
                    <vscode-dropdown id="pmcs" class="pmcs" position="below" ${valueString(this._fieldValues[pmcIndex])} ${hiddenString(this._showLoad)}>
                      ${dropdownOptions(this._getFileLoadOptions())}
                    </vscode-dropdown>
                  </div>
                  <div class="floatleft">
                    <vscode-button id="load" appearance="primary" ${hiddenString(this._showLoad)}>
                      Load
                      <span slot="start" class="codicon codicon-arrow-up"></span>
                    </vscode-button>
                  </div>
                </section>

                <vscode-divider role="separator"></vscode-divider>

                <h2>Carrier</h2>

                ${this._ifIndependent(this._getIndependentCarrierFolderStructureGrid())}
                ${this._ifDependent(this._getCarrierFolderStructureGrid())}

                ${this._getCarrierDetailsGrid()}

                <vscode-divider role="separator"></vscode-divider>

                ${this._getHeadersGrid()} 
                
              </div>
            </section> 
          </section>

            ${this._ifIndependent(scenarioGrid.getHtml())}
        </section>

			</body>
		</html>
	  `;

    return html;
  }

  private _getFileLoadOptions() : string[] {
    //this._pmcObjects.map(el => el.path);
    var options: string[] = [];

    for (let index = 0; index < this._pmcObjects.length; index++) {
      let pmc = this._pmcObjects[index];
      options[index] = pmc.parent + ' > ' + pmc.file;
    }

    return options.sort();
  }

  private _ifIndependent(content: string): string {
    return this._independent ? content : '';
  }

  private _ifDependent(content: string): string {
    return this._independent ? '' : content;
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

  private _getRefreshButton(): string {
    let refreshButton: string = /*html*/ `
    <vscode-button id="refresh" appearance="primary">
      Refresh
      <span slot="start" class="codicon codicon-refresh"></span>
    </vscode-button>
  `;
    return refreshButton;
  }

  private _getCarrierFolderStructureGrid(): string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">

        <p>Folder structure:    <b>carrier / api-name / module</b></p>
        <vscode-dropdown id="carriername" class="dropdown" index="${carrierIndex}" ${valueString(this._fieldValues[carrierIndex])} position="below">
          ${dropdownOptions(this._carriers)}
        </vscode-dropdown>
        /
        <vscode-dropdown id="carrierapiname" class="dropdown" index="${apiIndex}" ${valueString(this._fieldValues[apiIndex])} position="below">
          ${dropdownOptions(this._apis)}
        </vscode-dropdown>
        /
        <vscode-dropdown id="modulename" class="dropdown" index="${moduleIndex}" ${valueString(this._fieldValues[moduleIndex])} position="below">
          ${dropdownOptions(this._modules)}
        </vscode-dropdown>

      </section>
      `;

    return carrierFolderStructureGrid;
  }

  private _getIndependentCarrierFolderStructureGrid(): string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">

        <div class="floatleft">
          <p>Carrier</p>
          <vscode-dropdown id="carriername" class="dropdownfield" index="${carrierIndex}" ${valueString(this._fieldValues[carrierIndex])} position="below">
            ${dropdownOptions(this._carriers)}
          </vscode-dropdown>
        </div>

        <div class="floatleftnopadding">
          <p>Module</p>
          <vscode-dropdown id="modulename" class="dropdownfield" index="${moduleIndex}" ${valueString(this._fieldValues[moduleIndex])} position="below">
            ${dropdownOptions(this._modules)}
          </vscode-dropdown>
        </div>

      </section>   
      `;

    return carrierFolderStructureGrid;
  }

  private _getCarrierDetailsGrid() : string {
    let carrierDetailsGrid = /*html*/`
      <section class="component-example">
        <div class="floatleft">
          <p>Carrier Code</p>
          <vscode-text-field id="carriercode" class="field" index="${carrierCodeIndex}" ${valueString(this._fieldValues[carrierCodeIndex])} readonly></vscode-text-field>
        </div>
        <div class="floatleft">
          <p>Account number</p>
          <vscode-text-field id="accountnumber" class="field" index="${accountNumberIndex}" ${valueString(this._fieldValues[accountNumberIndex])} placeholder="123456" size="5"></vscode-text-field>
        </div>
        <div class="floatleftnopadding">
          <p>CostCenter</p>
          <vscode-text-field id="costcenter" class="field" index="${costCenterIndex}" ${valueString(this._fieldValues[costCenterIndex])} placeholder="000001" size="5"></vscode-text-field>
        </div>
      </section>
      
      <section class="component-example">
        <p>Select customer</p>
        <vscode-dropdown id="company" class="dropdown" index="${companyIndex}" ${valueString(this._fieldValues[companyIndex])} position="below">
            ${dropdownOptions(this._companies)}
          </vscode-dropdown>
      </section>     
    `;

    return carrierDetailsGrid;
  }

  private _getHeadersGrid(): string {
    let headersGrid = /*html*/ `
        <section class="component-example">
          <h2>Headers</h2>

          <section class="component-example">
            <p>Number of headers</p>
            <vscode-dropdown id="nofheaders" class="dropdown" index="${nofHeadersIndex}" ${valueString(this._fieldValues[nofHeadersIndex])} position="below">
              ${dropdownOptions(arrayFrom1(10))}
            </vscode-dropdown>
          </section>

          ${this._headerInputs(+this._fieldValues[nofHeadersIndex])}
        </section>
        `;

    return headersGrid;
  }

  private _headerInputs(nofHeaders: number): string {

    let subHeaderName: string = '';
    let subPHeaderValue: string = '';
    let hNames: string[] = this._headers.map(el => el.name);
    let hValues : string[] = this._headers.map(el => el.value);
    for (let header = 0; header < +nofHeaders; header++) {

      subHeaderName += /*html*/ `
        <section class="component-example">
          <vscode-text-field id="headername${header}" index="${header}" ${valueString(hNames[header])} class="headername" placeholder="header name"></vscode-text-field>
        </section>`;

        subPHeaderValue += /*html*/ `
        <section class="component-example">
          <vscode-text-field id="headervalue${header}" index="${header}" ${valueString(hValues[header] )} class="headervalue" placeholder="header value"></vscode-text-field>
        </section>`;
    }

    let html: string = /*html*/ `
      <section class="component-example">
        <div class="floatleft">
          <p>Name</p>
          ${subHeaderName}
        </div>
        <div class="floatleft">
          <p>Value</p>
          ${subPHeaderValue}
        </div>
      </section>`;

    return html;
  }

}