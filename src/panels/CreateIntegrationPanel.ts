import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getExtensionFile, startScript, cleanPath, parentPath, nth, dropdownOptions, arrayFrom1, toBoolean, isEmptyStringArray, arrayFrom0 } from "../utilities/functions";
import * as fs from 'fs';
import * as path from 'path';


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


export class CreateIntegrationPanel {
  // PROPERTIES
  public static currentPanel: CreateIntegrationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: String[] = [];
  private _stepFieldValues: String[] = [];
  private _scenarioFieldValues: String[] = [];
  private _existingScenarioFieldValues: String[] = [];
  private _existingScenarioCheckboxValues: boolean[] = [];
  private _createUpdateValue: String = 'create';      // pre-allocate with 'create'
  private _modularValue: boolean = false;             // pre-allocate with 'false'  

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    this._panel = panel;

    // predefine nofSteps, nofScenarios
    this._fieldValues[nofStepsIndex] = "1";
    this._fieldValues[nofScenariosIndex] = "1";

    // set content
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // set message listener
    this._setWebviewMessageListener(extensionUri, this._panel.webview, context);

    // set ondidchangeviewstate
    this._panel.onDidChangeViewState(e => {
      const panel = e.webviewPanel;
      let isVisible = panel.visible;

      if (isVisible) {
        this._updateWebview(extensionUri);
      }
    },
      null,
      context.subscriptions
    );

    // on dispose
    this._panel.onDidDispose(this.dispose, null, this._disposables);
  }

  // METHODS
  // initial rendering
  public static render(extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    if (CreateIntegrationPanel.currentPanel) {
      CreateIntegrationPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
    } else {
      const panel = vscode.window.createWebviewPanel("create-integration", "Create Integration", vscode.ViewColumn.Two, {
        enableScripts: true
      });

      CreateIntegrationPanel.currentPanel = new CreateIntegrationPanel(panel, extensionUri, nofSteps, context);
    }
  }

  // update number of step fields
  private _updateWebview(extensionUri: vscode.Uri) {
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
  }

  // message listener
  private _setWebviewMessageListener(extensionUri: vscode.Uri, webview: vscode.Webview, context: vscode.ExtensionContext) {
    // Pre-allocate terminal and terminalExists
    let terminal: vscode.Terminal;

    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {

          case 'refreshpanel':
            if (text === 'fromdropdown') {
              vscode.window.showInformationMessage(`Refreshed page due to dropdown update`);
            }
            this._updateWebview(extensionUri);
            break;

          case 'checkintegrationexists':
            this._checkIntegrationExists(extensionUri);
            break;

          case 'createintegration':
            if (this._createUpdateValue === 'create') {
              this._createIntegration(terminal, extensionUri);
            } else {
              this._updateIntegration(terminal, extensionUri);
            }

            break;

          case "savefieldvalue":
            let indexValue = message.text.split('|');
            this._fieldValues[indexValue[0]] = indexValue[1];
            break;

          case "savestepfieldvalue":
            let stepIndexValue = message.text.split('|');
            this._stepFieldValues[stepIndexValue[0]] = stepIndexValue[1];
            break;

          case "savescenariofieldvalue":
            let scenarioIndexValue = message.text.split('|');
            this._scenarioFieldValues[scenarioIndexValue[0]] = scenarioIndexValue[1];
            break;

          case "savecreateupdatevalue":
            this._createUpdateValue = text;
            this._updateWebview(extensionUri);
            break;

          case "savemodularvalue":
            this._modularValue = text;
            break;

          case "saveescheckboxvalue":
            let checkboxIndexValue = message.text.split('|');
            this._existingScenarioCheckboxValues[checkboxIndexValue[0]] = toBoolean(checkboxIndexValue[1]);
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private _checkIntegrationExists(extensionUri: vscode.Uri) {
    // getWorkspaceFile is async -> all following steps must be executed within the 'then'
    // start at scripts/functions.ps1, because unique
    getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {
      // get script path
      let scriptPath = this._getScriptPath(functionsPath);

      if (fs.existsSync(scriptPath)) {
        // set 'update' if integration path exists
        this._createUpdateValue = 'update';

        // load script content
        let scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // update modular value from script
        this._modularValue = this._getModularFromScript(scriptContent);

        // update existing scenario values from script
        this._existingScenarioFieldValues = this._getScenariosFromScript(scriptContent);

      } else {
        // integrationpath does not exist: 'create'
        this._createUpdateValue = 'create';
        this._existingScenarioFieldValues = [];
      }

      // clean existing scenario checkbox values upon clicking 'check' button
      this._existingScenarioCheckboxValues = [];

      // update panel
      this._updateWebview(extensionUri);
    });
  }

  private _createIntegration(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
    // getWorkspaceFile is async -> all following steps must be executed within the 'then'
    getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {

      // if script path already exists: show error and refresh form
      if (fs.existsSync(this._getScriptPath(functionsPath))) {
        vscode.window.showErrorMessage(`Cannot create: ${this._getScriptName()} already exists`);
        this._checkIntegrationExists(extensionUri);
        return;
      }

      // show info message
      vscode.window.showInformationMessage('Creating integration ' + this._getIntegrationName());

      // make integrationPath if not exists
      fs.mkdirSync(this._getCarrierPath(functionsPath), { recursive: true });

      // load integration script template file
      let templateContent = fs.readFileSync(this._getTemplatePath(functionsPath), 'utf8');

      // replace all values in template
      let newScriptContent = this._replaceInScriptTemplate(templateContent);

      // save to file
      fs.writeFileSync(this._getScriptPath(functionsPath), newScriptContent, 'utf8');

      // execute powershell
      this._runScript(terminal, functionsPath);

      // refresh window
      this._fieldValues[nofScenariosIndex] = "1";
      this._scenarioFieldValues = [];
      this._checkIntegrationExists(extensionUri);
    });
  }

  private _updateIntegration(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
    // getWorkspaceFile is async -> all following steps must be executed within the 'then'
    // start at scripts/functions.ps1, because unique
    getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {
      // get script path
      let scriptPath = this._getScriptPath(functionsPath);

      // if script path does not exist: show error and refresh form
      if (!fs.existsSync(scriptPath)) {
        vscode.window.showErrorMessage(`Cannot update: ${this._getScriptName()} does not exist`);
        this._checkIntegrationExists(extensionUri);
        return;
      }

      // show info message
      vscode.window.showInformationMessage('Updating integration ' + this._getIntegrationName());

      // load script content
      let scriptContent = fs.readFileSync(scriptPath, 'utf8');

      // replace scenarios in script content
      let newScriptContent: string = scriptContent.replace(/\$Scenarios = \@\([^\)]+\)/g, this._getScenariosString());

      // replace CreateOrUpdate value
      newScriptContent = newScriptContent.replace(/\$CreateOrUpdate = '[^']+'/g, '$CreateOrUpdate = \'update\'');

      // save to file
      fs.writeFileSync(scriptPath, newScriptContent, 'utf8');

      // execute powershell
      this._runScript(terminal, functionsPath);

      // refresh window
      this._fieldValues[nofScenariosIndex] = "1";
      this._scenarioFieldValues = [];
      this._checkIntegrationExists(extensionUri);
    });
  }

  private _runScript(terminal: vscode.Terminal, functionsPath: string) {
    // check if terminal exists and is still alive
    let terminalExists: boolean = (terminal && !(terminal.exitStatus));
    // open terminal if not yet exists
    if (!terminalExists) {
      terminal = startScript('', '');
    }

    // execute script
    terminal.sendText(`cd ${this._getCarrierPath(functionsPath)}`);
    terminal.sendText(`./${this._getScriptName()}`);
  }

  private _getScenariosString(): string {
    let newScenarioString = '';     // pre-allocate

    // add existing scenarios
    for (let index = 0; index < this._existingScenarioFieldValues.length; index++) {
      let commenting = '# ';
      if (this._existingScenarioCheckboxValues[index]) {
        commenting = '';
      }

      newScenarioString += '\n    ' + commenting + '"' + this._existingScenarioFieldValues[index] + '"';

      // check if comma is needed
      let remainingCheckboxes: boolean[] = this._existingScenarioCheckboxValues.slice(index + 1, this._existingScenarioCheckboxValues.length);
      if ((remainingCheckboxes.filter(el => el === true).length > 0) || !isEmptyStringArray(this._scenarioFieldValues)) {
        newScenarioString += ',';
      }
    }

    // add 'new' scenarios
    for (let index = 0; index < this._scenarioFieldValues.length; index++) {
      if (this._scenarioFieldValues[index] !== undefined && this._scenarioFieldValues[index] !== '') {
        newScenarioString += '\n    ' + '"' + this._scenarioFieldValues[index] + '"';

        // check if comma is needed
        let remainingFieldValues: String[] = this._scenarioFieldValues.slice(index + 1, this._scenarioFieldValues.length);
        if (!isEmptyStringArray(remainingFieldValues)) {
          newScenarioString += ',';
        }
      }
    }

    // add 'Scenarios'  label
    newScenarioString = '$Scenarios = @(' + newScenarioString + '\n )';

    return newScenarioString;
  }

  private _replaceInScriptTemplate(templateContent: string): string {
    // define initial outcome string
    let newScriptContent = templateContent;

    // replace fixed field values
    for (let index = 0; index < this._fieldValues.length; index++) {
      let replaceString = '[fieldValues' + index + ']';
      if (this._fieldValues[index] !== undefined) {
        newScriptContent = newScriptContent.replace(replaceString, this._fieldValues[index] + "");
      }
    }

    // createupdate
    newScriptContent = newScriptContent.replace('[createupdate]', this._createUpdateValue + "");

    // modular
    newScriptContent = newScriptContent.replace('[modular]', this._modularValue + "");

    // scenarios
    let scenariosString: string = '';
    for (let index = 0; index < this._scenarioFieldValues.length; index++) {
      if (this._scenarioFieldValues[index] !== undefined) {
        scenariosString += '\n    "' + this._scenarioFieldValues[index] + '"';
        if (index !== this._scenarioFieldValues.length - 1) {
          scenariosString += ',';
        }
      }
    }
    newScriptContent = newScriptContent.replace('[scenarios]', scenariosString);

    // steps fields: step name, testurls, produrls
    let nofSteps = this._fieldValues[nofStepsIndex];
    let stepsString: string = '';
    let testUrlsString: string = '';
    let prodUrlsString: string = '';
    for (let index = 0; index < +nofSteps; index++) {
      let step: string = this._stepFieldValues[index] + '';
      // steps
      stepsString += '\n    "' + step + '"';
      if (index !== +nofSteps - 1) {
        stepsString += ',';
      }
      // testurls
      if (this._stepFieldValues[index + 10] !== undefined) {
        testUrlsString += '\n    ' + step.toUpperCase() + '_CARRIERTESTENDPOINT = "' + this._stepFieldValues[index + 10] + '"';
      }
      // produrls
      if (this._stepFieldValues[index + 20] !== undefined) {
        prodUrlsString += '\n    ' + step.toUpperCase() + '_CARRIERPRODUCTIONENDPOINT = "' + this._stepFieldValues[index + 20] + '"';
      }
    }
    // replace
    newScriptContent = newScriptContent.replace('[steps]', stepsString);
    newScriptContent = newScriptContent.replace('[testurls]', testUrlsString);
    newScriptContent = newScriptContent.replace('[produrls]', prodUrlsString);

    // return script content
    return newScriptContent;
  }

  private _getScriptName(): string {
    return 'create-integration-' + this._fieldValues[carrierIndex] + '-' + this._fieldValues[apiIndex] + '-' + this._fieldValues[moduleIndex] + '.ps1';
  }

  private _getIntegrationName(): string {
    return this._fieldValues[carrierIndex] + '/' + this._fieldValues[apiIndex] + '/' + this._fieldValues[moduleIndex];
  }

  private _getScriptPath(functionsPath: string): string {
    let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
    return filesPath + '/carriers/' + this._fieldValues[carrierIndex] + '/' + this._getScriptName();
  }

  private _getTemplatePath(functionsPath: string): string {
    let scriptsPath: string = parentPath(cleanPath(functionsPath));
    return scriptsPath + '/templates/create-module-integration-template.ps1';
  }

  private _getCarrierPath(functionsPath: string): string {
    let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
    return filesPath + '/carriers/' + this._fieldValues[carrierIndex];
  }

  private _getModularFromScript(scriptContent: string): boolean {
    let isModular: boolean = false;

    // extract modular value from ps script content using regex
    let rawModular: string[] = scriptContent.match(/\$ModularXMLs\s+=\s+\$(\S+)/) ?? [''];
    if (rawModular.length >= 2) {
      let modularString: string = rawModular[1];
      if (modularString.toLowerCase() === 'true') {
        isModular = true;
      }
    }

    return isModular;
  }

  private _getScenariosFromScript(scriptContent: string): string[] {
    // extract scenarios from script content using regex
    let scenarioString = scriptContent.match(/\$Scenarios = \@\(([^\)]+)/) ?? '';
    let rawScenarios: string[] = [];
    if (scenarioString.length >= 2) {
      rawScenarios = scenarioString[1].split('\n');
    }

    // clean up raw scenarios and write to new array
    let scenarios: string[] = [];
    for (let index = 0; index < rawScenarios.length; index++) {
      scenarios[index] = rawScenarios[index].replace(/"/g, '').replace(/,/g, '').replace(/#/g, '').trim();
    }

    // filter out empty values
    scenarios = scenarios.filter(function (element) {
      return ((element !== null) && ("" + element !== ""));
    });

    return scenarios;
  }

  // make additional html for step fields
  private _stepInputs(nofSteps: number): string {
    let html: string = ``;

    for (let step = 0; step < +nofSteps; step++) {
      // set html string addition
      let subhtml: string = /*html*/`
        <section class="component-example">
          <p>${(step + 1) + nth(step + 1)} step</p>
          <vscode-dropdown id="stepname${step}" indexstep="${step}" ${this._valueString(this._stepFieldValues[step])} class="stepdropdown" position="below">
            <vscode-option>${(this._fieldValues[moduleIndex] ?? 'booking')}</vscode-option>
            <vscode-option>label</vscode-option>
            <vscode-option>login</vscode-option>
            <vscode-option>get_token</vscode-option>
            <vscode-option>save_token</vscode-option>
            <vscode-option>other</vscode-option>
          </vscode-dropdown>
          <vscode-text-field id="testurl${step}" indexstep="${step + 10}" ${this._valueString(this._stepFieldValues[step+10])} class="stepfield" placeholder="https://test-dpd.com/booking"></vscode-text-field>
          <vscode-text-field id="produrl${step}" indexstep="${step + 20}" ${this._valueString(this._stepFieldValues[step+20])} class="stepfield" placeholder="https://prod-dpd.com/booking"></vscode-text-field>
        </section>
      `;

      // replace nth <vscode-option> occurrence to pre-set different selected for each step 
      // BUT: only if not already set in _stepFieldValues
      if (this._stepFieldValues[step] === undefined) {
        // from https://stackoverflow.com/a/44568739/1716283
        let t: number = 0;
        subhtml = subhtml.replace(/<vscode-option>/g, match => ++t === (step + 1) ? '<vscode-option selected>' : match);
      }

      // add to output
      html += subhtml;
    }

    return html;
  }

  private _scenarioInputs(nofScenarios: number): string {
    let html: string = ``;

    for (let scenario = 0; scenario < +nofScenarios; scenario++) {
      html += /*html*/`
        <section class="component-example">
          <vscode-text-field id="scenario${scenario}" size="30" indexscenario="${scenario}" ${this._valueString(this._scenarioFieldValues[scenario])} class="scenariofield" placeholder="${(scenario + 1) + nth(scenario + 1)} scenario name..."></vscode-text-field>
        </section>
      `;
    }

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
          <vscode-text-field id="existingscenario${index}" size="40" class="existingscenariofield" value="${this._existingScenarioFieldValues[index]}" ${disabledReadonly}></vscode-text-field>
        </section>
      `;
    }

    return html;
  }

  private _ifCreate(content: string): string {
    let outString = '';
    if (this._createUpdateValue === 'create') {
      outString = content;
    }

    return outString;
  }

  private _checkedString(checked: boolean): string {
    let outString: string = '';
    if (checked) {
      outString = 'checked';
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

  private _cropFlexFields() {
    // crop steps array
    let newStepFieldValues: String[] = [];
    for (let index = 0; index < +this._fieldValues[nofStepsIndex]; index++) {
      // stepname
      if (this._stepFieldValues[index] !== undefined) {
        newStepFieldValues[index] = this._stepFieldValues[index];
      }

      // testurl
      if (this._stepFieldValues[index + 10] !== undefined) {
        newStepFieldValues[index + 10] = this._stepFieldValues[index + 10];
      }

      // produrl
      if (this._stepFieldValues[index + 20] !== undefined) {
        newStepFieldValues[index + 20] = this._stepFieldValues[index + 20];
      }
    }
    this._stepFieldValues = newStepFieldValues;

    // crop scenarios array
    this._scenarioFieldValues = this._scenarioFieldValues.slice(0, +this._fieldValues[nofScenariosIndex]);
  }

  private _valueString(string:(string | String)) : string {
    let outString = '';
    if (string !== undefined && string !== "") {
      outString = `value="${string}"`;
    }
    return outString;
  }

  private _getCarrierFolderStructureGrid() : string {
    let carrierFolderStructureGrid = /*html*/ `
      <section class="component-example">
        <p>Folder structure:    <b>carrier / api-name / module</b></p>
        <vscode-text-field id="carriername" class="field" index="${carrierIndex}" ${this._valueString(this._fieldValues[carrierIndex])} placeholder="carrier" size="5"></vscode-text-field>
        /
        <vscode-text-field id="carrierapiname" class="field" index="${apiIndex}" ${this._valueString(this._fieldValues[apiIndex])} placeholder="api-name" size="5"></vscode-text-field>
        /
        <vscode-dropdown id="modulename" class="dropdown" index="${moduleIndex}" ${this._valueString(this._fieldValues[moduleIndex])} position="below">
          ${dropdownOptions(['booking', 'tracking', 'cancel', 'pickup', 'pickup_cancel'])}
        </vscode-dropdown>

        <section class="component-example">
          <vscode-button id="checkintegrationexists" appearance="primary">Check</vscode-button>
        </section>
      </section>`;

    return carrierFolderStructureGrid;
  }


  private _getCarrierDetailsGrid() : string {
    let carrierDetailsGrid = /*html*/ `
      <section class="component-subrow">
        <section class="component-example">
          <h4>Carrier details</h4>
          <section class="component-example">
            <vscode-text-field id="carriercode" class="field" index="${carrierCodeIndex}" ${this._valueString(this._fieldValues[carrierCodeIndex])} placeholder="DPD">SiS CarrierCode</vscode-text-field>
          </section>

          <section class="component-example">
            <vscode-text-field id="carrierapidescription" class="field" index="${apiDescriptionIndex}" ${this._valueString(this._fieldValues[apiDescriptionIndex])} placeholder="DPD NL Webservice">Carrier API description</vscode-text-field>
          </section>
        </section>

        <section class="component-example">
          <h4>Carrier TST credentials</h4>
          <section class="component-example">
            <vscode-text-field id="testuser" class="field" index="${carrierUserIndex}" ${this._valueString(this._fieldValues[carrierUserIndex])} placeholder="DPDTstUser">User</vscode-text-field>
          </section>

          <section class="component-example">
            <vscode-text-field id="testpwd" class="field" index="${carrierPwdIndex}" ${this._valueString(this._fieldValues[carrierPwdIndex])} placeholder="aslfjakl">Pwd</vscode-text-field>
          </section>
        </section>
      </section>`;

      return carrierDetailsGrid;
  }

  private _getStepsGrid() : string {
    let stepsGrid = /*html*/ `
      <section  class="component-grid">
        <section class="component-container">
          <h2>Steps</h2>

          <section class="component-example">
            <p>Number of steps</p>
            <vscode-dropdown id="nofsteps" class="dropdown" index="${nofStepsIndex}" ${this._valueString(this._fieldValues[nofStepsIndex])} position="below">
              ${dropdownOptions(arrayFrom1(10))}
            </vscode-dropdown>
          </section>

          <section class="component-example">
            <h3>Step fields: <b>name / carrier TEST url / carrier PROD url</b></h3>
          </section>

          ${this._stepInputs(+this._fieldValues[nofStepsIndex])}
        </section>
      </section>`;

    return stepsGrid;
  }

  private _getScenariosGrid() : string {
    let scenariosGrid = /*html*/ `    
      <section class="component-container">
        <h2>Scenarios</h2>

        <section class="component-example">
          <vscode-checkbox id="modular" ${this._checkedString(this._modularValue)} ${this._ifUpdate('readonly')}>Modular</vscode-checkbox>
        </section>

        <section class="component-example">
          <p>Number of Scenarios</p>
          <vscode-dropdown id="nofscenarios" class="dropdown" index="${nofScenariosIndex}" ${this._valueString(this._fieldValues[nofScenariosIndex])} position="below">
            ${dropdownOptions(arrayFrom1(100))}
          </vscode-dropdown>
        </section>

        ${this._scenarioInputs(+this._fieldValues[nofScenariosIndex])}
      </section>`;

      return scenariosGrid;
  }

  private _getExistingScenariosGrid() : string {
    let existingScenariosGrid = /*html*/ `    
      <section class="component-container">
        <h2>Existing scenarios</h2>
        <p>Check to run again</p>
        ${this._existingScenarios()}
      </section>`;

    return existingScenariosGrid;
  }

  private _getCreateUpdateGrid() : string {
    let createUpdateGrid = /*html*/ `
      <section class="component-container">
        <h2>Execute</h2>

        <section class="component-example">
          <vscode-radio-group id="createupdate" readonly>
            <label slot="label">Create/update</label>
            <vscode-radio name="createupdate" value="create">Create</vscode-radio>
            <vscode-radio name="createupdate" value="update">Update</vscode-radio>
          </vscode-radio-group>
        </section>

        <section class="component-example">
          <vscode-button id="createintegration" appearance="primary" ${this._ifUpdate('style="background-color:green"')}>${this._ifCreate('Create') + this._ifUpdate('Update')} integration</vscode-button>
        </section>
      </section>`;

    return createUpdateGrid;
  }

  // determine content
  private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const mainUri = getUri(webview, extensionUri, ["panels", "createintegration", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["panels", "createintegration", "style.css"]);

    // crop flexible field arrays
    this._cropFlexFields();    

    // define panel HTML
    let html =  /*html*/`
		<!DOCTYPE html>
		<html>
			<head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <script type="module" src="${mainUri}"></script>
				<link href="${styleUri}" rel="stylesheet" /> 
			</head>
			<body>

				<div>
					<h1>Create module integration</h1>
				</div>
        <section class="component-row">

          <section class="component-example">
            <section class="component-row">
              <section class="component-container">
                <h2>Carrier</h2>
                ${this._getCarrierFolderStructureGrid()}
                ${this._ifCreate(this._getCarrierDetailsGrid())}
              </section>
              ${this._getCreateUpdateGrid()}
            </section>   
            ${this._ifCreate(this._getStepsGrid())}
          </section>

          <section class="component-grid">
            ${this._getScenariosGrid()}
            ${this._ifUpdate(this._getExistingScenariosGrid())}
          </section>
        </section>

			</body>
		</html>
	  `;

    // update createupdate radio group value
    let createString: string = 'name="createupdate" value="create"';
    let updateString: string = 'name="createupdate" value="update"';
    if (this._createUpdateValue === 'update') {
      html = html.replace(updateString, updateString + ' checked');
    } else {
      html = html.replace(createString, createString + ' checked');
    }

    return html;
  }

  // dispose
  public dispose() {
    CreateIntegrationPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}