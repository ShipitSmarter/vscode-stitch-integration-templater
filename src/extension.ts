import * as vscode from 'vscode';
import { CreateIntegrationPanel } from "./panels/CreateIntegrationPanel";
import { CreatePostmanCollectionPanel } from './panels/CreatePostmanCollectionPanel';
import { ParameterPanel } from './panels/ParameterPanel';

export function activate(context: vscode.ExtensionContext) {

	// Create Integration panel
	const createIntegrationCommand = vscode.commands.registerCommand("stitch.integration-templater", () => {
		CreateIntegrationPanel.render(context.extensionUri, 0, context);
	});
	
	context.subscriptions.push(createIntegrationCommand);
	
	// Create Postman collection panel
	const createPostmanCollectionCommand = vscode.commands.registerCommand("stitch.postman-collection", () => {
		CreatePostmanCollectionPanel.render(context.extensionUri, 0, context);
	});
	
	context.subscriptions.push(createPostmanCollectionCommand);

	// Create Parameter panel
	const parameterCommand = vscode.commands.registerCommand("stitch.parameters", () => {
		ParameterPanel.render(context.extensionUri, context);
	});
	
	context.subscriptions.push(parameterCommand);
}