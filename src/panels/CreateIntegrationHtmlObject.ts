import * as vscode from "vscode";
import { getUri, valueString, checkedString, hiddenString, dropdownOptions, arrayFrom1, toBoolean } from "../utilities/functions";
import { ScenarioGridObject } from "../utilities/ScenarioGridObject";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const carrierCodeIndex = 3;
const apiDescriptionIndex = 4;
const nofStepsIndex = 5;
const nofScenariosIndex = 6;
const carrierUserIndex = 7;
const carrierPwdIndex = 8;

export class CreateIntegrationHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: CreateIntegrationHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[],  
    private _availableScenarios: string[], 
    private _modularElementsWithParents: {parent:string, element:string, multi:boolean}[],
    private _fieldValues: string[],
    private _stepFieldValues: string[],
    private _otherStepValues: string[],
    private _scenarioFieldValues: string[],
    private _existingScenarioFieldValues: string[],
    private _existingScenarioCheckboxValues: boolean[],
    private _createUpdateValue: string,
    private _modularValue: boolean,
    private _multiFieldValues: {[details: string] : string;},
    private _nofPackages: string[]
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
      this._scenarioFieldValues, 
      this._modularValue, 
      +this._fieldValues[nofScenariosIndex], 
      nofScenariosIndex,
      this._multiFieldValues,
      this._nofPackages
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
					  <h1>Create or update carrier integration</h1> 
          </section>
          <section id="farright">
            ${this._getCreateUpdateButton()}
          </section>
				</div>
        
        <section class="rowflex">

          <section class="rowsingle">
            <section class="component-container">
              <div class="component-sub-container">
                <h2>Carrier</h2>
                ${this._getCarrierFolderStructureGrid()}
                ${this._ifCreate(this._getCarrierDetailsGrid())}
              </div>
            </section> 
            
            <section  class="rowsingle">
              ${this._ifCreate(this._getStepsGrid())}
            </section>
          </section>

          <section class="rowsingle">
            ${scenarioGrid.getHtml()}
            ${this._ifUpdate(this._getExistingScenariosGrid())}
          </section>
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

  private _isOther(string: string): boolean {
    let isOther: boolean = false;
    if ((string + "").toLowerCase() === 'other') {
      isOther = true;
    }

    return isOther;
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

  private _getCarrierFolderStructureGrid(): string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">
        <p>Folder structure:    <b>carrier / api-name / module</b></p>
        <vscode-text-field id="carriername" class="field" index="${carrierIndex}" ${valueString(this._fieldValues[carrierIndex])} placeholder="carrier" size="5"></vscode-text-field>
        /
        <vscode-text-field id="carrierapiname" class="field" index="${apiIndex}" ${valueString(this._fieldValues[apiIndex])} placeholder="api-name" size="5"></vscode-text-field>
        /
        <vscode-dropdown id="modulename" class="dropdown" index="${moduleIndex}" ${valueString(this._fieldValues[moduleIndex])} position="below">
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

  private _getCarrierDetailsGrid(): string {
    let carrierDetailsGrid = /*html*/ `
      <section class="row11">
        <section class="rowelement">
          <h4>Carrier details</h4>
          <section class="component-example">
            <vscode-text-field id="carriercode" class="field" index="${carrierCodeIndex}" ${valueString(this._fieldValues[carrierCodeIndex])} placeholder="DPD">SiS CarrierCode</vscode-text-field>
          </section>

          <section class="component-example">
            <vscode-text-field id="carrierapidescription" class="field" index="${apiDescriptionIndex}" ${valueString(this._fieldValues[apiDescriptionIndex])} placeholder="DPD NL Webservice">Carrier API description</vscode-text-field>
          </section>
        </section>

        <section class="rowelement">
          <h4>Carrier TST credentials</h4>
          <section class="component-example">
            <vscode-text-field id="testuser" class="field" index="${carrierUserIndex}" ${valueString(this._fieldValues[carrierUserIndex])} placeholder="DPDTstUser">User</vscode-text-field>
          </section>

          <section class="component-example">
            <vscode-text-field id="testpwd" class="field" index="${carrierPwdIndex}" ${valueString(this._fieldValues[carrierPwdIndex])} placeholder="aslfjakl">Pwd</vscode-text-field>
          </section>
        </section>
      </section>`;

    return carrierDetailsGrid;
  }

  private _getStepsGrid(): string {
    let stepsGrid = /*html*/ `
        <section class="component-container">
          <div class="component-sub-container">
            <h2>Steps</h2>

            <section class="component-example">
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

    let subStepNames: string = '';
    let subTestUrl: string = '';
    let subProdUrl: string = '';
    for (let step = 0; step < +nofSteps; step++) {
      let thisStepFieldValue = this._stepFieldValues[step];
      let isOther: boolean = this._isOther(thisStepFieldValue);

      // set html string addition
      let subStepNamesCurrent = /*html*/`
        <section class="component-example">
          <vscode-dropdown id="stepname${step}" indexstep="${step}" ${valueString(this._stepFieldValues[step])} class="stepdropdown" position="below">
            <vscode-option>${(this._fieldValues[moduleIndex] ?? 'booking')}</vscode-option>
            <vscode-option>label</vscode-option>
            <vscode-option>login</vscode-option>
            <vscode-option>get_token</vscode-option>
            <vscode-option>save_token</vscode-option>
            <vscode-option>other</vscode-option>
          </vscode-dropdown>

          <vscode-text-field id="otherstepname${step}" indexotherstep="${step}" ${valueString(this._otherStepValues[step])} class="otherstepfield" placeholder="step" ${hiddenString(isOther)}></vscode-text-field>
        </section>
      `;

      // replace nth <vscode-option> occurrence to pre-set different selected for each step 
      // BUT: only if not already set in _stepFieldValues
      if (this._stepFieldValues[step] === undefined) {
        // from https://stackoverflow.com/a/44568739/1716283
        let t: number = 0;
        subStepNamesCurrent = subStepNamesCurrent.replace(/<vscode-option>/g, match => ++t === (step + 1) ? '<vscode-option selected>' : match);
      }

      subStepNames += subStepNamesCurrent;

      subTestUrl += /*html*/ `
        <section class="component-example">
          <vscode-text-field id="testurl${step}" indexstep="${step + 10}" ${valueString(this._stepFieldValues[step + 10])} class="stepfield" placeholder="https://test-dpd.com/booking"></vscode-text-field>
        </section>`;

      subProdUrl += /*html*/ `
        <section class="component-example">
          <vscode-text-field id="produrl${step}" indexstep="${step + 20}" ${valueString(this._stepFieldValues[step + 20])} class="stepfield" placeholder="https://prod-dpd.com/booking"></vscode-text-field>
        </section>`;
    }

    let html: string = /*html*/ `
      <section class="component-example">
        <section class="floatleftnopadding">
          <p>step name</p>
          ${subStepNames}
        </section>
        <section class="floatleftnopadding">
          <p>test url</p>
          ${subTestUrl}
        </section>
        <section class="floatleftnopadding">
          <p>prod url</p>
          ${subProdUrl}
        </section>
      </section>`;

    return html;
  }

  private _existingScenarios(): string {
    let html: string = ``;

    for (let index = 0; index < this._existingScenarioFieldValues.length; index++) {
      let checked = '';
      let disabledReadonly = 'disabled';
      if (this._existingScenarioCheckboxValues[index] === true) {
        checked = 'checked';
        disabledReadonly = 'readonly';
      }

      html += /*html*/`
        <section class="component-example">
          <vscode-checkbox id="runexistingscenario${index}" class="existingscenariocheckbox" indexescheckbox="${index}" ${checked}></vscode-checkbox>
          <vscode-text-field id="existingscenario${index}" class="existingscenariofield" value="${this._existingScenarioFieldValues[index]}" ${disabledReadonly}></vscode-text-field>
        </section>
      `;
    }

    return html;
  }

}