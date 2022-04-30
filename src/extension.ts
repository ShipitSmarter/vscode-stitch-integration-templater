import * as vscode from 'vscode';
import { CreateIntegrationPanel } from "./panels/CreateIntegrationPanel";

export function activate(context: vscode.ExtensionContext) {

	// Create Integration panel
	const createIntegrationCommand = vscode.commands.registerCommand("stitch.integration-templater", () => {
		CreateIntegrationPanel.render(context.extensionUri, 0, context);
	});
	
	context.subscriptions.push(createIntegrationCommand);	
}