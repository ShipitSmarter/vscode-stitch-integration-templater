import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getExtensionFile , startScript, cleanPath, parentPath, nth, dropdownOptions, arrayFrom1} from "../utilities/functions";
import * as fs from 'fs';
import * as path from 'path';

export class CreateIntegrationPanel {
  // PROPERTIES
  public static currentPanel: CreateIntegrationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: String[] = [];
  private _stepFieldValues: String[] = [];
  private _scenarioFieldValues: String[] = [];
  private _createUpdateValue: String = 'create';      // pre-allocate with 'create'
  private _modularValue: boolean = false;             // pre-allocate with 'false'

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    this._panel = panel;

    // set content
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // set message listener
    this._setWebviewMessageListener(extensionUri, this._panel.webview, context);

    // set ondidchangeviewstate
    this._panel.onDidChangeViewState( e => {
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
            let carrier = this._fieldValues[0];
            let api     = this._fieldValues[1];
            let module  = this._fieldValues[2];

            // getWorkspaceFile is async -> all following steps must be executed within the 'then'
            // start at scripts/functions.ps1, because unique
            getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {
              // get new carrier path
              let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
              let carrierPath = filesPath + '/carriers/' + carrier;
              let integrationPath = carrierPath + '/' + api + '/' + module;
              let scriptPath = carrierPath + '/create-integration-' + carrier + '-' + api + '-' + module + '.ps1';

              if (fs.existsSync(integrationPath) && this._createUpdateValue === 'create') {
                // set 'update'
                this._createUpdateValue = 'update';

                // load scenarios if present
                if (fs.existsSync(scriptPath)) {
                  // find scenarios using regex
                  let scriptContent = fs.readFileSync(scriptPath, 'utf8');
                  let scenarioString = scriptContent.match(/\$Scenarios = \@\(([^\)]+)/) ?? '';
                  let rawScenarios: string[] = [];
                  if (scenarioString.length >= 2) {
                    rawScenarios = scenarioString[1].split(',');
                  }

                  // update scenario fields and nofScenarios
                  for (let index = 0; index < rawScenarios.length; index++) {
                    this._scenarioFieldValues[index] = rawScenarios[index].trim().replace(/"/g,'');
                  }
                  this._scenarioFieldValues = this._scenarioFieldValues.slice(0,rawScenarios.length);
                  this._fieldValues[6] = rawScenarios.length + "";
                }
                
                // update panel
                this._updateWebview(extensionUri);
              } 
              
              if ((fs.existsSync(integrationPath) === false) && (this._createUpdateValue === 'update')) {
                this._createUpdateValue = 'create';
                this._updateWebview(extensionUri);
              }
            });    
            break;

          case 'createintegration':
            vscode.window.showInformationMessage('Creating integration '+ this._fieldValues[0] + '/' + this._fieldValues[1] + '/' + this._fieldValues[2]);
            this._createIntegration(terminal);
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
        }
      },
      undefined,
      this._disposables
    );
  }

  // private _integrationExists() : boolean {
  //   let carrier = this._fieldValues[0];
  //   let api     = this._fieldValues[1];
  //   let module  = this._fieldValues[2];

  //   // getWorkspaceFile is async -> all following steps must be executed within the 'then'
  //   // check scripts/functions.ps1, because unique
  //   getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {
  //     // get new carrier path
  //     let filesPath = parentPath(parentPath(parentPath(cleanPath(functionsPath))));
  //     let carrierFolderPath = filesPath + '/carriers/' + carrier + '/' + api + '/' + module;

  //     return fs.existsSync(carrierFolderPath);
  //   });    
  // }

  private _createIntegration (terminal: vscode.Terminal) {
    // check if terminal exists and is still alive
    let terminalExists: boolean = (terminal && !(terminal.exitStatus));

    // getWorkspaceFile is async -> all following steps must be executed within the 'then'
    getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {

      // get new carrier path
      let carrierFolder = this._fieldValues[0];
      let scriptsPath = parentPath(cleanPath(functionsPath));
      let filesPath = parentPath(parentPath(scriptsPath));
      let carrierFolderPath = filesPath + '/carriers/' + carrierFolder;

      // make carrierFolderPath if not exists
      try { 
        fs.mkdirSync(carrierFolderPath, { recursive: true });
      } catch (e: unknown) { }

      // load ps integration template file
      let templatePath = scriptsPath + '/templates/create-module-integration-template.ps1';
      let templateContent = fs.readFileSync(templatePath, 'utf8');

      // replace all field values
      // fixed field values
      let newScriptContent = templateContent;
      for (let index = 0; index < this._fieldValues.length; index++) {
        let replaceString = '[fieldValues' + index + ']';
        if (this._fieldValues[index] !== undefined) {
          newScriptContent = newScriptContent.replace(replaceString,this._fieldValues[index] + "");
        }
      }

      // createupdate
      newScriptContent = newScriptContent.replace('[createupdate]',this._createUpdateValue + "");

      // modular
      newScriptContent = newScriptContent.replace('[modular]',this._modularValue + "");

      // scenarios
      let scenariosString:string = '';
      for (let index = 0; index < this._scenarioFieldValues.length; index++) {
        if (this._scenarioFieldValues[index] !== undefined) {
          scenariosString += '\n    "' + this._scenarioFieldValues[index] + '"';
          if (index !== this._scenarioFieldValues.length -1) {
            scenariosString += ',';
          }
        }
      }
      newScriptContent = newScriptContent.replace('[scenarios]',scenariosString);

      // steps, testurls, produrls
      let nofSteps = this._fieldValues[5];
      let stepsString:string = '';
      let testUrlsString:string = '';
      let prodUrlsString:string = '';
      for (let index = 0; index < +nofSteps; index++) {
        let step:string = this._stepFieldValues[index] + '';
        // steps
        stepsString += '\n    "' + step + '"';
        if (index !== +nofSteps -1) {
          stepsString += ',';
        }
        // testurls
        if (this._stepFieldValues[index+10] !== undefined) {
          testUrlsString += '\n    ' + step.toUpperCase() + '_CARRIERTESTENDPOINT = "' + this._stepFieldValues[index+10] + '"';
        }
        // produrls
        if (this._stepFieldValues[index+20] !== undefined) {
          prodUrlsString += '\n    ' + step.toUpperCase() + '_CARRIERPRODUCTIONENDPOINT = "' + this._stepFieldValues[index+20] + '"';
        }
      }
      // replace
      newScriptContent = newScriptContent.replace('[steps]',stepsString);
      newScriptContent = newScriptContent.replace('[testurls]',testUrlsString);
      newScriptContent = newScriptContent.replace('[produrls]',prodUrlsString);

      // save to file
      let scriptFileName = 'create-integration-' + this._fieldValues[0] + '-' + this._fieldValues[1] + '-' + this._fieldValues[2] + '.ps1'
      let scriptFilePath = carrierFolderPath + '/' + scriptFileName;
      fs.writeFileSync(scriptFilePath, newScriptContent, 'utf8');

      // execute powershell
      // open terminal if not yet exists
      if (!terminalExists) {
        terminal = startScript('','');
      }

      // execute newly created script
      terminal.sendText(`cd ${carrierFolderPath}`);
      terminal.sendText(`./${scriptFileName}`);

    });
  }

  // make additional html for step fields
  private _stepInputs(nofSteps:number): string {
    let html: string = ``;
    let moduleName:String ='booking';
    if (this._fieldValues[2] !== undefined) {
      moduleName = this._fieldValues[2];
    }

    for (let step = 0; step < +nofSteps; step++) {
      // set html string addition
      let subhtml:string = /*html*/`
        <section class="component-example">
          <p>${(step+1) + nth(step+1)} step</p>
          <vscode-dropdown id="stepname${step}" indexstep="${step}" class="stepdropdown" position="below">
            <vscode-option>${moduleName}</vscode-option>
            <vscode-option>label</vscode-option>
            <vscode-option>login</vscode-option>
            <vscode-option>get_token</vscode-option>
            <vscode-option>save_token</vscode-option>
            <vscode-option>other</vscode-option>
          </vscode-dropdown>
          <vscode-text-field id="testurl${step}" indexstep="${step+10}" class="stepfield" placeholder="https://test-dpd.com/booking"></vscode-text-field>
          <vscode-text-field id="produrl${step}" indexstep="${step+20}" class="stepfield" placeholder="https://prod-dpd.com/booking"></vscode-text-field>
        </section>
      `;

      // replace nth <vscode-option> occurrence to pre-set different selected for each step 
      // BUT: only if not already set in _stepFieldValues
      if (this._stepFieldValues[step] === undefined) {
        // from https://stackoverflow.com/a/44568739/1716283
        let t: number = 0;
        subhtml = subhtml.replace(/<vscode-option>/g, match => ++t === (step+1) ? '<vscode-option selected>' : match);
      }

      // add to output
      html += subhtml;
    }

    return html;
  }

  private _scenarioInputs(nofScenarios:number): string {
    let html: string = ``;
  
    for (let scenario = 0; scenario < +nofScenarios; scenario++) {
      html += /*html*/`
        <section class="component-example">
          <vscode-text-field id="scenario${scenario}" size="40" indexscenario="${scenario}" class="scenariofield" placeholder="${(scenario+1) + nth(scenario+1)} scenario name..."></vscode-text-field>
        </section>
      `;
    }
 
    return html;
  }

  private _ifCreate(content:string) : string {
    let outString = '';
    if (this._createUpdateValue === 'create') {
      outString = content;
    }

    return outString;
  }

  // determine content
  private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const toolkitUri = getUri(webview, extensionUri, [
        "node_modules",
        "@vscode",
        "webview-ui-toolkit",
        "dist",
        "toolkit.js", // A toolkit.min.js file is also available
    ]);

    const mainUri = getUri(webview, extensionUri, ["panels","createintegration", "main.js"]);
    const styleUri = getUri(webview, extensionUri, ["panels","createintegration", "style.css"]);

    // step fields
    let nofSteps: number = +(this._fieldValues[5] ?? 1);
    const stepIntputFields = this._stepInputs(nofSteps);

    // scenario fields
    let nofScenarios: number = +(this._fieldValues[6] ?? 1);
    const scenarioFields = this._scenarioInputs(nofScenarios);

    // crop flexible field arrays
    // steps
    let newStepFieldValues: String[] = [];
    for (let index = 0; index < +nofSteps; index++) {
      // stepname
      if (this._stepFieldValues[index] !== undefined ) {
        newStepFieldValues[index] = this._stepFieldValues[index];
      }

      // testurl
      if (this._stepFieldValues[index + 10] !== undefined ) {
        newStepFieldValues[index + 10] = this._stepFieldValues[index + 10];
      }

      // produrl
      if (this._stepFieldValues[index + 20] !== undefined ) {
        newStepFieldValues[index + 20] = this._stepFieldValues[index + 20];
      }
    }
    this._stepFieldValues = newStepFieldValues;

    // scenarios
    this._scenarioFieldValues = this._scenarioFieldValues.slice(0,+nofScenarios);

    // grids
    let carrierDetailsGrid = /*html*/ `
    <section class="component-subrow">
      <section class="component-example">
        <h4>Carrier details</h4>
        <section class="component-example">
          <vscode-text-field id="carriercode" class="field" index="3" placeholder="DPD">SiS CarrierCode</vscode-text-field>
        </section>

        <section class="component-example">
          <vscode-text-field id="carrierapidescription" class="field" index="4" placeholder="DPD NL Webservice">Carrier API description</vscode-text-field>
        </section>
      </section>

      <section class="component-example">
        <h4>Carrier TST credentials</h4>
        <section class="component-example">
          <vscode-text-field id="testuser" class="field" index="7" placeholder="DPDTstUser">User</vscode-text-field>
        </section>

        <section class="component-example">
          <vscode-text-field id="testpwd" class="field" index="8" placeholder="aslfjakl">Pwd</vscode-text-field>
        </section>
      </section>
    </section>`;


    let carrierGrid = /*html*/ `
    <section class="component-container">
      <h2>Carrier</h2>

      <section class="component-example">
        <p>Folder structure:    <b>carrier / api-name / module</b></p>
        <vscode-text-field id="carriername" class="field" index="0" placeholder="carrier" size="5"></vscode-text-field>
        /
        <vscode-text-field id="carrierapiname" class="field" index="1" placeholder="api-name" size="5"></vscode-text-field>
        /
        <vscode-dropdown id="modulename" class="dropdown" index="2" position="below">
          ${dropdownOptions(['booking','tracking','cancel','pickup','pickup_cancel'])}
        </vscode-dropdown>

        <section class="component-example">
          <vscode-button id="checkintegrationexists" appearance="primary">Check</vscode-button>
        </section>
      </section>

      ${this._ifCreate(carrierDetailsGrid)}
      
    </section>`;

    let createUpdateGrid = /*html*/ `
    <section class="component-container">
      <h2>Execute</h2>

      <section class="component-example">
        <vscode-radio-group id="createupdate">
          <label slot="label">Create/update</label>
          <vscode-radio name="createupdate" value="create">Create</vscode-radio>
          <vscode-radio name="createupdate" value="update">Update</vscode-radio>
        </vscode-radio-group>
      </section>

      <section class="component-example">
        <vscode-button id="createintegration" appearance="primary">Create integration</vscode-button>
      </section>
    </section>`;


    let stepsGrid = /*html*/ `
    <section  class="component-grid">
      <section class="component-container">
        <h2>Steps</h2>

        <section class="component-example">
          <p>Number of steps</p>
          <vscode-dropdown id="nofsteps" class="dropdown" index="5" position="below">
            ${dropdownOptions(arrayFrom1(10))}
          </vscode-dropdown>
        </section>

        <section class="component-example">
          <h3>Step fields: <b>name / carrier TEST url / carrier PROD url</b></h3>
        </section>

        ${stepIntputFields}
      </section>
    </section>`;

    let scenariosGrid = /*html*/ `
    <section class="component-grid">
      <section class="component-container">
        <h2>Scenarios</h2>

        <section class="component-example">
          <vscode-checkbox id="modular">Modular</vscode-checkbox>
        </section>

        <section class="component-example">
          <p>Number of Scenarios</p>
          <vscode-dropdown id="nofscenarios" class="dropdown" index="6" position="below">
            ${dropdownOptions(arrayFrom1(100))}
          </vscode-dropdown>
        </section>

        ${scenarioFields}
      </section>
    </section>`;

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    let html =  /*html*/`
		<!DOCTYPE html>
		<html>
			<head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <script type="module" src="${mainUri}"></script>
        <title>My Dashboard!</title>
				<link href="${styleUri}" rel="stylesheet" /> 
			</head>
			<body>
				<div>
					<h1>Create module integration</h1>
				</div>
        <section class="component-row">

          <section class="component-example">

            <section class="component-row">

              ${carrierGrid}

              ${createUpdateGrid}

            </section>

            
            ${this._ifCreate(stepsGrid)}

          </section>

          ${scenariosGrid}

        </section>

			</body>
		</html>
	  `;

    // update field values
    let values = this._fieldValues;
    for (let index = 0; index < values.length; index++) {
      if (values[index] !== undefined) {
        let indexString = 'index="' + index + '"';
        let newString = indexString + ' value="' + values[index] + '"';
        html = html.replace(indexString,newString);
      }
    }

    // update stepfield values
    let stepValues = this._stepFieldValues;
    for (let index = 0; index < stepValues.length; index++) {
      if (stepValues[index] !== undefined ) {
        let indexString = 'indexstep="' + index + '"';
        let newString = indexString + ' value="' + stepValues[index] + '"';
        html = html.replace(indexString,newString);
      }
    }

    // update scenarioField values
    let scenarioValues = this._scenarioFieldValues;
    for (let index = 0; index < scenarioValues.length; index++) {
      if (scenarioValues[index] !== undefined ) {
        let indexString = 'indexscenario="' + index + '"';
        let newString = indexString + ' value="' + scenarioValues[index] + '"';
        html = html.replace(indexString,newString);
      }
    }

    // update createupdate radio group value
    let createString: string = 'name="createupdate" value="create"';
    let updateString: string = 'name="createupdate" value="update"';
    if (this._createUpdateValue === 'update') {
      html = html.replace(updateString, updateString + ' checked');
    } else {
      html = html.replace(createString, createString + ' checked');
    }

    // update modular checkbox value
    let modularString: string = 'id="modular"';
    if (this._modularValue === true) {
      html = html.replace(modularString, modularString + ' checked');
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