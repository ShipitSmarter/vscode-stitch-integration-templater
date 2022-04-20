import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getExtensionFile , startScript} from "../utilities/functions";

export class NewDashboardPanel {
  // PROPERTIES
  public static currentPanel: NewDashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;

  private _disposables: vscode.Disposable[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    this._panel = panel;

    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, nofSteps);
    this._setWebviewMessageListener(extensionUri, this._panel.webview, context);

    // on dispose
    this._panel.onDidDispose(this.dispose, null, this._disposables);
  }

  // METHODS
  // initial rendering
  public static render(extensionUri: vscode.Uri, nofSteps: number, context: vscode.ExtensionContext) {
    if (NewDashboardPanel.currentPanel) {
      NewDashboardPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("dashboard", "My Dashboard", vscode.ViewColumn.Two, {
        enableScripts: true
      });

      NewDashboardPanel.currentPanel = new NewDashboardPanel(panel, extensionUri, nofSteps, context);
    }
  }

  // update number of step fields
  private _updateWebview(extensionUri: vscode.Uri, nofSteps: number) {
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, nofSteps);
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
          case "hello":
            vscode.window.showInformationMessage(text);
            break;
        case 'updateNofSteps':
            vscode.window.showInformationMessage(`Updated number of step input fields to ${text}`);
            this._updateWebview(extensionUri, text);
            break;
        case 'startScript':
            if (!terminalExists) {
                vscode.window.showInformationMessage(text);
                terminal = startScript('','',`Write-Host 'Hello World!'`);
            } else {
                vscode.window.showInformationMessage('Script already started!');
            }
            break;

        case 'executecommand':
            vscode.window.showInformationMessage('Executing user input command');

            if (terminalExists) {
                // if terminal exists and has not exited: re-use
                terminal.sendText(text);
            } else {
                // else: open new terminal
                terminal = startScript('','',text);
            }
            break;

        case 'executescript':
            vscode.window.showInformationMessage('Executing script with user arguments');

            // text to send: dot-source script and add arguments
            let scriptPath = getExtensionFile(context,'scripts','script.ps1');
            var sendText: string = `. ${scriptPath} -message ${text}`;

            if (terminalExists) {
                // if terminal exists and has not exited: re-use
                terminal.sendText(sendText);
            } else {
                // else: open new terminal
                terminal = startScript('','',sendText);
            }
            break;

        case 'executewithfunctions':
            vscode.window.showInformationMessage('Dot-Source functions file and execute script');

            // getWorkspaceFile is async -> all following steps must be executed within the 'then'
            getWorkspaceFile('**/scripts/functions.ps1').then(functionsPath => {
                if (terminalExists) {
                    // if terminal exists and has not exited: re-use
                    terminal.sendText(`. ${functionsPath}`);
                } else {
                    // else: open new terminal
                    terminal = startScript('','',`. ${functionsPath}`);
                }
    
                terminal.sendText(message.text);
            });

            
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  // make additional html for step fields
  private _stepInputs(nofSteps:number): string {
	let html: string = ``;

	for (let step = 1; step <= nofSteps; step++) {
		let after = '';
		switch (step) {
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

		html += /*html*/`
    <section class="component-example">
      <vscode-text-field id="inputStep${step}" placeholder="${step + after} step name...">Step ${step}</vscode-text-field>
      </section>
		`;
	  }

	// Example on reading file
	// let document = await vscode.workspace.openTextDocument(element.path);
	// document.getText();
	return html;
}

  // determine content
  private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, nofSteps: number) {
    const toolkitUri = getUri(webview, extensionUri, [
        "node_modules",
        "@vscode",
        "webview-ui-toolkit",
        "dist",
        "toolkit.js", // A toolkit.min.js file is also available
    ]);

    const mainUri = getUri(webview, extensionUri, ["scripts", "dashboard.js"]);
    // const myStyle = getUri(webview, extensionUri, ['media', 'style.css']);
    const myStyle = getUri(webview, extensionUri, ["media", "newdashboard.css"]);

    const stepIntputFields = this._stepInputs(nofSteps);

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
				<link href="${myStyle}" rel="stylesheet" /> 
			</head>
			<body>
				<div>
					<h1>New Dashboard - Webview-UI style</h1>
				</div>
        <section class="component-row">
          <section class="component-container">
            <h2>Flexible fields</h2>
            <section class="component-example">
              <p>Number of steps</p>
              <vscode-dropdown id="nofsteps" position="below">
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

              <vscode-button id="oldsteps" appearance="primary">Update</vscode-button>
            </section>

              ${stepIntputFields}
              
          </section>

          <section class="component-container">
            <h2>Powershell</h2>
            <section class="component-example">
              <p>Open new terminal</p>
              <vscode-button id="startscript" appearance="primary">Open terminal and start default script</vscode-button>
            </section>

            <section class="component-example">
              <vscode-text-area id="scriptcommand" placeholder="Enter PowerShell command..." rows="3" cols="30" resize="vertical">Enter PowerShell command and execute</vscode-text-area>
              <div>
                <vscode-button id="executecommand" appearance="primary">Execute Command</vscode-button>
              </div>
            </section>

            <section class="component-example">
              <vscode-text-area id="scriptarguments" placeholder="Enter arguments for script.ps1 ..." rows="3" cols="30" resize="vertical">Load script.ps1 from extension folder and execute with arguments</vscode-text-area>
              <div>
                <vscode-button id="executescript" appearance="primary">Execute extension script with arguments</vscode-button>
                </div>
            </section>

            <section class="component-example">
              <vscode-text-area id="functionsarguments" placeholder="Enter PowerShell command and use loaded functions from functions.ps1 ..." rows="3" cols="30" resize="vertical">Load functions.ps1 from workspace and execute command</vscode-text-area>
              <div>
                <vscode-button id="executewithfunctions" appearance="primary">Execute Script</vscode-button>
                </div>
            </section>
          </section>
          
        </section>
			</body>
		</html>
	`;
	// -----------------------
	return html;
  }


  // dispose
  public dispose() {
    NewDashboardPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}