import { Uri, Webview, workspace , ExtensionContext, window, Terminal} from "vscode";
import * as path from "path";
import * as fs from "fs";

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

export async function getWorkspaceFile(matchString: string): Promise<string> {
	// get path to file in workspace
	let functionsFiles = await workspace.findFiles(matchString);
	return cleanPath(functionsFiles[0].fsPath);
}

export async function getWorkspaceFiles(matchString: string): Promise<string[]> {
	// get path to file in workspace
	let functionsFiles = await workspace.findFiles(matchString);
	let outFiles: string[] = [];
	for (let index = 0; index < functionsFiles.length; index++) {
		outFiles[index] = cleanPath(functionsFiles[index].fsPath);
	}
	return outFiles;
}

export function getExtensionFile(context: ExtensionContext, folder: string, file: string): string {
	// get path to file in extension folder
	let fileRawPath = Uri.file(
		path.join(context.extensionPath, folder, file)
	);

	let filePathEscaped : string = fileRawPath.toString();

	let filePath = Uri.parse(filePathEscaped).fsPath;

	return filePath;
}

export async function getAvailableIntegrations() : Promise<{path:string, carrier:string, api:string, module:string, carriercode:string}[]> {
	// pre-allocate output
	let integrationObjects : {path:string, carrier:string, api:string, module:string, carriercode:string}[] = [];

	// integration script path array
	let integrationScripts: string[] = await getWorkspaceFiles('**/carriers/*/create-*integration*.ps1');

	// build integration array
	for (const script of integrationScripts) {
		// load script content
		let scriptContent = fs.readFileSync(script, 'utf8');

		// extract carrier, api, module
		let carrier: string   = getFromScript(scriptContent,'CarrierName');
		let api: string       = getFromScript(scriptContent, 'CarrierAPI');
		let module: string    = getFromScript(scriptContent,'Module');
		let modular: boolean  = toBoolean(getFromScript(scriptContent, 'ModularXMLs').replace(/\$/,''));

		// check if any scenarios available, and if not, skip
		let scenarioGlob = modular ? `**/carriers/${carrier}/${api}/${module}/scenario-xmls/*.xml` : `**/scenario-templates/${module}/**/*.xml`;
		let scenarios: string[] = await getWorkspaceFiles(scenarioGlob);
		if (scenarios.length === 0) {
			continue;
		}

		// add array element
		integrationObjects.push({
			path: 		 script,
			carrier: 	 getFromScript(scriptContent,'CarrierName'),
			api: 		 getFromScript(scriptContent, 'CarrierAPI'),
			module: 	 getFromScript(scriptContent,'Module'),
			carriercode: getFromScript(scriptContent,'CARRIERCODE')
		});
	}

	return integrationObjects;
}

export function getFromScript(scriptContent: string, variableName: string) : string {
    let variableValue: string = '';
    let variableRegex = new RegExp(variableName + "\\s+=\\s+(\\S+)");
    let rawVariable: string[] = scriptContent.match(variableRegex) ?? [''];
    if (rawVariable.length >= 2) {
      variableValue = rawVariable[1].replace(/["'`]*/g,'');
    }

    return variableValue;
}

export function startScript (fileName ?: string , filePath ?: string , command ?: string) : Terminal {
	let terminal = window.createTerminal();
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

export function cleanPath (path: string) : string {
	return path.replace(/\\/g, '/');
}

export function parentPath (path: string) : string {
	return path.replace(/\/[^\/]+$/,'');
}

export function nth(num:number): string {
	let after:string = '';
	switch (num) {
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
	return after;
}

export function dropdownOptions(options:(string|number)[]) : string {
	let optionsString : string = '';
	for (const option of options) {
		optionsString += '\n    <vscode-option>' + option + '</vscode-option>';
	}

	return optionsString;
}

export function arrayFrom0(max:number) : number[] {
	// from https://stackoverflow.com/a/33352604/1716283
	return [...Array(max).keys()];
}

export function arrayFrom1(max:number) : number[] {
	return arrayFrom0(max).map(x => ++x);
}

export function toBoolean(string:string) : boolean {
	let outString : boolean = false;
	if (string.toLowerCase() === 'true') {
		outString = true;
	}

	return outString;
}

export function isEmpty(string: string) : boolean {
	return (string === undefined || string === null || string === '');
}

export function isEmptyStringArray(array: string[]) : boolean {
	let isEmpty: boolean = true;

	for (let index = 0; index < array.length; index++) {
        let current = array[index];
		if (current !== undefined &&  current !== "") {
			isEmpty = false;
			break;
		}
	}
	return isEmpty;
}

export function uniqueArray(array: any[]) : any[] {
	// https://stackoverflow.com/a/33121880/1716283
	return [...new Set(array)];
} 

export function uniqueSort(array: any[]) : any[] {
	return uniqueArray(array).sort();
}
