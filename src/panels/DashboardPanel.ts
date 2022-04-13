import * as vscode from "vscode";
import { getUri, getWorkspaceFile, getExtensionFile } from "../utilities/functions";

export class DashboardPanel {
  // PROPERTIES
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  // constructor
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, nofSteps: number) {
    this._panel = panel;

    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, nofSteps);
    this._setWebviewMessageListener(extensionUri, this._panel.webview);

    // on dispose
    this._panel.onDidDispose(this.dispose, null, this._disposables);
  }

  // METHODS
  // initial rendering
  public static render(extensionUri: vscode.Uri, nofSteps: number) {
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("dashboard", "My Dashboard", vscode.ViewColumn.Two, {
        enableScripts: true
      });

      DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, nofSteps);
    }
  }

  // update number of step fields
  private _updateWebview(extensionUri: vscode.Uri, nofSteps: number) {
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, nofSteps);
  }

  // message listener
  private _setWebviewMessageListener(extensionUri: vscode.Uri, webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {
          case "hello":
            vscode.window.showInformationMessage(text);
            break;
        case 'updateNofSteps':
            vscode.window.showInformationMessage(`Updated number of step input fields to ${text}`);
            this._updateWebview(extensionUri, text);
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
		<label for="inputStep${step}">Step ${step}</label>
		<input type="text" maxlength="512" id="inputStep${step}" placeholder="${step + after} step name...">
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
    const myStyle = getUri(webview, extensionUri, ['media', 'style.css']);

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
					<h2>PowerShell</h2>
				</div>
				<label for="startScript">Open new terminal</label>
				<input type="submit" onclick="startScript()" id="startScript" value="Open terminal and start default script">

				<label for="ScriptCommand">Enter PowerShell command and execute</label>
				<input type="text" id="ScriptCommand" placeholder="Enter PowerShell command...">
				<input type="submit" onclick="executeCommand()" id="executeCommand" value="Execute Command">

				<label for="ScriptArguments">Load script.ps1 from extension folder and execute with arguments</label>
				<input type="text" id="ScriptArguments" placeholder="Enter arguments for script.ps1 ...">
				<input type="submit" onclick="executeScript()" id="executeScript" value="Execute Script with arguments">

				<label for="FindScriptArguments">Load functions.ps1 from workspace and execute command</label>
				<input type="text" id="FindScriptArguments" placeholder="Enter PowerShell command and use loaded functions from functions.ps1 ...">
				<input type="submit" onclick="findAndExecuteScript()" id="findAndExecuteScript" value="Execute Script">
				

				<div class="main"> 
					<h1>Flexible fields</h1>
				</div>

				<label for="fname">Number of steps</label>
				<input type="text" id="nofsteps" name="firstname" placeholder="Needs integer...">
				<input type="submit" id="oldsteps" value="Update">

                <vscode-button id="howdy">Howdy!</vscode-button>
				
                ${stepIntputFields}
			</body>
		</html>
	`;
	// -----------------------
	return html;
  }


  // dispose
  public dispose() {
    DashboardPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}