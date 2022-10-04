import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, startScript, cleanPath, parentPath, toBoolean, isEmptyStringArray, isEmpty, getAvailableIntegrations, getModularElements, getModularElementsWithParents, getAvailableScenarios, getFromScript, isModular, saveAuth, getPackageTypes, nameFromPath, getElementsFromIntegrationPath, getIntegrationSubpath, getIntegration, getFileContentFromGlob} from "../utilities/functions";
import * as fs from 'fs';
import { CreateIntegrationHtmlObject } from "./CreateIntegrationHtmlObject";
import { getHeapStatistics } from "v8";
import { runInThisContext } from "vm";

// fixed fields indices
const carrierIndex = 0;
const apiIndex = 1;
const moduleIndex = 2;
const carrierCodeIndex = 3;
const nofStepsIndex = 5;
const nofScenariosIndex = 6;

// type definitions
type ScenarioObject = {
  name: string,
  structure: string
};

type ElementsObject = {carrier:string, api:string, module:string};

type IntegrationObject = {
  path:string, carrier:string, 
  api:string, module:string, 
  carriercode:string,
  scenarios:string[], 
  validscenarios: ScenarioObject[],
  steps: string[]
};

type ModularElementObject = {
  parent:string, 
  element:string, 
  multi:boolean
};

type FileObject = {
  parent: string,
  file: string,
  path: string
};

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
  //private _integrationObjects:     IntegrationObject[] = [];
  private _emptyIntegrationObject : IntegrationObject = {path: '', carrier: '', api: '', module: '', carriercode: '', scenarios: [], validscenarios: [], steps: []};
  private _currentIntegration : IntegrationObject = this._emptyIntegrationObject;
  private _availableScenarios: string[] = [];
  private _modularElementsWithParents: ModularElementObject[] = [];
  private _packageTypes: string[] = [];
  private _functionsPath: string = '';
  private _multiFieldValues: {[details: string] : string;} = {};
  private _nofPackages: string[] = [];
  private _scenarioPackageTypes: string[][] = [];
  private _moduleOptions: string[] = [];
  private _stepOptions: string[] = [];
  private _stepTypeOptions: string[] = [];
  private _stepTypes: string[] = [];
  private _stepMethodOptions: string[] = [];
  private _stepMethods: string[] = [];
  private _scenarioCustomFields: string[] = [];
  private _existingScenarioCustomFields: string[] = [];
  private _settingsGlob: string = "**/.vscode/settings.json";
  private _readmeSetting: string = "stitch.integrationtemplater.readmeLocation";
  private _settings: any;

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext, loadFile:string = '') {
    this._panel = panel;

    // predefine some fixed fields
    this._fieldValues[moduleIndex] = 'booking';
    this._fieldValues[nofStepsIndex] = "1";
    this._fieldValues[nofScenariosIndex] = "1";
    this._stepFieldValues[0] = this._fieldValues[moduleIndex];

    // set content
      this._getWebviewContent(this._panel.webview, extensionUri).then(html => {
        //this._panel.webview.html = html;
        this._loadFileIfPresent(extensionUri,loadFile);
      });
      

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

    // get authentication string from setting and save to file (to be used by PowerShell)
    saveAuth();
  }

  // METHODS
  // initial rendering
  public static render(extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext, loadFile:string = '') {
    if (CreateIntegrationPanel.currentPanel) {
      CreateIntegrationPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);

      // if loadFile: load file
      CreateIntegrationPanel.currentPanel._loadFileIfPresent(extensionUri,loadFile);
    } else {
      const panel = vscode.window.createWebviewPanel("create-integration", "Create or update carrier integration", vscode.ViewColumn.One, {
        enableScripts: true
      });

      CreateIntegrationPanel.currentPanel = new CreateIntegrationPanel(panel, extensionUri, nofSteps, context, loadFile);
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
            this._checkIntegrationExists(extensionUri, 'check');
            break;

          case 'createintegration':
            this._createUpdateIntegration(terminal, extensionUri);
            break;

          case 'showerrormessage':
            vscode.window.showErrorMessage(text);
            break;

          case 'showinformationmessage':
            vscode.window.showInformationMessage(text);
            break;

          case 'switchsteps':
            const indices: string[] = text.split('|');
            this._switchSteps(+indices[0],+indices[1]);
            this._updateWebview(extensionUri);
            break;

          case 'removestepindex':
            const removeIndex = +text;
            this._removeStepIndex(removeIndex);
            this._updateWebview(extensionUri);
            break;

          case 'changepackagetype':
            var scenarioIndexValue = text.split('|');
            var scenarioIndex = +scenarioIndexValue[0];
            var index = +scenarioIndexValue[1];
            var value = scenarioIndexValue[2];
            this._scenarioPackageTypes[scenarioIndex][index] = value;
            break;

          case 'infoclick':
            this._openInfoFile();
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
                    this._stepsPrefillAndCrop(+value);
                    this._updateWebview(extensionUri);
                    break;

                  case moduleIndex:
                    // clear existing scenarios
                    this._scenarioFieldValues = [];
                    // apply 'check' 
                    this._checkIntegrationExists(extensionUri, 'check');
                    break;

                  case nofScenariosIndex:
                    for (let i = 0; i < +this._fieldValues[nofScenariosIndex]; i++) {
                      this._updatePackageTypes(i);
                    }
                    this._updateWebview(extensionUri);
                    break;
                }
                
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
              case 'nofpackagesdropdown':
                this._nofPackages[index] = value;
                this._updatePackageTypes(index);
                break;
            }
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private async _openInfoFile() {
    let readmeLocation:string = this._settings[this._readmeSetting];

    if (isEmpty(readmeLocation)) {
      // settting missing
      vscode.window.showErrorMessage("Missing repo setting " + this._readmeSetting);

    } else if (readmeLocation.startsWith('**')) {
      // location is a glob 
      const filePath:string = await getWorkspaceFile(this._settings[this._readmeSetting]);
      if (!isEmpty(filePath)) {
        const openPath = vscode.Uri.file(filePath);
        // const doc = await vscode.workspace.openTextDocument(openPath);
        // vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
        await vscode.commands.executeCommand("markdown.showPreview", openPath);
      }
    } else {
      // location is a URL: try tab in VSCode, else open in browser
      try {
        await vscode.commands.executeCommand("simpleBrowser.show",readmeLocation);
      } catch (err) {
        await vscode.env.openExternal(vscode.Uri.parse(readmeLocation));
      }
    }
    
  }

  private _loadFileIfPresent(extensionUri:vscode.Uri, loadFile:string) {
    if (!isEmpty(loadFile)) {
      // get paths
      let elements = getElementsFromIntegrationPath(loadFile);

      // update fields
      this._fieldValues[carrierIndex] = elements.carrier;
      this._fieldValues[apiIndex] = elements.api;
      this._fieldValues[moduleIndex] = elements.module;
      
      // check button
      this._checkIntegrationExists(extensionUri, 'check');
    } else {
      // else: just refresh panel
      this._updateWebview(extensionUri);
    }
  }

  private _stepsPrefillAndCrop(newLength: number) {
    // prefill if larger than before
    for (let ii = 0; ii < newLength; ii++) {
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

    // crop if smaller than before
    this._stepFieldValues.slice(0,newLength);
    this._stepTypes.slice(0,newLength);
    this._stepMethods.slice(0,newLength);
  }

  private _switchSteps(index1:number, index2:number) {
    // save values of index 1
    const stepName1 = this._stepFieldValues[index1];
    const stepType1 = this._stepTypes[index1];
    const stepMethod1 = this._stepMethods[index1];

    // replace with values of index 2
    this._stepFieldValues[index1] = this._stepFieldValues[index2];
    this._stepTypes[index1] = this._stepTypes[index2];
    this._stepMethods[index1] = this._stepMethods[index2];

    // replace values of index 2 with originals of index 1
    this._stepFieldValues[index2] = stepName1;
    this._stepTypes[index2] = stepType1;
    this._stepMethods[index2] = stepMethod1;

  }

  private _removeStepIndex(removeIndex:number) {
    let nofSteps = +this._fieldValues[nofStepsIndex];
    for (let index = removeIndex; index < (nofSteps -1); index++) {
      // replace with values of next index
      this._stepFieldValues[index] = this._stepFieldValues[index + 1];
      this._stepTypes[index] = this._stepTypes[index + 1];
      this._stepMethods[index] = this._stepMethods[index + 1];
    }

    // update nofSteps
    this._fieldValues[nofStepsIndex] = (nofSteps-1).toString();

    // crop associated arrays
    this._stepsPrefillAndCrop(nofSteps-1);
  }

  private _updatePackageTypes(index:number) {
    // crop package types array
    this._scenarioPackageTypes = this._scenarioPackageTypes.slice(0, +this._fieldValues[nofScenariosIndex]);

    // crop package types array index (if not empty)
    if (this._scenarioPackageTypes[index] !== undefined ) {
      this._scenarioPackageTypes[index] = this._scenarioPackageTypes[index].slice(0, +this._nofPackages[index]);
    }

    // fill all empty values with default
    for (let i = 0; i < +(this._nofPackages[index] ?? 1); i++) {
      if (this._scenarioPackageTypes[index] === undefined) {
        this._scenarioPackageTypes[index] = [this._packageTypes[0]];
      }
      if (isEmpty(this._scenarioPackageTypes[index][i])) {
        this._scenarioPackageTypes[index][i] = this._packageTypes[0];
      }
    }
  }

  private async _getIntegrationObject() : Promise<IntegrationObject> {
    let elements:ElementsObject = this._getIntegrationElements();

    // if matches to current integration: return current; else: extract from integration json path
    let outIntegrationObject: IntegrationObject = this._currentIntegration;

    if (elements.carrier !== this._currentIntegration.carrier || elements.api !== this._currentIntegration.api || elements.module !== this._currentIntegration.module) {
      let subPath: string = getIntegrationSubpath(elements);
      let integrationJsonPath: string = await getWorkspaceFile('**/carriers/'+ subPath + '/*.integration.json', 'silent');
      
      outIntegrationObject = await getIntegration(integrationJsonPath);
    }

    return outIntegrationObject;
  }

  private async _checkIntegrationExists(extensionUri: vscode.Uri, source:string = '') {
    // refresh content
    if (source === 'check') {
      await this._refresh();
    }

    // get current integration
    this._currentIntegration = await this._getIntegrationObject();

    // if current integration is not empty: exists -> 'update'
    if (!isEmpty(this._currentIntegration.carrier)) {
      // set 'update' if integration path exists
      this._createUpdateValue = 'update';

      // update valid existing scenario values from scenario folder instead
      this._existingScenarioFieldValues = this._currentIntegration.validscenarios.map(el => el.structure);
      this._existingScenarioCustomFields = this._currentIntegration.validscenarios.map(el => el.name);

      // update step info from existing scenario
      this._fieldValues[nofStepsIndex] = this._currentIntegration.steps.length.toString();
      this._stepFieldValues = this._currentIntegration.steps.map(el => el.replace(/:[\s\S]*/,''));
      this._stepTypes = this._currentIntegration.steps.map(el => el.replace(/^[\s\S]*:/,'').replace(/\-[\s\S]*$/,''));

      this._stepMethods = [];
      for (let index=0; index < this._currentIntegration.steps.length; index++) {
        if (this._currentIntegration.steps[index].includes('-')) {
          this._stepMethods[index] = this._currentIntegration.steps[index].replace(/^[\s\S]*\-/,'');
        } else {
          this._stepMethods[index] = '';
        }
      }

    } else {
      // integrationpath does not exist: 'create'
      this._createUpdateValue = 'create';
      this._existingScenarioFieldValues = [];
    }

    // clean existing scenario checkbox values upon clicking 'check' button
    this._existingScenarioCheckboxValues = [];

    // update panel
    this._updateWebview(extensionUri);
  }

  private _getStepsArray() : string[] {
    let steps: string[] = [];
    for (let index=0; index < +this._fieldValues[nofStepsIndex]; index++) {
      steps[index] = this._stepFieldValues[index] + ':' + this._stepTypes[index];
      if (this._stepTypes[index] === 'http') {
        steps[index] += '-' + this._stepMethods[index];
      }
    }

    return steps;
  }

  private async _createUpdateIntegration(terminal: vscode.Terminal, extensionUri: vscode.Uri) {
      // get current integration
      this._currentIntegration = await this._getIntegrationObject();

      // if current integration value does not match create/update value -> show error and refresh form
      if (!isEmpty(this._currentIntegration.carrier) && this._isCreate()) {
        vscode.window.showErrorMessage(`Cannot create: integration ${this._getIntegrationName()} already exists`);
        this._checkIntegrationExists(extensionUri);
        return;
      } else if (isEmpty(this._currentIntegration.carrier) && !this._isCreate()) {
        vscode.window.showErrorMessage(`Cannot update: integration ${this._getIntegrationName()} does not exist`);
        this._checkIntegrationExists(extensionUri);
        return;
      }

      // show info message
      vscode.window.showInformationMessage((this._isCreate() ? 'Creating' : 'Updating') + ' integration ' + this._getIntegrationName());

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

      // update integration object
      let scenarios : string[] = this._getNewScenarios();
      let scenarioNames:string[] =  this._scenarioCustomFields.filter(el => !isEmpty(el));

      // construct scenario object array
      let scenarioObjects :  ScenarioObject[] = new Array< ScenarioObject>(scenarios.length);
      for (let index=0; index < scenarios.length; index++) {
        scenarioObjects[index] = {
          name: scenarioNames[index],
          structure: scenarios[index]
        };
      }
      
      // update integration object
      this._currentIntegration = {
        path: this._getIntegrationJsonPath(this._functionsPath),
        carrier: this._fieldValues[carrierIndex], 
        api: this._fieldValues[apiIndex], 
        module: this._fieldValues[moduleIndex], 
        carriercode: this._fieldValues[carrierCodeIndex],
        scenarios: this._currentIntegration.scenarios.concat(scenarioNames).sort(), 
        validscenarios: this._currentIntegration.validscenarios.concat(scenarioObjects).sort(),
        steps: this._getStepsArray()
      };

      // refresh window
      this._fieldValues[nofScenariosIndex] = "1";
      this._scenarioFieldValues = [];
      this._scenarioCustomFields = [];
      this._nofPackages = [];
      this._scenarioPackageTypes = [];
      this._updatePackageTypes(0);
      this._checkIntegrationExists(extensionUri);
  }

  private _isCreate() : boolean {
    return this._createUpdateValue === 'create';
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
    let newScenarios: string[] = [];
    // combine with custom names
    for (let index = 0; index < this._scenarioFieldValues.length; index++) {
      if (!isEmpty(this._scenarioFieldValues[index])) {
        newScenarios[index] = this._scenarioFieldValues[index] + '|' + this._scenarioCustomFields[index];
      }
    }

    return newScenarios.filter(el => !isEmpty(el));
  }

  private _getScenariosString(): string {
    let scenariosString = '';     // pre-allocate

    // pre-allocate scenario object array
    let scenarioObjectArray : {execute: boolean, name: string}[] = [];

    // add existing scenarios (if 'update')
    if (this._createUpdateValue === 'update') {
      for (let index = 0; index < this._existingScenarioFieldValues.length; index++) {
        var structure = this._existingScenarioFieldValues[index];
        var customName = this._existingScenarioCustomFields[index];
 
        scenarioObjectArray.push( {
          execute: this._existingScenarioCheckboxValues[index],
          name: structure + (isModular(structure) ? ('|' + customName  ) : '' )
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
      newScriptContent = newScriptContent.replace(replaceString, (this._fieldValues[index] ?? "") + "");
    }

    // createupdate
    newScriptContent = newScriptContent.replace('[createupdate]', this._createUpdateValue + "");

    // scenarios
    newScriptContent = newScriptContent.replace(/\$Scenarios = \@\([^\)]+\)/g, this._getScenariosString());

    // steps
    let stepsString: string = '\n"' + this._getStepsArray().join('",\n"') + '"\n';
    newScriptContent = newScriptContent.replace(/(?<=\$Steps\s*=\s*@\()[^\)]*(?=\))/, stepsString);

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
    return this._getCarrierPath(functionsPath) + '/' + this._getScriptName();
  }

  private _getTemplatePath(functionsPath: string): string {
    let scriptsPath: string = parentPath(cleanPath(functionsPath));
    return scriptsPath + '/templates/create-module-integration-template.ps1';
  }

  private _getCarrierPath(functionsPath: string): string {
    let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
    return filesPath + '/carriers/' + this._fieldValues[carrierIndex];
  }

  private _getIntegrationElements() : ElementsObject {
    return {
      carrier: this._fieldValues[carrierIndex],
      api: this._fieldValues[apiIndex],
      module: this._fieldValues[moduleIndex]
    };
  }

  private _getIntegrationJsonPath(functionsPath: string): string {
    return `${this._getCarrierPath(functionsPath)}/${getIntegrationSubpath(this._getIntegrationElements())}/${this._fieldValues[moduleIndex]}.integration.json`;
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
    this._scenarioCustomFields = this._scenarioCustomFields.slice(0, +this._fieldValues[nofScenariosIndex]);
    this._nofPackages = this._nofPackages.slice(0, +this._fieldValues[nofScenariosIndex]);
  }

  private async _refresh() {
    this._settings = JSON.parse(await getFileContentFromGlob(this._settingsGlob));
    await this._getModuleOptions();
    await this._getStepOptions();
    await this._getStepTypeOptions();
    await this._getStepMethodOptions();
    this._functionsPath      = await getWorkspaceFile('**/scripts/functions.ps1');
    //this._integrationObjects = await getAvailableIntegrations('integration');
    this._availableScenarios = await getAvailableScenarios(this._fieldValues[moduleIndex]);
    this._modularElementsWithParents  = await getModularElementsWithParents(this._fieldValues[moduleIndex]);
    this._packageTypes = await getPackageTypes(this._fieldValues[moduleIndex]);
  }

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["scripts", "createintegration", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["scripts", "createintegration", "style.css"]);

    // first time only: get integrations, available scenarios, modular elements
    if (this._moduleOptions.length === 0) {
      await this._refresh();
      if (isEmpty(this._stepTypes[0])) {
        this._stepTypes[0] = this._stepTypeOptions[0];
        this._stepMethods[0] = this._stepMethodOptions[0];
      }
      
      this._updatePackageTypes(0);
    }

    // crop flexible field arrays
    this._cropFlexFields();

    // show only available scenarios which are not already in the existing scenarios
    let reducedAvailableScenarios = this._availableScenarios.filter(el => !this._existingScenarioCustomFields.includes(this._getNewScenarioValue(el)));

    // existing step names
    let existingSteps = this._currentIntegration.steps.map(el => el.replace(/:[\s\S]*/,''));

    // Create panel Html object and retrieve html
    let createIntegrationHtmlObject: CreateIntegrationHtmlObject = new CreateIntegrationHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      reducedAvailableScenarios,
      this._modularElementsWithParents,
      this._packageTypes,
      this._fieldValues,
      this._stepFieldValues,
      this._scenarioFieldValues,
      this._existingScenarioFieldValues,
      this._existingScenarioCheckboxValues,
      this._createUpdateValue,
      this._multiFieldValues,
      this._nofPackages,
      this._scenarioPackageTypes,
      this._moduleOptions,
      this._stepOptions.filter(el => !existingSteps.includes(el)),
      this._stepTypeOptions,
      this._stepTypes,
      this._stepMethodOptions,
      this._stepMethods,
      this._scenarioCustomFields,
      this._existingScenarioCustomFields,
      existingSteps
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