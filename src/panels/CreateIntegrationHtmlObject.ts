import * as vscode from "vscode";
import { getUri, valueString, checkedString, hiddenString, disabledString, dropdownOptions, arrayFrom1, toBoolean, isModular, getButton, getPackageTypesFromStructure } from "../utilities/functions";
import { ScenarioGridObject } from "../utilities/ScenarioGridObject";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const carrierCodeIndex = 3;
const nofStepsIndex = 5;
const nofScenariosIndex = 6;

// type definitions
type ModularElementObject = {
  parent:string, 
  element:string, 
  multi:boolean
};

export class CreateIntegrationHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: CreateIntegrationHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],  
    private _availableScenarios: string[], 
    private _modularElementsWithParents: ModularElementObject[],
    private _packageTypes: string[],
    private _fieldValues: string[],
    private _stepFieldValues: string[],
    private _scenarioFieldValues: string[],
    private _existingScenarioFieldValues: string[],
    private _existingScenarioCheckboxValues: boolean[],
    private _createUpdateValue: string,
    private _multiFieldValues: {[details: string] : string;},
    private _nofPackages: string[],
    private _scenarioPackageTypes: string[][],
    private _moduleOptions: string[],
    private _stepOptions: string[],
    private _stepTypeOptions: string[],
    private _stepTypes: string[],
    private _stepMethodOptions: string[],
    private _stepMethods: string[],
    private _scenarioCustomFields: string[],
    private _existingScenarioCustomFields: string[]
    ) { }

  // METHODS
  public getHtml() {
    // define necessary extension Uris
    const toolkitUri    = this._uris[0];
    const codiconsUri   = this._uris[1];
    const mainUri       = this._uris[2];
    const styleUri      = this._uris[3];

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
      this._scenarioPackageTypes,
      this._scenarioCustomFields
    );

    let wrappedScenarioGrid: string = /*html*/ `
      <section class="rowsingle" id="scenariogrid">
        ${scenarioGrid.getHtml()}
      </section>
    `;

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
					  <h1>Create or update carrier integration</h1> 
          </section>
          <section id="farright">
            ${this._getCreateUpdateButton()}
          </section>
				</div>
        
        <section class="${this._modularElementsWithParents.length > 0 ? 'rowflex' : 'rowsingle'}">

          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">
                <h2>Carrier</h2>
                ${this._getCarrierGrid()}
              </div>
            </section> 
            
            <section  class="rowsingle">
              ${this._ifCreate(this._getStepsGrid())}
              ${this._ifUpdate(this._getExistingScenariosGrid())}
            </section>
          </section>

          ${this._modularElementsWithParents.length > 0 ? wrappedScenarioGrid : ''}
        </section>

			</body>
		</html>
	  `;

    return html;
  }

  private _ifCreate(content: string): string {
    let outString = '';
    if (this._createUpdateValue === 'create') {
      outString = content;
    }

    return outString;
  }

  private _ifUpdate(content: string): string {
    let outString = '';
    if (this._createUpdateValue === 'update') {
      outString = content;
    }

    return outString;
  }

  private _getCreateUpdateButton(): string {
    let createUpdateButton: string = /*html*/ `
      <vscode-button id="createintegration" appearance="primary" ${this._ifUpdate('style="background-color:green"')}>
        ${this._ifCreate('Create') + this._ifUpdate('Update')} integration
        <span slot="start" class="codicon ${this._ifCreate('codicon-add') + this._ifUpdate('codicon-arrow-right')}"></span>
      </vscode-button>
      
      <vscode-text-field id="createupdate" value="${this._createUpdateValue}" hidden></vscode-text-field>
      `;
    return createUpdateButton;
  }

  private _getCarrierGrid(): string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">
        <p>Folder structure:    <b>carrier / api-name / module</b></p>
        <vscode-text-field id="carriername" class="field" index="${carrierIndex}" ${valueString(this._fieldValues[carrierIndex])} placeholder="carrier" size="5"></vscode-text-field>
        /
        <vscode-text-field id="carrierapiname" class="field" index="${apiIndex}" ${valueString(this._fieldValues[apiIndex])} placeholder="api-name" size="5"></vscode-text-field>
        /
        <vscode-dropdown id="modulename" class="dropdown" index="${moduleIndex}" ${valueString(this._fieldValues[moduleIndex])} position="below">
          ${dropdownOptions(this._moduleOptions)}
        </vscode-dropdown>

        <section class="component-nomargin">
          <vscode-button id="checkintegrationexists" appearance="primary">
            Check
            <span slot="start" class="codicon codicon-refresh"></span>
          </vscode-button>
        </section>
      </section>

      ${this._ifCreate(this._getCarrierCodeField())}`;

    return carrierFolderStructureGrid;
  }

  private _getCarrierCodeField() : string {
    return /*html*/ `
    <section class="component-example">
      <p>SiS CarrierCode</p>
      <vscode-text-field id="carriercode" class="field" index="${carrierCodeIndex}" ${valueString(this._fieldValues[carrierCodeIndex])} placeholder="DPD"></vscode-text-field>
    </section>`;
  }

  private _getStepsGrid(): string {
    let stepsGrid = /*html*/ `
        <section class="component-container">
          <div class="component-sub-container">
            <h2>Steps</h2>

            <section class="component-example" hidden>
              <p>Number of steps</p>
              <vscode-dropdown id="nofsteps" class="dropdown" index="${nofStepsIndex}" ${valueString(this._fieldValues[nofStepsIndex])} position="below">
                ${dropdownOptions(arrayFrom1(10))}
              </vscode-dropdown>
            </section>

            ${this._stepInputs(+this._fieldValues[nofStepsIndex])}
          </div>
        </section>`;

    return stepsGrid;
  }

  private _getExistingScenariosGrid(): string {
    let existingScenariosGrid = /*html*/ `    
      <section class="component-container">
        <div class="component-sub-container">
          <h2>Existing scenarios</h2>
          <p>Check to run again</p>
          <section class="component-example">
            <vscode-checkbox id="checkallexisting" class="checkallexisting">Check all</vscode-checkbox>
          </section>
          ${this._existingScenarios()}
        </div>
      </section>`;

    return existingScenariosGrid;
  }

  private _stepInputs(nofSteps: number): string {
    let stepGrid: string = '';
    for (let step = 0; step < +nofSteps; step++) {

      // step name dropdown
      stepGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-dropdown id="stepname${step}" index="${step}" ${valueString(this._stepFieldValues[step])} class="stepdropdown" position="below">
            <vscode-option>${this._fieldValues[moduleIndex]}</vscode-option>
            ${dropdownOptions(this._stepOptions)}
          </vscode-dropdown>
        </section>
      `;


      // step type dropdown
      stepGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-dropdown id="steptype${step}" index="${step}" ${valueString(this._stepTypes[step])} class="steptypedropdown" position="below">
            ${dropdownOptions(this._stepTypeOptions)}
          </vscode-dropdown>
        </section>
      `;

      // step method dropdown
      stepGrid += /*html*/`
        <section class="component-nomargin">
          <vscode-dropdown id="stepmethod${step}" index="${step}" ${valueString(this._stepMethods[step])} class="stepmethoddropdown" ${disabledString(this._stepTypes[step] === 'http')} position="below">
            ${dropdownOptions(this._stepMethodOptions)}
          </vscode-dropdown>
        </section>
      `;
    }

    let html: string = /*html*/ `
      <section class="flexwrapper">
          <section class="grid3flex">
              <div>Name</div>
              <div>Type</div>
              <div>Method</div>
              ${stepGrid}
              <div class="flexwrapper">
                  ${getButton('removestep','-','','primary')}
                  ${getButton('addstep','+','','primary')}
              </div>
          </section>
      </section>
      `;

    return html;
  }

  private _getTagsFromArray(inArray:string[]) : string {
    let html: string = '';
    for (let index = 0; index < inArray.length; index++) {
      html += /*html*/ `<vscode-tag>${inArray[index]}</vscode-tag>`;
    }
    return html;
  }

  private _existingScenarios(): string {
    let html: string = ``;

    for (let index = 0; index < this._existingScenarioFieldValues.length; index++) {
      const modularOutline = 'style="outline:1px solid cyan"';
      let outlineString = isModular(this._existingScenarioFieldValues[index]) ? modularOutline : '';
      let checked = '';
      let disabledReadonly = 'disabled';
      if (this._existingScenarioCheckboxValues[index] === true) {
        checked = 'checked';
        disabledReadonly = 'readonly';
      }

      // add multipackage tags


      html += /*html*/`
        <section class="component-example nowrap baseline">
          <vscode-checkbox id="runexistingscenario${index}" class="existingscenariocheckbox" index="${index}" ${checked}></vscode-checkbox>
          <vscode-text-field id="existingscenario${index}" class="existingscenariofield" value="${this._existingScenarioFieldValues[index]}" hidden></vscode-text-field>
          <vscode-text-field id="existingscenariocustom${index}" class="existingscenariocustomfield" value="${this._existingScenarioCustomFields[index]}" ${outlineString} ${disabledReadonly}></vscode-text-field>
          ${this._getTagsFromArray(getPackageTypesFromStructure(this._existingScenarioFieldValues[index]))}
        </section>
      `;
    }

    return html;
  }

}