import * as vscode from 'vscode';
import { CreateIntegrationPanel } from "./panels/CreateIntegrationPanel";
import { CreatePostmanCollectionPanel } from './panels/CreatePostmanCollectionPanel';
import { ParameterPanel } from './panels/ParameterPanel';
import { getWorkspaceFile } from './utilities/functions';

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
			// const filePath: string = files[0].path.substring(1);
			const filePath = files[0].fsPath;
			ParameterPanel.render(context.extensionUri, context, filePath);
		}
	});
	context.subscriptions.push(parameterLoadCommand);

	// sort .sbn functions file
	const sortScribanFunctionsFileCommand = vscode.commands.registerCommand("stitch.scriban-functions-sort", (uri,files) => {
		// get file name and path
		let filePath = '';
		let fileName = '';

		if(typeof files !== 'undefined' && files.length > 0) {
			filePath = files[0].fsPath;
			fileName = filePath.replace(/\\/g, '/').split('/').pop() ?? '';
		}

		// get functions.ps1 name and path
		let functionsFileName = 'functions.ps1';
		getWorkspaceFile('**/scripts/' + functionsFileName).then((sortFunctionsPath => {
			let sortFunctionsDirectory = sortFunctionsPath.replace(/\\/g, '/').replace(/\/[^\/]+$/,'');

			// execute sort command in terminal
			let terminal = vscode.window.createTerminal();
			terminal.show();
			terminal.sendText(`cd ${sortFunctionsDirectory}`);
			terminal.sendText(`. ./${functionsFileName}`);
			terminal.sendText(`Update-SortScribanFile "${filePath}"`);

			// let user know the sort has been executed
			vscode.window.showInformationMessage(`File ${fileName} has been sorted`);
		}));

		
	});
	context.subscriptions.push(sortScribanFunctionsFileCommand);
	
	
}