import { Uri, Webview, workspace , ExtensionContext, window, Terminal} from "vscode";
import * as path from "path";
import * as fs from "fs";
import axios from 'axios';

export async function getParameter(baseurl:string, authorization:string, parameterName:string, codeCompany:string, handlingAgent:string): Promise<string> {
    let result: string = '';
	try {
		const response = await axios({
			method: "GET",
			url: `${baseurl}/${parameterName}/${handlingAgent}`,
			responseType: 'arraybuffer',
			responseEncoding: "binary",
			headers: {
				'CodeCompany': codeCompany,
				'Authorization': authorization
			}
		});

		//https://stackoverflow.com/questions/42785229/axios-serving-png-image-is-giving-broken-image
		result = removeQuotes(Buffer.from(response.data).toString());

	} catch (err) {
		result = err.message +'';
	}

    return result;
};

export function escapeHtml(unsafe:string): string {
	// from https://stackoverflow.com/a/6234804/1716283
	return unsafe
		 .replace(/&/g, "&amp;")
		 .replace(/</g, "&lt;")
		 .replace(/>/g, "&gt;")
		 .replace(/"/g, "&quot;")
		 .replace(/'/g, "&#039;");
}

export function removeQuotes(input:string): string {
	let output = input.replace(/^["']/,'').replace(/["']$/,'');
	return output;
}

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

export async function getAvailableScenarios(module:string, withParent:boolean = true): Promise<string[]> {
    let bookingScenarioXmls: string[] = await getWorkspaceFiles('**/scenario-templates/' + module + '/**/*.xml');

    let bookingScenarios: string[] = new Array<string>(bookingScenarioXmls.length);

    for (let index = 0; index < bookingScenarioXmls.length; index++) {
      let scenarioName = (cleanPath(bookingScenarioXmls[index]).split('/').pop() ?? '').replace(/.xml$/, '');
      let scenarioParentName = parentPath(cleanPath(bookingScenarioXmls[index])).split('/').pop() ?? '';
      // only show parent indicator if not [module]
      if (scenarioParentName === module) {
        scenarioParentName = '';
      }
      bookingScenarios[index] = withParent ? `${scenarioParentName} > ${scenarioName}` : scenarioName;
    }

    return bookingScenarios.sort();
}

export async function getModularElements(module:string): Promise<string[]> {
    return (await getModularElementsWithParents(module)).map(el => el.element).sort();
}

export async function getModularElementsWithParents(module:string): Promise<{parent:string, element:string, multi:boolean}[]> {
    let elementXmls: string[] = await getWorkspaceFiles('**/scenario-templates/modular/' + module + '/**/*.xml');
    let parentsElementsMulti: {parent:string, element:string, multi:boolean}[] = new Array<{parent:string, element:string, multi:boolean}>(elementXmls.length);

    for (let index = 0; index < elementXmls.length; index++) {
	  // element, parent
      let elementName = (cleanPath(elementXmls[index]).split('/').pop() ?? '').replace(/.xml$/, '');
      let elementParentName = parentPath(cleanPath(elementXmls[index])).split('/').pop() ?? '';

	  // only show parent indicator if not [module]
      if (elementParentName === module) {
        elementParentName = '';
      }

	  // read file to extract multi
	  let elementContent = fs.readFileSync(elementXmls[index], 'utf8');
	  let multi = elementContent.includes('<ShipmentPackage>');
      
	  // build output
      parentsElementsMulti[index] = {
		parent: elementParentName,
		element: elementName, 
		multi: multi
	  };
    }

    return parentsElementsMulti.sort();
}

export async function getPostmanCollectionFiles(): Promise<{parent:string, file:string, path:string}[]> {
	let pmcPaths: string[] = (await getWorkspaceFiles('**/postman/**/*.json')).map(el => cleanPath(el));

	// pre-allocate output
	let pmcObjects : {parent:string, file:string, path:string}[] = new Array<{parent:string, file:string, path:string}>(pmcPaths.length);

	// build pmcObjects array
	for (let index = 0; index < pmcPaths.length; index++) {

		pmcObjects[index] = {
			parent: nameFromPath(parentPath(pmcPaths[index])),
			file: nameFromPath(pmcPaths[index]),
			path: pmcPaths[index]
		};
	}

	return pmcObjects;
}

export function getScenarioAndStructure(path:string) : {name:string, structure:string} {
	// name
	let name = nameFromPath(path);

	// structure
	let structurePath = path + '/structure.jsonc';
	let structureExists: boolean = fs.existsSync(structurePath);
	let structure = structureExists ? JSON.parse(fs.readFileSync(structurePath, 'utf8')).structure : name;

	// return as object
	return {
		name: name,
		structure: structure
	};
}

export async function getAvailableIntegrations(panel:string) : Promise<{path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios:string[], validscenarios: {name:string, structure:string}[]}[]> {
	// panel input: 'integration' or 'postman'

	// integration script path array
	let integrationScripts: string[] = await getWorkspaceFiles('**/carriers/*/create-*integration*.ps1');

	// pre-allocate output
	let integrationObjects : {path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios: string[], validscenarios: {name:string, structure:string}[]}[] = new Array<{path:string, carrier:string, api:string, module:string, carriercode:string, modular: boolean, scenarios: string[], validscenarios: {name:string, structure:string}[]}>(integrationScripts.length);

	// build integration array
	let newIndex: number = 0;
	for (let index = 0; index < integrationScripts.length; index++) {
		let script = integrationScripts[index];
		// load script content
		let scriptContent = fs.readFileSync(script, 'utf8');

		// extract carrier, api, module
		let carrier: string   = getFromScript(scriptContent,'CarrierName');
		let api: string       = getFromScript(scriptContent, 'CarrierAPI');
		let module: string    = getFromScript(scriptContent,'Module');
		let modular: boolean  = toBoolean(getFromScript(scriptContent, 'ModularXMLs').replace(/\$/,''));

		// if integration path does not exist: skip
		let integrationPath = parentPath(cleanPath(script)) + `/${api}/${module}`;
		let exists = fs.existsSync(integrationPath);
		if (!exists) {
			continue;
		}

		// check if any scenarios available, and if not, skip (because cannot make postman collection)
		if (panel === 'postman') {
			let scenarioGlob = modular ? `**/carriers/${carrier}/${api}/${module}/scenario-xmls/*.xml` : `**/scenario-templates/${module}/**/*.xml`;
			let scenarios: string[] = await getWorkspaceFiles(scenarioGlob);
			if (scenarios.length === 0) {
				continue;
			}
		}

		// obtain valid scenarios from scenarios folder
		let scenariosDir: string = parentPath(cleanPath(script)) + `/${api}/${module}/scenarios`;
		let scenarioDir = fs.readdirSync(scenariosDir);
		let integrationScenarios = scenarioDir.filter(el => !el.includes('.')).sort();

		let scenarioNameStructures: {name:string, structure:string}[] = new Array<{name:string, structure:string}>(integrationScenarios.length);
		for (let index = 0; index < scenarioNameStructures.length; index++) {
			scenarioNameStructures[index] = getScenarioAndStructure(scenariosDir + '/' + integrationScenarios[index]);
		}

		//let scenarioStructures = scenarioDir.map((el) => fs.existsSync(scenariosDir + '/' + el + '/structure.jsonc') ? JSON.parse(fs.readFileSync(scenariosDir + '/' + el + '/structure.jsonc', 'utf8')).structure : el);

		// filter on valid scenarios
		let availableScenarios = await getAvailableScenarios(module, false);
		let modularElements = (await getModularElementsWithParents(module)).map(el => (isEmpty(el.parent) ? '' : (el.parent.replace(/[^_]*_/g,'') + ':')) + el.element);
		let validScenarios : {name:string, structure:string}[] = scenarioNameStructures.filter(el => isScenarioValid(el.structure, availableScenarios, modularElements));

		// add array element
		integrationObjects[newIndex] = {
			path: 		 script,
			carrier: 	 carrier,
			api: 		 api,
			module: 	 module,
			carriercode: getFromScript(scriptContent,'CARRIERCODE'),
			modular: 	 modular,
			scenarios:   scenarioNameStructures.map(el => el.name),
			validscenarios: validScenarios
		};

		newIndex++;
	}

	return integrationObjects.slice(0,newIndex);
}

export function isScenarioValid(scenario:string, availableScenarios: string[], modularElements: string[]) : boolean {
	let isValid = true;
	let modular = scenario.startsWith('m-');
	if (modular) {
		let currentElements = scenario.split('-');
		for (const element of currentElements) {
			if (!modularElements.includes(element.replace(/\_\d+/g,''))) {
				isValid = false;
				break;
			}
		}
	} else {
		isValid = availableScenarios.includes(scenario);
	}

	return isValid;
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

export function nameFromPath (path: string) : string {
	return path.replace(/^[\s\S]*[\/\\]/g,'');
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

export function isModular(scenario:string) : boolean {
	return scenario.startsWith('m-');
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

export function hiddenString(ifTrue: boolean): string {
    return ifTrue ? '' : 'hidden' ;
}

export function disabledString(ifTrue: boolean): string {
    return ifTrue ? '' : 'disabled' ;
}

export function checkedString(checked: boolean): string {
    return checked ? 'checked' : '';
}

export function readonlyString(ifTrue: boolean) : string {
	return ifTrue ? 'readonly' : '';
}
  
export function valueString(string: string): string {
    return !isEmpty(string) ? `value="${string}"` : '' ;
}
