import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getExtensionFile , startScript, cleanPath, parentPath} from "../utilities/functions";
import * as fs from 'fs';

export class CreateIntegrationPanel {
  // PROPERTIES
  public static currentPanel: CreateIntegrationPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _fieldValues: String[] = [];
  private _stepFieldValues: String[] = [];
  private _scenarioFieldValues: String[] = [];
  private _createUpdateValue: String = '';
  private _modularValue: boolean = false;

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
    let terminalExists: boolean;

    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        // check if terminal exists and is still alive
        terminalExists = (terminal && !(terminal.exitStatus));

        switch (command) {
          case 'updatenofsteps':
            vscode.window.showInformationMessage(`Updated number of step input rows to ${text}`);
            this._updateWebview(extensionUri);
            break;

          case 'updatenofscenarios':
            vscode.window.showInformationMessage(`Updated number of scenario input fields to ${text}`);
            this._updateWebview(extensionUri);
            break;

          case 'createintegration':
            vscode.window.showInformationMessage('Creating integration '+ this._fieldValues[0] + '/' + this._fieldValues[1] + '/' + this._fieldValues[2]);

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

              // replace all fieldValues
              let newScriptContent = templateContent;
              for (let index = 0; index <= this._fieldValues.length; index++) {
                let replaceString = '[fieldValues' + index + ']';
                newScriptContent = newScriptContent.replace(replaceString,this._fieldValues[index] + "");
              }

              // save to file
              let scriptFilePath = carrierFolderPath + '/create-integration-' + this._fieldValues[0] + '-' + this._fieldValues[1] + '-' + this._fieldValues[2] + '.ps1';
              fs.writeFileSync(scriptFilePath, newScriptContent, 'utf8');

              // // execute powershell
              // if (terminalExists) {
              //   // if terminal exists and has not exited: re-use
              //   terminal.sendText(`. ${functionsPath}`);
              // } else {
              //   // else: open new terminal
              //   terminal = startScript('','',`. ${functionsPath}`);
              // }

              // terminal.sendText(message.text);

            });
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

  private _nth(num:number): string {
    let after:string = '';
    switch (num) {
      case 1 :
        after = 'st';
        break;
      case 2 :
        after = 'nd';
        break;
      case 3 :
        after = 'rd';
        break;
      default:
        after = 'th';
        break;
    }
    return after;
  }

  // make additional html for step fields
  private _stepInputs(nofSteps:number): string {
    let html: string = ``;
    let moduleName:String ='booking';
    if (this._fieldValues[2] !== undefined) {
      moduleName = this._fieldValues[2];
    }

    for (let step = 1; step <= nofSteps; step++) {
      // set html string addition
      let subhtml:string = /*html*/`
        <section class="component-example">
          <p>${step + this._nth(step)} step: <b>name / carrier TEST url / carrier PROD url</b></p>
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
        subhtml = subhtml.replace(/<vscode-option>/g, match => ++t === step ? '<vscode-option selected>' : match);
      }

      // add to output
      html += subhtml;
    }

    // Example on reading file
    // let document = await vscode.workspace.openTextDocument(element.path);
    // document.getText();
    return html;
  }

  private _scenarioInputs(nofScenarios:number): string {
    let html: string = ``;
  
    for (let scenario = 1; scenario <= nofScenarios; scenario++) {
      html += /*html*/`
        <section class="component-example">
          <vscode-text-field id="scenario${scenario}" size="40" indexscenario="${scenario}" class="scenariofield" placeholder="${scenario + this._nth(scenario)} scenario name..."></vscode-text-field>
        </section>
      `;
    }
  
    // Example on reading file
    // let document = await vscode.workspace.openTextDocument(element.path);
    // document.getText();
    return html;
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
    let nofStepsString: String = this._fieldValues[5];
    let nofSteps: number = +nofStepsString;
    const stepIntputFields = this._stepInputs(nofSteps);

    // scenario fields
    let nofScenariosString: String = this._fieldValues[6];
    let nofScenarios: number = +nofScenariosString;
    const scenarioFields = this._scenarioInputs(nofScenarios);

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
            <section class="component-container">
              <h2>Carrier</h2>

              <section class="component-example">
                <p>Folder structure:    <b>carrier / api-name / module</b></p>
                <vscode-text-field id="carriername" class="field" index="0" placeholder="carrier" size="5"></vscode-text-field>
                /
                <vscode-text-field id="carrierapiname" class="field" index="1" placeholder="api-name" size="5"></vscode-text-field>
                /
                <vscode-dropdown id="modulename" class="dropdown" index="2" position="below">
                  <vscode-option>booking</vscode-option>
                  <vscode-option>tracking</vscode-option>
                  <vscode-option>cancel</vscode-option>
                  <vscode-option>pickup</vscode-option>
                  <vscode-option>pickup_cancel</vscode-option>
                </vscode-dropdown>
              </section>

              <section class="component-example">
                <vscode-text-field id="carriercode" class="field" index="3" placeholder="DPD">SiS CarrierCode</vscode-text-field>
              </section>

              <section class="component-example">
                <vscode-text-field id="carrierapidescription" class="field" index="4" placeholder="DPD NL Webservice">Carrier API description</vscode-text-field>
              </section>
            </section>

            <section class="component-container">
              <h2>Options</h2>

              <section class="component-example">
                <vscode-radio-group id="createupdate">
                  <label slot="label">Create/update</label>
                  <vscode-radio name="createupdate" value="create">Create</vscode-radio>
                  <vscode-radio name="createupdate" value="update">Update</vscode-radio>
                </vscode-radio-group>
              </section>
            </section>

            <section class="component-container">
              <h2>Steps</h2>

              <section class="component-example">
                <p>Number of steps</p>
                <vscode-dropdown id="nofsteps" class="dropdown" index="5" position="below">
                  <vscode-option>1</vscode-option>
                  <vscode-option>2</vscode-option>
                  <vscode-option>3</vscode-option>
                  <vscode-option>4</vscode-option>
                  <vscode-option>5</vscode-option>
                  <vscode-option>6</vscode-option>
                  <vscode-option>7</vscode-option>
                  <vscode-option>8</vscode-option>
                  <vscode-option>9</vscode-option>
                  <vscode-option>10</vscode-option>
                </vscode-dropdown>

                <vscode-button id="updatesteps" appearance="primary">Update</vscode-button>
              </section>

              ${stepIntputFields}
            </section>
          </section>

          <section class="component-example">
            <section class="component-container">
              <h2>Create integration</h2>

              <section class="component-example">
                <vscode-button id="createintegration" appearance="primary">Create integration</vscode-button>
              </section>

              ${scenarioFields}
            </section>
            <section class="component-container">
              <h2>Scenarios</h2>

              <section class="component-example">
                <vscode-checkbox id="modular">Modular</vscode-checkbox>
              </section>

              <section class="component-example">
                <vscode-text-field id="nofscenarios" class="field" index="6" placeholder="Integer">Number of Scenarios</vscode-text-field>
              </section>

              <section class="component-example">
                <vscode-button id="updatescenarios" appearance="primary">Update</vscode-button>
              </section>

              ${scenarioFields}
            </section>
          </section>
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