import * as vscode from 'vscode';
import { CreateIntegrationPanel } from "./panels/CreateIntegrationPanel";
import { CreatePostmanCollectionPanel } from './panels/CreatePostmanCollectionPanel';
import { ParameterPanel } from './panels/ParameterPanel';
import { executePowershellFunction, getCleanFilePathAndName, getWorkspaceFile } from './utilities/functions';

export function activate(context: vscode.ExtensionContext) {

	// Create Integration panel
	const createIntegrationCommand = vscode.commands.registerCommand("stitch.integration-templater", () => {
		CreateIntegrationPanel.render(context.extensionUri, 0, context);
	});
	context.subscriptions.push(createIntegrationCommand);
	
	// Create integration panel and open integration json file
	const integrationLoadCommand = vscode.commands.registerCommand("stitch.integration-templater-loadjson", (uri,files) => {
		if(typeof files !== 'undefined' && files.length > 0) {
			const filePath = files[0].fsPath;
			CreateIntegrationPanel.render(context.extensionUri, 0, context, filePath);
		}
	});
	context.subscriptions.push(integrationLoadCommand);

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

	// Create parameter panel and open CSV file
	const parameterLoadCommand = vscode.commands.registerCommand("stitch.parameters-loadcsv", (uri,files) => {
		if(typeof files !== 'undefined' && files.length > 0) {
			const filePath = files[0].fsPath;
			ParameterPanel.render(context.extensionUri, context, filePath);
		}
	});
	context.subscriptions.push(parameterLoadCommand);

	// update parameterconfigs CSV file
	const updateParameterConfigsFileCommand = vscode.commands.registerCommand("stitch.parameterconfigs-update", (uri,files) => {
		let filePathName = getCleanFilePathAndName(files);

		let carrier: string = filePathName.filePath.replace(/^.*carriers\//g,'').replace(/\/.*$/g,'');

		let commands:string[] = [`New-UpdateParameterConfigsCSV "${filePathName.filePath}" -Test`];
		let informationMessage:string = `ParameterConfigs.csv has been updated for carrier ${carrier}`;

		// execute
		executePowershellFunction(commands, informationMessage);

	});
	context.subscriptions.push(updateParameterConfigsFileCommand);

	// sort .sbn functions file
	const sortScribanFunctionsFileCommand = vscode.commands.registerCommand("stitch.scriban-functions-sort", (uri,files) => {
		let filePathName = getCleanFilePathAndName(files);

		let commands:string[] = [`Update-SortScribanFile "${filePathName.filePath}"`];
		let informationMessage:string = `File ${filePathName.fileName} has been sorted`;

		// execute
		executePowershellFunction(commands, informationMessage);

	});
	context.subscriptions.push(sortScribanFunctionsFileCommand);
}