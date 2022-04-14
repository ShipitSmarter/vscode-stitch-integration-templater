import * as vscode from 'vscode';
import * as path from 'path';
import { CreateIntegrationPanel } from "./panels/CreateIntegrationPanel";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { getUri, getWorkspaceFile, getExtensionFile } from "./utilities/functions";
import { DashboardPanel, DashboardPanel } from "./panels/DashboardPanel";

export function activate(context: vscode.ExtensionContext) {

	const oldDashboardCommand = vscode.commands.registerCommand('mypanel.start', () => {
			// Create and show panel
			const panel = vscode.window.createWebviewPanel(
				'mypanel',  // <--- identifier
				'Stitch dashboard', // <--- title
				vscode.ViewColumn.Two,
					{
						// Enable scripts in the webview
						enableScripts: true
					}
			);

			// And set its HTML content
			const updateWebview = (nofSteps: number) => {
				getMySimpleWebviewContent(panel.webview, context, nofSteps).then(html =>panel.webview.html = html);   // <--- HTML
			};

			// generate initial WebView content
			updateWebview(0);

			// Get path to functions.ps1 file in workspace
			let functionsPath: string;
			getWorkspaceFile('**/scripts/functions.ps1').then(outFile => functionsPath = outFile);

			// Pre-allocate terminal and terminalExists
			let terminal: vscode.Terminal;
			let terminalExists: boolean;

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(
				message => {
					// check if terminal exists and is still alive
					terminalExists = (terminal && !(terminal.exitStatus));

					switch (message.command) {
						case 'startScript':
							if (!terminalExists) {
								vscode.window.showErrorMessage(message.text);
								terminal = startScript('','',`Write-Host 'Hello World!'`);
							} else {
								vscode.window.showErrorMessage('Script already started!');
							}
							break;

						case 'executeCommand':
							vscode.window.showErrorMessage('Executing user input command');

							if (terminalExists) {
								// if terminal exists and has not exited: re-use
								terminal.sendText(message.text);
							} else {
								// else: open new terminal
								terminal = startScript('','',message.text);
							}
							break;

						case 'executeScript':
							vscode.window.showErrorMessage('Executing script with user arguments');

							
							// text to send: dot-source script and add arguments
							let scriptPath = getExtensionFile(context,'scripts','script.ps1');
							var sendText: string = `. ${scriptPath} -message ${message.text}`;

							if (terminalExists) {
								// if terminal exists and has not exited: re-use
								terminal.sendText(sendText);
							} else {
								// else: open new terminal
								terminal = startScript('','',sendText);
							}
							break;

						case 'findAndExecuteScript':
							vscode.window.showErrorMessage('Dot-Source functions file and execute script');

							if (terminalExists) {
								// if terminal exists and has not exited: re-use
								terminal.sendText(`. ${functionsPath}`);
							} else {
								// else: open new terminal
								terminal = startScript('','',`. ${functionsPath}`);
							}

							terminal.sendText(message.text);
							break;

						case 'updateNofSteps':
							vscode.window.showErrorMessage(`Updated number of step input fields to ${message.text}`);
							updateWebview(message.text);
							break;
					}

					return;
				},
				undefined,
				context.subscriptions
			);
	});
	context.subscriptions.push(oldDashboardCommand);

	// create dashboard panel
	const powershellScriptCommand = vscode.commands.registerCommand('mypanel.startPowerShellScript', (uri, files) => {
			let fileName = '';
			let filePath = '';

			if(typeof files !== 'undefined' && files.length > 0) {
				let url = vscode.workspace.asRelativePath(files[0].path);
				fileName = url.replace(/\\/g, '/').split('/').pop() ?? 'leeg';
				filePath = url.replace(/\\/g, '/').replace(/\/[^\/]+$/,'');
				let henk = '';

			} else if(uri) {
				
			}

			startScript(fileName, filePath);
	});
	
	context.subscriptions.push(powershellScriptCommand);

	// dashboard panel new style
	const dashboardCommand = vscode.commands.registerCommand("mypanel.dashboard", () => {
		DashboardPanel.render(context.extensionUri, 0, context);
	});
	
	context.subscriptions.push(dashboardCommand);

	// create integration panel
	const createIntegrationCommand = vscode.commands.registerCommand("mypanel.createIntegration", () => {
		CreateIntegrationPanel.render(context.extensionUri);
	  });
	
	context.subscriptions.push(createIntegrationCommand);

	// hello world panel (for reference)
	const helloCommand = vscode.commands.registerCommand("mypanel.helloWorld", () => {
		HelloWorldPanel.render(context.extensionUri);
	  });
	
	context.subscriptions.push(helloCommand);
}

function startScript (fileName ?: string , filePath ?: string , command ?: string) : vscode.Terminal {
	let terminal = vscode.window.createTerminal('bram');
	terminal.show();
	//terminal.sendText('Get-Location');
	if (filePath && filePath !== '') {
		terminal.sendText(`cd ${filePath}`);
	};
	
	if (fileName && fileName !== '') {
		terminal.sendText(`./${fileName}`);
	};

	if (command && command !== '') {
		terminal.sendText(command);
	};
	
	return terminal;

}

function stepInputs(nofSteps:number): string {
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

		html += `
		<label for="inputStep${step}">Step ${step}</label>
		<input type="text" maxlength="512" id="inputStep${step}" placeholder="${step + after} step name...">
		`;
	  }

	// Example on reading file
	// let document = await vscode.workspace.openTextDocument(element.path);
	// document.getText();
	return html;
}

async function getMySimpleWebviewContent(webview: vscode.Webview, context: any, nofSteps:number): Promise<string> {

	const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'style.css'));   // <--- 'media' is the folder where the .css file is stored
	const scriptURI = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'scripts', 'main.js')); 

	let stepIntputFields = stepInputs(nofSteps);

	// construct your HTML code
	let html =  /*html*/`
		<!DOCTYPE html>
		<html>
			<head>
				<link href="${myStyle}" rel="stylesheet" />
				<script src="${scriptURI}"></script>    
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
				<input type="text" id="nofSteps" name="firstname" placeholder="Needs integer...">
				<input type="submit" onclick="updateNofSteps()" id="updateNofSteps" value="Update">
				
				${stepIntputFields}
			</body>
		</html>
	`;
	// -----------------------
	return html;
}