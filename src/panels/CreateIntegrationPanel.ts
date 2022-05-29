import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, toBoolean, isEmptyStringArray, isEmpty, getAvailableIntegrations, getModularElements, getModularElementsWithParents, getAvailableScenarios, getFromScript} from "../utilities/functions";
import * as fs from 'fs';
import { CreateIntegrationHtmlObject } from "./CreateIntegrationHtmlObject";

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
const nofPackagesIndex = 10;

export class CreateIntegrationPanel {
  // PROPERTIES
  public static currentPanel: CreateIntegrationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: string[] = [];
  private _stepFieldValues: string[] = [];
  private _otherStepValues: string[] = [];
  private _scenarioFieldValues: string[] = [];
  private _existingScenarioFieldValues: string[] = [];
  private _existingScenarioCheckboxValues: boolean[] = [];
  private _createUpdateValue: string = 'create';      // pre-allocate with 'create'
  private _modularValue: boolean = false;             // pre-allocate with 'false'  
  private _integrationObjects:      {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:string[]}[] = [];
  private _emptyIntegrationObject : {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:string[]} = {path: '', carrier: '', api: '', module: '', carriercode: '', modular: false, scenarios: [], validscenarios:[]};
  private _currentIntegration :     {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios:string[]} = this._emptyIntegrationObject;
  private _availableScenarios: string[] = [];
  private _modularElementsWithParents: {parent:string, element:string}[] = [];
  private _functionsPath: string = '';

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    this._panel = panel;

    // predefine some fixed fields
    this._fieldValues[moduleIndex] = 'booking';
    this._fieldValues[nofStepsIndex] = "1";
    this._fieldValues[nofScenariosIndex] = "1";
    this._fieldValues[nofPackagesIndex] = "1";

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

          case "savevalue":
            var classIndexValue = text.split('|');
            var index = +classIndexValue[1];
            var value = classIndexValue[2];
            switch (classIndexValue[0]) {
              case 'dropdown':
              case 'field':
                this._fieldValues[index] = value;
                break;
              case 'stepdropdown':
              case 'stepfield':
                this._stepFieldValues[index] = value;
                break;
              case 'otherstepfield':
                this._otherStepValues[index] = value;
                break;
              case 'scenariofield':
                this._scenarioFieldValues[index] = value;
                break;
              case 'existingscenariocheckbox':
                this._existingScenarioCheckboxValues[index] = toBoolean(value);
                break;
              case 'modular':
                this._modularValue = toBoolean(value);
                this._scenarioFieldValues = [];
                this._updateWebview(extensionUri);
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

      // update modular value from script
      // if (this._modularValue !== this._currentIntegration.modular) {
      //   // if modular checkbox switches: clear scenario fields
      //   this._scenarioFieldValues = [];
      // }
      // this._modularValue = this._currentIntegration.modular;

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

      // replace New-UpdateIntegration function call
      let newNewUpdateIntegration = 'New-UpdateIntegration -CarrierName $CarrierName -Module $Module -CarrierAPI $CarrierAPI -Scenarios $Scenarios -StringReplaceList $StringReplaceList -CreateOrUpdate $CreateOrUpdate -Steps $Steps -Test';
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

    // steps fields: step name, testurls, produrls
    let nofSteps = this._fieldValues[nofStepsIndex];
    let stepsString: string = '';
    let testUrlsString: string = '';
    let prodUrlsString: string = '';
    for (let index = 0; index < +nofSteps; index++) {
      let step: string = '';

      // if 'other': take alternative value
      if (this._stepFieldValues[index] === 'other') {
        step = this._otherStepValues[index] + '';
      } else {
        step = this._stepFieldValues[index] + '';
      }

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

  private _cropFlexFields() {
    // crop steps, othersteps arrays
    let newStepFieldValues: string[] = [];
    let newOtherStepValues: string[] = [];
    for (let index = 0; index < +this._fieldValues[nofStepsIndex]; index++) {
      // stepname, other step
      if (this._stepFieldValues[index] !== undefined) {
        newStepFieldValues[index] = this._stepFieldValues[index];

        if (this._stepFieldValues[index] === 'other') {
          newOtherStepValues[index] = this._otherStepValues[index];
        }
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
    this._otherStepValues = newOtherStepValues;

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
      this._functionsPath      = await getWorkspaceFile('**/scripts/functions.ps1');
      this._integrationObjects = await getAvailableIntegrations('integration');
      this._availableScenarios = await getAvailableScenarios(this._fieldValues[moduleIndex]);
      this._modularElementsWithParents  = await getModularElementsWithParents(this._fieldValues[moduleIndex]);
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
      this._otherStepValues,
      this._scenarioFieldValues,
      this._existingScenarioFieldValues,
      this._existingScenarioCheckboxValues,
      this._createUpdateValue,
      this._modularValue
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