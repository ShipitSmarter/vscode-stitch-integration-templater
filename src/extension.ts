import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('mypanel.start', () => {
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
			panel.webview.html = getMyWebviewContent(panel.webview, context);

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
					}

					return;
				},
				undefined,
				context.subscriptions
			);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('mypanel.startPowerShellScript', (uri, files) => {
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
		})
	);
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

function getMyWebviewContent(webview: vscode.Webview, context: any): string {
	let html: string = ``;

	const myStyle = webview.asWebviewUri(vscode.Uri.joinPath(
		context.extensionUri, 'media', 'style.css'));   // <--- 'media' is the folder where the .css file is stored

	// construct your HTML code
	html += `
		<!DOCTYPE html>
		<html>
			<head>
				<link href="${myStyle}" rel="stylesheet" />   
			</head>
			<body>
				<button class="button-34" role="button" onclick="startScript()" id="startScript">Start script</button>
				<div class="main"> 
					<h1>...</h1>
				</div>
				<div>
					<input type="text" maxlength="512" id="ScriptCommand" class="searchField"/>
				</div>
				<div>
				</div>
				<div>
					<button class="button-34" role="button" onclick="executeCommand()" id="executeCommand">Execute Command</button>
				</div>
				

				<script>
					const vscodeApi = acquireVsCodeApi(); 
					var ScriptCommand = '';

					function startScript(){
						vscodeApi.postMessage({command: "startScript", text: "Start Selected Script"});
				  	};

					function executeCommand() {
						ScriptCommand = document.getElementById('ScriptCommand').value;
						vscodeApi.postMessage({command: "executeCommand", text: ScriptCommand});
					};
				</script>
			</body>
		</html>
	`;
	// -----------------------
	return html;
}