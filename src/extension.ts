import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('mypanel.start', () => {
			// Create and show panel
			const panel = vscode.window.createWebviewPanel(
				'mypanel',  // <--- identifier
				'Stitch dashboard', // <--- title
				vscode.ViewColumn.Two,
					{}
			);

			// And set its HTML content
			panel.webview.html = getMyWebviewContent(panel.webview, context);   // <--- HTML
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('mypanel.startPowerShellScript1', (uri, files) => {
			let fileName = '';
			let filePath = '';

			if(typeof files !== 'undefined' && files.length > 0) {
				let url = vscode.workspace.asRelativePath(files[0].path);
				fileName = url.replace(/\\/g, '/').split('/').pop() ?? 'leeg';
				filePath = url.replace(/\\/g, '/').replace(/\/[^\/]+$/,'');
				let henk = '';

			} else if(uri) {
				
			}

			let terminal = vscode.window.createTerminal('bram');
			terminal.show();
			//terminal.sendText('Get-Location');
			terminal.sendText(`cd ${filePath}`);
			terminal.sendText(`./${fileName}`);

		})
	);
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
				<button class="button-34" role="button">Button 34</button>
				<div class="main"> 
					<h1>Dashboard</h1>
						<div>1</div>
						<div>2</div>
					<h1>Scenarios</h1>
					<div class="scenarios">
						<h2>From</h2>
						<h2>To</h2>
						<h2>ServicesLevel</h2>
						<h2>Other Options</h2>
						<li>tests<li>
					</div>
				</div>
			</body>
		</html>
	`;
	// -----------------------
	return html;
}