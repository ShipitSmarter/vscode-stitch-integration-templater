import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, toBoolean, isEmptyStringArray, isEmpty, getAvailableIntegrations, getModularElements, getModularElementsWithParents, getAvailableScenarios, getFromScript} from "../utilities/functions";
import * as fs from 'fs';
import { CreateIntegrationHtmlObject } from "./CreateIntegrationHtmlObject";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const carrierCodeIndex = 3;
const nofStepsIndex = 5;
const nofScenariosIndex = 6;

export class CreateIntegrationPanel {
  // PROPERTIES
  public static currentPanel: CreateIntegrationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];
  private _stepFieldValues: string[] = [];
  private _scenarioFieldValues: string[] = [];
  private _existingScenarioFieldValues: string[] = [];
  private _existingScenarioCheckboxValues: boolean[] = [];
  private _createUpdateValue: string = 'create';      // pre-allocate with 'create'
  private _modularValue: boolean = false;             // pre-allocate with 'false'  
  private _integrationObjects:      {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:string[]}[] = [];
  private _emptyIntegrationObject : {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:string[]} = {path: '', carrier: '', api: '', module: '', carriercode: '', modular: false, scenarios: [], validscenarios:[]};
  private _currentIntegration :     {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:string[]} = this._emptyIntegrationObject;
  private _availableScenarios: string[] = [];
  private _modularElementsWithParents: {parent:string, element:string, multi:boolean}[] = [];
  private _functionsPath: string = '';
  private _multiFieldValues: {[details: string] : string;} = {};
  private _nofPackages: string[] = [];
  private _moduleOptions: string[] = [];
  private _stepOptions: string[] = [];
  private _stepTypeOptions: string[] = [];
  private _stepTypes: string[] = [];
  private _stepMethodOptions: string[] = [];
  private _stepMethods: string[] = [];
  private _scenarioCustomFields: string[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    this._panel = panel;

    // predefine some fixed fields
    this._fieldValues[moduleIndex] = 'booking';
    this._fieldValues[nofStepsIndex] = "1";
    this._fieldValues[nofScenariosIndex] = "1";
    this._stepFieldValues[0] = this._fieldValues[moduleIndex];

    // set content
    this._getWebviewContent(this._panel.webview, extensionUri).then(html => this._panel.webview.html = html);

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
      CreateIntegrationPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("create-integration", "Create or update carrier integration", vscode.ViewColumn.One, {
        enableScripts: true
      });

      CreateIntegrationPanel.currentPanel = new CreateIntegrationPanel(panel, extensionUri, nofSteps, context);
    }
  }

  // update number of step fields
  private _updateWebview(extensionUri: vscode.Uri) {
    this._getWebviewContent(this._panel.webview, extensionUri).then(html => this._panel.webview.html = html);
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

          case 'showerrormessage':
            vscode.window.showErrorMessage(text);
            break;

          case 'showinformationmessage':
            vscode.window.showInformationMessage(text);
            break;

          case 'clearscenarios':
            this._scenarioFieldValues = [];
            break;

          case "savemultivalue":
            // extract
            var idIndexValue = text.split('|');
            var id = idIndexValue[0];
            var index = +idIndexValue[1];
            var value = idIndexValue[2];

            // save
            this._multiFieldValues[id] = value;
            
            break;
          case "savevalue":
            var classIndexValue = text.split('|');
            var index = +classIndexValue[1];
            var value = classIndexValue[2];
            switch (classIndexValue[0]) {
              case 'dropdown':
                this._fieldValues[index] = value;
                switch (index) {
                  case nofStepsIndex :
                    for (let ii = 0; ii < value; ii++) {
                      // pre-fill empty step names
                      if (!this._stepFieldValues[ii]) {
                        this._stepFieldValues[ii] = [this._fieldValues[carrierIndex]].concat(this._stepOptions)[ii % (this._stepOptions.length + 1)];
                      }

                      // pre-fill empty step types
                      if (!this._stepTypes[ii]) {
                        this._stepTypes[ii] = this._stepTypeOptions[0];
                      }

                      // pre-fill empty step methods
                      if (!this._stepMethods[ii]) {
                        this._stepMethods[ii] = this._stepMethodOptions[0];
                      }
                    }
                    break;
                }
                this._updateWebview(extensionUri);
                break;
              case 'field':
                this._fieldValues[index] = value;
                break;
              case 'stepdropdown':
                this._stepFieldValues[index] = value;
                //this._updateWebview(extensionUri);
                break;
              case 'steptypedropdown':
                this._stepTypes[index] = value;
                this._updateWebview(extensionUri);
                break;
              case 'stepmethoddropdown':
                this._stepMethods[index] = value;
                //this._updateWebview(extensionUri);
                break;
              case 'scenariofield':
                this._scenarioFieldValues[index] = value;
                break;
              case 'scenariocustomfield':
                this._scenarioCustomFields[index] = value;
                break;
              case 'existingscenariocheckbox':
                this._existingScenarioCheckboxValues[index] = toBoolean(value);
                break;
              case 'modular':
                this._modularValue = toBoolean(value);
                this._scenarioFieldValues = [];
                this._updateWebview(extensionUri);
                break;
              case 'nofpackagesdropdown':
                this._nofPackages[index] = value;
                break;
            }
        }
      },
      undefined,
      this._disposables
    );
  }

  private _getIntegrationObject() : {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:string[]} {
    return this._integrationObjects.filter(el => this._fieldValues[carrierIndex] === el.carrier && this._fieldValues[apiIndex] === el.api  && this._fieldValues[moduleIndex] === el.module)[0] ?? this._emptyIntegrationObject;
  }

  private async _checkIntegrationExists(extensionUri: vscode.Uri) {
    // refresh integration object presence (in case deletes)
    this._integrationObjects = this._integrationObjects.filter(el => fs.existsSync(el.path));

    // get current integration
    this._currentIntegration = this._getIntegrationObject();

    // if current integration is not empty: exists -> 'update'
    if (this._currentIntegration !== this._emptyIntegrationObject) {
      // set 'update' if integration path exists
      this._createUpdateValue = 'update';

      // update valid existing scenario values from scenario folder instead
      this._existingScenarioFieldValues = this._currentIntegration.validscenarios;

    } else {
      // integrationpath does not exist: 'create'
      this._createUpdateValue = 'create';
      this._existingScenarioFieldValues = [];
    }

    // clean existing scenario checkbox values upon clicking 'check' button
    this._existingScenarioCheckboxValues = [];

    // refresh available scenarios and module elements
    if (this._modularValue) {
      this._modularElementsWithParents  = await getModularElementsWithParents(this._fieldValues[moduleIndex]);
    } else {
      this._availableScenarios = await getAvailableScenarios(this._fieldValues[moduleIndex]);
    }

    // update dropdown options
    await this._getModuleOptions();
    await this._getStepOptions();
    await this._getStepTypeOptions();
    await this._getStepMethodOptions();

    // update panel
    this._updateWebview(extensionUri);
  }

  private _createIntegration(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
      // get current integration
      this._currentIntegration = this._getIntegrationObject();

      // if current integration is not empty: 'update' -> show error and refresh form
      if (this._currentIntegration !== this._emptyIntegrationObject) {
        vscode.window.showErrorMessage(`Cannot create: integration ${this._getIntegrationName()} already exists`);
        this._checkIntegrationExists(extensionUri);
        return;
      }

      // show info message
      vscode.window.showInformationMessage('Creating integration ' + this._getIntegrationName());

      // make integrationPath if not exists
      fs.mkdirSync(this._getCarrierPath(this._functionsPath), { recursive: true });

      // load integration script template file
      let templateContent = fs.readFileSync(this._getTemplatePath(this._functionsPath), 'utf8');

      // replace all values in template
      let newScriptContent = this._replaceInScriptTemplate(templateContent);

      // save to file
      fs.writeFileSync(this._getScriptPath(this._functionsPath), newScriptContent, 'utf8');

      // execute powershell
      this._runScript(terminal, this._functionsPath);

      // update integration objects
      let scenarios : string[] = this._getNewScenarios();
      this._currentIntegration = {
        path: this._getScriptPath(this._functionsPath), 
        carrier: this._fieldValues[carrierIndex], 
        api: this._fieldValues[apiIndex], 
        module: this._fieldValues[moduleIndex], 
        carriercode: this._fieldValues[carrierCodeIndex], 
        modular: this._modularValue, 
        scenarios: scenarios, 
        validscenarios: scenarios
      };
      this._integrationObjects.push(this._currentIntegration);

      // refresh window
      this._fieldValues[nofScenariosIndex] = "1";
      this._scenarioFieldValues = [];
      this._checkIntegrationExists(extensionUri);
  }

  private _updateIntegration(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
      // get current integration
      this._currentIntegration = this._getIntegrationObject();

      // if current integration is empty: 'create' -> show error and refresh form
      if (this._currentIntegration === this._emptyIntegrationObject) {
        vscode.window.showErrorMessage(`Cannot update: integration ${this._getIntegrationName()} does not exist`);
        this._checkIntegrationExists(extensionUri);
        return;
      }

      // show info message
      vscode.window.showInformationMessage('Updating integration ' + this._getIntegrationName());

      // load script content
      let scriptContent = fs.readFileSync(this._currentIntegration.path, 'utf8');

      // replace scenarios in script content
      let newScriptContent: string = scriptContent.replace(/\$Scenarios = \@\([^\)]+\)/g, this._getScenariosString());

      // replace CreateOrUpdate value
      newScriptContent = newScriptContent.replace(/\$CreateOrUpdate = '[^']+'/g, '$CreateOrUpdate = \'update\'');

      // replace New-UpdateIntegration function call -> should be last line from template
      let templateContent = fs.readFileSync(this._getTemplatePath(this._functionsPath), 'utf8');
      let newNewUpdateIntegration = (templateContent.match(/\r?\n[^\r\n]*\s*$/) ?? [''])[0].trim();
      newScriptContent = newScriptContent.replace(/New-UpdateIntegration\s[\S\s]+$/g,newNewUpdateIntegration);

      // remove modular value if present
      newScriptContent = newScriptContent.replace(/\$ModularXMLs[^\r\n]+[\r\n]/g, '');

      // save to file
      let newScriptPath:string = parentPath(cleanPath(this._currentIntegration.path)) + '/' + this._getScriptName();
      fs.writeFileSync(newScriptPath, newScriptContent, 'utf8');

      // if new script path not equal to previous script path: delete old script file
      if (newScriptPath !== this._currentIntegration.path) {
        fs.rmSync(this._currentIntegration.path);
      }

      // execute powershell
      this._runScript(terminal, this._functionsPath);

      // update integration objects
      let newScenarios : string[] = this._getNewScenarios();
      let intIndex : number = this._integrationObjects.findIndex(el => el.path === this._currentIntegration.path);
      this._currentIntegration.path = newScriptPath;
      this._currentIntegration.scenarios = this._currentIntegration.scenarios.concat(newScenarios).sort();
      this._currentIntegration.validscenarios = this._currentIntegration.validscenarios.concat(newScenarios).sort();
      this._integrationObjects[intIndex] = this._currentIntegration;

      // refresh window
      this._fieldValues[nofScenariosIndex] = "1";
      this._scenarioFieldValues = [];
      this._checkIntegrationExists(extensionUri);
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

  private _getNewScenarioValue(fieldValue:string) : string {
    let newScenarioValue = '';
    if (!isEmpty(fieldValue)) {
      newScenarioValue = fieldValue.replace(/[^\>]+\> /g, '');
    }
    return newScenarioValue;
  }

  private _getNewScenarios() : string[] {
    return this._scenarioFieldValues.map( el => this._getNewScenarioValue(el)).filter(el => !isEmpty(el)).sort();
  }

  private _getScenariosString(): string {
    let scenariosString = '';     // pre-allocate

    // pre-allocate scenario object array
    let scenarioObjectArray : {execute: boolean, name: string}[] = [];

    // add existing scenarios (if 'update')
    if (this._createUpdateValue === 'update') {
      for (let index = 0; index < this._existingScenarioFieldValues.length; index++) {
        scenarioObjectArray.push( {
          execute: this._existingScenarioCheckboxValues[index],
          name: this._existingScenarioFieldValues[index]
        });
      }
    }

    // add new scenarios
    let newScenarios : string[] = this._getNewScenarios();
    for (const scenario of newScenarios) {
      scenarioObjectArray.push( {
        execute: true,
        name: scenario
      });
    }

    // sort
    scenarioObjectArray.sort((a, b) => (a.name > b.name) ? 1 : -1);

    // build scenario string
    for (let index = 0; index < scenarioObjectArray.length; index++) {
      let scenarioObject = scenarioObjectArray[index];
      scenariosString += '\n    ' + (scenarioObject.execute ? '' : '#') + '"' + scenarioObject.name + '"'; 

      // check if comma is needed
      let remaining : boolean[] = scenarioObjectArray.slice(index+1, scenarioObjectArray.length).map( x => x.execute);
      if (remaining.includes(true)) {
        scenariosString += ',';
      }
    }

    // add 'Scenarios'  label
    scenariosString = '$Scenarios = @(' + scenariosString + '\n )';

    return scenariosString;
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
    // newScriptContent = newScriptContent.replace('[modular]', this._modularValue + "");

    // scenarios
    newScriptContent = newScriptContent.replace(/\$Scenarios = \@\([^\)]+\)/g, this._getScenariosString());

    // steps fields: step name
    let nofSteps = this._fieldValues[nofStepsIndex];
    let stepsString: string = '';
    for (let index = 0; index < +nofSteps; index++) {
      let step: string = this._stepFieldValues[index] + '';
      let type: string = this._stepTypes[index] + '';
      let method: string = this._stepMethods[index] + '';
      let methodString = (type === 'http') ? ('-' + method) : '';

      // steps
      stepsString += '\n    "' + step + ':' + type + methodString + '"';
      if (index !== +nofSteps - 1) {
        stepsString += ',';
      }
    }
    // replace
    newScriptContent = newScriptContent.replace('[steps]', stepsString);

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

  private async _getModuleOptions() {
    // get module dropdown options from txt file
    let moduleOptionsPath = await getWorkspaceFile('**/templater/integration/ModuleOptions.txt');
    this._moduleOptions = fs.readFileSync(moduleOptionsPath, 'utf8').split("\n").map(el => el.trim());
  }

  private async _getStepOptions() {
    // get module dropdown options from txt file
    let stepOptionsPath = await getWorkspaceFile('**/templater/integration/StepNameOptions.txt');
    this._stepOptions = fs.readFileSync(stepOptionsPath, 'utf8').split("\n").map(el => el.trim());
  }

  private async _getStepTypeOptions() {
    // get module dropdown options from txt file
    let stepTypeOptionsPath = await getWorkspaceFile('**/templater/integration/StepTypeOptions.txt');
    this._stepTypeOptions = fs.readFileSync(stepTypeOptionsPath, 'utf8').split("\n").map(el => el.trim());
  }

  private async _getStepMethodOptions() {
    // get module dropdown options from txt file
    let stepMethodOptionsPath = await getWorkspaceFile('**/templater/integration/StepMethodOptions.txt');
    this._stepMethodOptions = fs.readFileSync(stepMethodOptionsPath, 'utf8').split("\n").map(el => el.trim());
  }

  private _cropFlexFields() {
    // crop steps array
    let newStepFieldValues: string[] = [];
    for (let index = 0; index < +this._fieldValues[nofStepsIndex]; index++) {
      // stepname
      if (this._stepFieldValues[index] !== undefined) {
        newStepFieldValues[index] = this._stepFieldValues[index];
      }

    }
    this._stepFieldValues = newStepFieldValues;

    // crop scenarios array
    this._scenarioFieldValues = this._scenarioFieldValues.slice(0, +this._fieldValues[nofScenariosIndex]);
  }

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["scripts", "createintegration", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["scripts", "createintegration", "style.css"]);

    // first time only: get integrations, available scenarios, modular elements
    if (this._integrationObjects.length === 0) {
      await this._getModuleOptions();
      await this._getStepOptions();
      await this._getStepTypeOptions();
      await this._getStepMethodOptions();
      this._functionsPath      = await getWorkspaceFile('**/scripts/functions.ps1');
      this._integrationObjects = await getAvailableIntegrations('integration');
      this._availableScenarios = await getAvailableScenarios(this._fieldValues[moduleIndex]);
      this._modularElementsWithParents  = await getModularElementsWithParents(this._fieldValues[moduleIndex]);
      this._stepTypes[0] = this._stepTypeOptions[0];
      this._stepMethods[0] = this._stepMethodOptions[0];
    }

    // crop flexible field arrays
    this._cropFlexFields();

    // show only available scenarios which are not already in the existing scenarios
    let reducedAvailableScenarios = this._availableScenarios.filter(el => !this._existingScenarioFieldValues.includes(this._getNewScenarioValue(el)));


    // Create panel Html object and retrieve html
    let createIntegrationHtmlObject: CreateIntegrationHtmlObject = new CreateIntegrationHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      reducedAvailableScenarios,
      this._modularElementsWithParents,
      this._fieldValues,
      this._stepFieldValues,
      this._scenarioFieldValues,
      this._existingScenarioFieldValues,
      this._existingScenarioCheckboxValues,
      this._createUpdateValue,
      this._modularValue,
      this._multiFieldValues,
      this._nofPackages,
      this._moduleOptions,
      this._stepOptions,
      this._stepTypeOptions,
      this._stepTypes,
      this._stepMethodOptions,
      this._stepMethods,
      this._scenarioCustomFields
    );

    let html =  createIntegrationHtmlObject.getHtml();

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