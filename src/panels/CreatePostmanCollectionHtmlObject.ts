import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth} from "../utilities/functions";

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
    private _modularElements: string[],
    private _independent: boolean,
    private _modularValue: boolean
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

        <section class="${this._ifDependent('rowsingle')}${this._ifIndependent('row32')}">

          <section class="rowsingle">
            <section class="component-container">


              <section class="component-example">
                <div class="floatleft">
                  <vscode-checkbox id="independent" class="independent" ${this._checkedString(this._independent)}>Independent of existing integrations</vscode-checkbox>
                </div>
                <div class="floatleft">
                  ${this._getRefreshButton()}
                </div>
              </section>

              <vscode-divider role="separator"></vscode-divider>

              <h2>Carrier</h2>

              ${this._ifIndependent(this._getIndependentCarrierFolderStructureGrid())}
              ${this._ifDependent(this._getCarrierFolderStructureGrid())}

              ${this._getCarrierDetailsGrid()}

              <vscode-divider role="separator"></vscode-divider>

              ${this._getHeadersGrid()} 

            </section> 
          </section>

            ${this._ifIndependent(this._getScenariosGrid(this._availableScenarios, this._modularElements))}
        </section>

			</body>
		</html>
	  `;

    return html;
  }

  private _checkedString(checked: boolean): string {
    let outString: string = '';
    if (checked) {
      outString = 'checked';
    }

    return outString;
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

  private _ifIndependent(content: string): string {
    let outString = '';
    if (this._independent) {
      outString = content;
    }

    return outString;
  }

  private _ifDependent(content: string): string {
    let outString = '';
    if (!this._independent) {
      outString = content;
    }

    return outString;
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
      `;

    return carrierFolderStructureGrid;
  }

  private _getIndependentCarrierFolderStructureGrid(): string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">

        <div class="floatleft">
          <p>Carrier</p>
          <vscode-dropdown id="carriername" class="dropdownfield" index="${carrierIndex}" ${this._valueString(this._fieldValues[carrierIndex])} position="below">
            ${dropdownOptions(this._carriers)}
          </vscode-dropdown>
        </div>

        <div class="floatleftnopadding">
          <p>Module</p>
          <vscode-dropdown id="modulename" class="dropdownfield" index="${moduleIndex}" ${this._valueString(this._fieldValues[moduleIndex])} position="below">
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
          <vscode-text-field id="carriercode" class="field" index="${carrierCodeIndex}" ${this._valueString(this._fieldValues[carrierCodeIndex])} readonly></vscode-text-field>
        </div>
        <div class="floatleft">
          <p>Account number</p>
          <vscode-text-field id="accountnumber" class="field" index="${accountNumberIndex}" ${this._valueString(this._fieldValues[accountNumberIndex])} placeholder="123456" size="5"></vscode-text-field>
        </div>
        <div class="floatleftnopadding">
          <p>CostCenter</p>
          <vscode-text-field id="costcenter" class="field" index="${costCenterIndex}" ${this._valueString(this._fieldValues[costCenterIndex])} placeholder="000001" size="5"></vscode-text-field>
        </div>
      </section>
      
      <section class="component-example">
        <p>Select customer</p>
        <vscode-dropdown id="company" class="dropdown" index="${companyIndex}" ${this._valueString(this._fieldValues[companyIndex])} position="below">
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
            <vscode-dropdown id="nofheaders" class="dropdown" index="${nofHeadersIndex}" ${this._valueString(this._fieldValues[nofHeadersIndex])} position="below">
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
          <vscode-text-field id="headername${header}" index="${header}" ${this._valueString(hNames[header])} class="headername" placeholder="header name"></vscode-text-field>
        </section>`;

        subPHeaderValue += /*html*/ `
        <section class="component-example">
          <vscode-text-field id="headervalue${header}" index="${header}" ${this._valueString(hValues[header] )} class="headervalue" placeholder="header value"></vscode-text-field>
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

  private _getScenariosGrid(scenarios: string[], modularElements: string[]): string {
    let scenariosGrid = /*html*/ `    
    <section class="rowsingle">
      <section class="component-container">
        <h2>Scenarios</h2>

        <vscode-text-field id="modularelements" value="${modularElements.join(',')}" hidden></vscode-text-field>

        <section class="component-example">
          <vscode-checkbox id="modular" class="modular" ${this._checkedString(this._modularValue)}>Modular</vscode-checkbox>
        </section>

        <section class="component-example">
          <p>Number of Scenarios</p>
          <vscode-dropdown id="nofscenarios" class="dropdown" index="${nofScenariosIndex}" ${this._valueString(this._fieldValues[nofScenariosIndex] ?? 0)} position="below">
            ${dropdownOptions(arrayFrom0(100))}
          </vscode-dropdown>
        </section>

        ${this._scenarioInputs(+this._fieldValues[nofScenariosIndex], scenarios)}
      </section>
    </section>`;

    return scenariosGrid;
  }

  private _scenarioInputs(nofScenarios: number, scenarios: string[]): string {
    let html: string = ``;

    for (let scenario = 0; scenario < +nofScenarios; scenario++) {

      let scenarioInputField: string = '';
      if (this._modularValue) {
        scenarioInputField = /*html*/ `<vscode-text-field id="scenario${scenario}" index="${scenario}" ${this._valueString(this._scenarioFieldValues[scenario])} class="scenariofield" placeholder="${(scenario + 1) + nth(scenario + 1)} scenario name..."></vscode-text-field>`;
      } else {
        scenarioInputField = /*html*/ `
          <vscode-dropdown id="scenario${scenario}" index="${scenario}" ${this._valueString(this._scenarioFieldValues[scenario])} class="scenariofield" position="below">
            <vscode-option></vscode-option>  
            ${dropdownOptions(scenarios)}
          </vscode-dropdown>`;
      }

      html += /*html*/`
        <section class="component-example">
          ${scenarioInputField}
        </section>`;
    }

    return html;
  }

}