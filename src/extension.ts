import * as vscode from 'vscode';
import { CreateIntegrationPanel } from "./panels/CreateIntegrationPanel";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { startScript } from "./utilities/functions";
import { DashboardPanel } from "./panels/DashboardPanel";

export function activate(context: vscode.ExtensionContext) {

	// powershell script right-mouse button option
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