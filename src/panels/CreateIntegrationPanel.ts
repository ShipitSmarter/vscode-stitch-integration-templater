import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getWorkspaceFiles, getExtensionFile, startScript, cleanPath, parentPath, nth, dropdownOptions, arrayFrom1, toBoolean, isEmptyStringArray, arrayFrom0 } from "../utilities/functions";
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

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    this._panel = panel;

    // predefine some fixed fields
    this._fieldValues[moduleIndex] = 'booking';
    this._fieldValues[nofStepsIndex] = "1";
    this._fieldValues[nofScenariosIndex] = "1";

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

          case "savefieldvalue":
            let indexValue = message.text.split('|');
            this._fieldValues[indexValue[0]] = indexValue[1];
            break;

          case "savestepfieldvalue":
            let stepIndexValue = message.text.split('|');
            this._stepFieldValues[stepIndexValue[0]] = stepIndexValue[1];
            break;

          case "saveotherstepvalue":
            let otherStepIndexValue = message.text.split('|');
            this._otherStepValues[otherStepIndexValue[0]] = otherStepIndexValue[1];
            break;

          case "savescenariofieldvalue":
            let scenarioIndexValue = message.text.split('|');
            this._scenarioFieldValues[scenarioIndexValue[0]] = scenarioIndexValue[1];
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

  private _getNewScenariosString(): string {

    let newScenariosString: string = '';
    for (let index = 0; index < this._scenarioFieldValues.length; index++) {
      if (this._scenarioFieldValues[index] !== undefined && this._scenarioFieldValues[index] !== '') {
        // remove parent folder indicator if present
        let scenarioName = this._scenarioFieldValues[index].replace(/[^\>]+\> /g, '');
        newScenariosString += '\n    ' + '"' + scenarioName + '"';

        // check if comma is needed
        let remainingFieldValues: string[] = this._scenarioFieldValues.slice(index + 1, this._scenarioFieldValues.length);
        if (!isEmptyStringArray(remainingFieldValues)) {
          newScenariosString += ',';
        }
      }
    }
    return newScenariosString;
  }

  private _getScenariosString(): string {
    let scenariosString = '';     // pre-allocate

    // add existing scenarios
    if (this._createUpdateValue === 'update') {
      for (let index = 0; index < this._existingScenarioFieldValues.length; index++) {
        let commenting = '# ';
        if (this._existingScenarioCheckboxValues[index]) {
          commenting = '';
        }

        scenariosString += '\n    ' + commenting + '"' + this._existingScenarioFieldValues[index] + '"';

        // check if comma is needed
        let remainingCheckboxes: boolean[] = this._existingScenarioCheckboxValues.slice(index + 1, this._existingScenarioCheckboxValues.length);
        if ((remainingCheckboxes.filter(el => el === true).length > 0) || !isEmptyStringArray(this._scenarioFieldValues)) {
          scenariosString += ',';
        }
      }
    }

    // add 'new' scenarios
    scenariosString += this._getNewScenariosString();

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
    newScriptContent = newScriptContent.replace('[modular]', this._modularValue + "");

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

  private async _getAvailableScenarios(): Promise<string[]> {
    let bookingScenarioXmls: string[] = await getWorkspaceFiles('**/scenario-templates/' + this._fieldValues[moduleIndex] + '/**/*.xml');

    let bookingScenarios: string[] = [];

    for (let index = 0; index < bookingScenarioXmls.length; index++) {
      let scenarioName = (cleanPath(bookingScenarioXmls[index]).split('/').pop() ?? '').replace(/.xml$/, '');
      let scenarioParentName = parentPath(cleanPath(bookingScenarioXmls[index])).split('/').pop() ?? '';
      // only show parent indicator if not [module]
      if (scenarioParentName === this._fieldValues[moduleIndex]) {
        scenarioParentName = '';
      }
      bookingScenarios[index] = `${scenarioParentName} > ${scenarioName}`;
    }

    return bookingScenarios.sort();
  }

  private async _getAvailableModularScenarioElements(): Promise<string[]> {
    let elementXmls: string[] = await getWorkspaceFiles('**/scenario-templates/modular/' + this._fieldValues[moduleIndex] + '/**/*.xml');

    let elements: string[] = [];

    for (let index = 0; index < elementXmls.length; index++) {
      let elementName = (cleanPath(elementXmls[index]).split('/').pop() ?? '').replace(/.xml$/, '');
      let elementParentName = parentPath(cleanPath(elementXmls[index])).split('/').pop() ?? '';
      // only show parent indicator if not [module]
      if (elementParentName === this._fieldValues[moduleIndex]) {
        elementParentName = '';
      }
      elements[index] = elementName;
    }

    return elements.sort();
  }

  private async _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): Promise<string> {
    // define necessary extension Uris
    const toolkitUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
    const codiconsUri = getUri(webview, extensionUri, ["node_modules", "@vscode", "codicons", "dist", "codicon.css"]);
    const mainUri = getUri(webview, extensionUri, ["panels", "createintegration", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["panels", "createintegration", "style.css"]);

    // crop flexible field arrays
    this._cropFlexFields();

    // get all input.json files in carrier
    let availableScenarios: string[] = await this._getAvailableScenarios();
    let modularElements : string[] = await this._getAvailableModularScenarioElements();

    // define panel HTML
    let createIntegrationHtmlObject: CreateIntegrationHtmlObject = new CreateIntegrationHtmlObject(
      [toolkitUri,codiconsUri,mainUri,styleUri],
      availableScenarios,
      modularElements,
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