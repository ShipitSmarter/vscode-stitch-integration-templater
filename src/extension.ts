import * as vscode from 'vscode';
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { startScript } from "./utilities/functions";
import { DashboardPanel } from "./panels/DashboardPanel";
import { NewDashboardPanel } from "./panels/NewDashboardPanel";
import { CreateIntegrationPanel } from "./panels/CreateIntegrationPanel";

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

	// hello world panel (for reference)
	const helloCommand = vscode.commands.registerCommand("mypanel.helloWorld", () => {
		HelloWorldPanel.render(context.extensionUri);
	  });
	
	context.subscriptions.push(helloCommand);

	// dashboard panel
	const dashboardCommand = vscode.commands.registerCommand("mypanel.dashboard", () => {
		DashboardPanel.render(context.extensionUri, 0, context);
	});
	
	context.subscriptions.push(dashboardCommand);

	// dashboard panel VSCode webview-ui style
	const newDashboardCommand = vscode.commands.registerCommand("mypanel.newdashboard", () => {
		NewDashboardPanel.render(context.extensionUri, 0, context);
	});
	
	context.subscriptions.push(newDashboardCommand);

	// Create Integration panel
	const createIntegrationCommand = vscode.commands.registerCommand("mypanel.createintegration", () => {
		CreateIntegrationPanel.render(context.extensionUri, 0, context);
	});
	
	context.subscriptions.push(createIntegrationCommand);

	
}