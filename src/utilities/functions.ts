import { Uri, Webview, workspace , ExtensionContext, window, Terminal} from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

// type definitions
type ScenarioObject = {
	name: string,
	structure: string
};
  
type IntegrationObject = {
	path:string, 
	carrier:string, 
	api:string, 
	module:string, 
	carriercode:string,
	scenarios:string[], 
	validscenarios: ScenarioObject[],
	steps: string[]
};

type ElementsObject = {carrier:string, api:string, module:string};
  
type ModularElementObject = {
	parent:string, 
	element:string, 
	multi:boolean
};

type FileObject = {
	parent: string,
	file: string,
	path: string
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

export async function getWorkspaceFile(matchString: string | vscode.RelativePattern, showErrorMode:string = 'verbose'): Promise<string> {
	// get path to file in workspace
	// suppress ui user error output by setting showErrorMode = 'silent'
	let outPath = '';
	let functionsFiles = await workspace.findFiles(matchString);
	if (functionsFiles.length > 0) {
		outPath = cleanPath(functionsFiles[0].fsPath);
	} else if (showErrorMode !== 'silent') {
		vscode.window.showErrorMessage('Could not locate file ' + matchString);
	}

	return outPath;
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

export async function getModularElementsWithParents(module:string): Promise<ModularElementObject[]> {
    let elementXmls: string[] = await getWorkspaceFiles('**/scenario-templates/modular/' + module + '/**/*.xml');
    let parentsElementsMulti: ModularElementObject[] = new Array<ModularElementObject>(elementXmls.length);

    for (let index = 0; index < elementXmls.length; index++) {
	  // element, parent
      let elementName = (cleanPath(elementXmls[index]).split('/').pop() ?? '').replace(/.xml$/, '');
      let elementParentName = parentPath(cleanPath(elementXmls[index])).split('/').pop() ?? '';

	  // skip elements of parent 'packages'
	  if (elementParentName.includes('packages') ) {
		continue;
	  }

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

    return parentsElementsMulti.filter(el => el !== null).sort();
}

export async function getPackageTypes(module:string) : Promise<string[]> {
	let packageXmls: string[] = await getWorkspaceFiles('**/scenario-templates/modular/' + module + '/**/*packages*/*.xml');
	let packageNames: string[] = packageXmls.map(path => (cleanPath(path).split('/').pop() ?? '').replace(/.xml$/, ''));
	return packageNames.sort();
}

export async function getPostmanCollectionFiles(): Promise<FileObject[]> {
	let pmcPaths: string[] = (await getWorkspaceFiles('**/postman/**/*.json')).map(el => cleanPath(el));

	// pre-allocate output
	let pmcObjects : FileObject[] = new Array<FileObject>(pmcPaths.length);

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

export function getScenarioAndStructure(path:string) : ScenarioObject {
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

export async function getIntegration(inputIntegrationJsonPath:string) : Promise<IntegrationObject> {
	let outIntegrationObject : IntegrationObject = {path: '', carrier: '', api: '', module: '', carriercode: '', scenarios: [], validscenarios: [], steps: []};

	if (!isEmpty(inputIntegrationJsonPath)) {
		const integrationJsonPath: string = cleanPath(inputIntegrationJsonPath);

		let elements = getElementsFromIntegrationPath(integrationJsonPath);

		let carrier: string   = elements.carrier;
		let api: string       = elements.api;
		let module: string    = elements.module;
		
		// extract steps from integration json
		let steps: string[] = getStepsFromIntegrationJson(integrationJsonPath);

		// obtain valid scenarios from scenarios folder
		let scenariosDir: string = parentPath(integrationJsonPath) + '/scenarios';
		let scenarioDir = fs.readdirSync(scenariosDir);
		let integrationScenarios = scenarioDir.filter(el => !el.includes('.')).sort();

		let scenarioNameStructures: ScenarioObject[] = new Array<ScenarioObject>(integrationScenarios.length);
		for (let index = 0; index < scenarioNameStructures.length; index++) {
			scenarioNameStructures[index] = getScenarioAndStructure(scenariosDir + '/' + integrationScenarios[index]);
		}

		// filter on valid scenarios
		let availableScenarios = await getAvailableScenarios(module, false);
		let modularElements = (await getModularElementsWithParents(module)).map(el => (isEmpty(el.parent) ? '' : (el.parent.replace(/[^_]*_/g,'') + ':')) + el.element);
		let validScenarios : ScenarioObject[] = scenarioNameStructures.filter(el => isScenarioValid(el.structure, availableScenarios, modularElements));

		// return integration object
		outIntegrationObject = {
			path: 		 integrationJsonPath,
			carrier: 	 carrier,
			api: 		 api,
			module: 	 module,
			carriercode: '',
			scenarios:   scenarioNameStructures.map(el => el.name),
			validscenarios: validScenarios,
			steps: 		 steps
		};
	}

	return outIntegrationObject;		
}

export async function getAvailableIntegrations(panel:string) : Promise<IntegrationObject[]> {
	// panel input: 'integration' or 'postman'

	// integration json path array
	let integrationJsons: string[] = await getWorkspaceFiles('**/carriers/**/*.integration.json');

	// pre-allocate output
	let integrationObjects : IntegrationObject[] = new Array<IntegrationObject>(integrationJsons.length);

	// build integration array
	let newIndex: number = 0;
	for (let index = 0; index < integrationJsons.length; index++) {
		// extract integration object
		let intObject: IntegrationObject = await getIntegration(integrationJsons[index]);

		// check if any scenarios available, and if not, skip (because cannot make postman collection)
		if (panel === 'postman') {
			let scenarioGlob = `**/scenario-templates/${intObject.module}/**/*.xml`;
			let scenarios: string[] = await getWorkspaceFiles(scenarioGlob);
			if (scenarios.length === 0) {
				continue;
			}
		}
		
		// add array element
		integrationObjects[newIndex] = intObject;
		newIndex++;
	}

	return integrationObjects.slice(0,newIndex);
}

export function getElementsFromIntegrationPath(integrationJsonPath:string) : ElementsObject {
	let integrationSubPath: string = cleanPath(integrationJsonPath).replace(/[\s\S]*\/carriers\//,'').replace(/\/[^\/]*$/,'');
	let subPathElements : string[] = integrationSubPath.split('/');

	return {
		carrier: 	subPathElements[0] ?? '',
		api: 		subPathElements.length === 3 ? subPathElements[1] : '',
		module: 	subPathElements.pop() ?? ''
	};
}

export function getIntegrationSubpath(elements:ElementsObject) : string {
	let apiSubPath: string = isEmpty(elements.api) ? '' : `${elements.api}/`;
	return `${elements.carrier}/${apiSubPath}${elements.module}`;
}

export function getStepsFromIntegrationJson(integrationJsonPath:string) : string[] {
	const content = fs.readFileSync(integrationJsonPath, 'utf8');
	const jsonContent = JSON.parse(content);

	let steps = [];
	for (let index = 0; index < jsonContent.Steps.length; index++) {
		let step = jsonContent.Steps[index];
		let stepId = step.Id;
		let stepType = (step.$type.match(/(?<=\.)[^\.]*(?=Configuration)/)[0] ?? '').toLowerCase();
		let stepMethod = step?.Method?.toLowerCase();
		steps[index] = `${step.Id}:${stepType}`;

		if (stepType === 'http') {
			steps[index] += `-${stepMethod}`;
		}
	}

	return steps;
}

export function isScenarioValid(scenario:string, availableScenarios: string[], modularElements: string[]) : boolean {
	let isValid = true;
	let modular = scenario.startsWith('m-');
	if (modular) {
		let currentElements = scenario.split('-');
		for (const element of currentElements) {
			if (!modularElements.includes(element.replace(/\_[\s\S]+/g,''))) {
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

export function selectOptions(options: (string|number)[], selected: (string|number) = '') : string {
	let optionsString : string = '';
	for (const option of options) {
		let selectedString = option === selected ? 'selected' : '';
		optionsString += `\n    <option value="${option}" ${selectedString}>${option}</option>`;
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

export function backgroundColorString(color:string): string {
	let bColorString:string = '';
	if (!isEmpty(color)) {
		bColorString = `style="background-color:${color}"`;
	}
	return bColorString;
}

export async function getFileContentFromGlob(glob:string|vscode.RelativePattern) : Promise<string> {
	let content: string = '';
	let path = await getWorkspaceFile(glob);
	if (!isEmpty(path)) {
		content = fs.readFileSync(path, 'utf8');
	}
	return content;
}

export function getDateTimeStamp() : string {
	// create datetimestamp in format YYYYMMDD_hhmmss
	return (new Date()).toISOString().substring(0,19).replace(/[\-:]/g,'').replace(/T/g,'_');
}

export function isFile(path:string) : boolean {
	let isF:boolean = true;
	try {
		fs.lstatSync(path).isFile();
	} catch (err) {
		isF = false;
	}

	return isF;
}

export function isDirectory(path:string) : boolean {
	let isDir:boolean = true;
	try {
		let check:boolean = fs.lstatSync(path).isDirectory();
		isDir = check;
	} catch (err) {
		isDir = false;
	}

	return isDir;
}

export async function getRootPath() : Promise<string> {
	let functionsPath: string = await getWorkspaceFile('**/scripts/functions.ps1');
	let rootPath: string = parentPath(parentPath(parentPath(parentPath(cleanPath(functionsPath)))));
	return rootPath;
}

export async function saveAuth() {
	// constants
	const fileRelPath: string = 'authentication/auth.json';

    // get file path
    let filePath = (await getRootPath()) + '/' + fileRelPath;

    // get file content
    let fileContent:string = `{\r\n    "BasicAuthenticationString": "${getAuth()}"\r\n}`;

	// show error if auth string has not been set
	checkAuth();

    // make dir if not exists
    let fileDir = parentPath(filePath);
    fs.mkdirSync(fileDir,{ recursive: true });

    // write to file
    fs.writeFileSync(filePath,fileContent,{encoding:'utf8',flag:'w'});

    // tell the world
    vscode.window.showInformationMessage(`Saved auth to ${nameFromPath(filePath)}`);
}

export function getAuth() : string {
// get user/pw from input/file
// let user: string = this._fieldValues[userIndex];
// let pw: string = this._fieldValues[pwIndex];
// let authString:string = Buffer.from(user + ':' + pw).toString('base64');
// return 'Basic ' + authString;

// get string from settings
let authString: string = vscode.workspace.getConfiguration().get<string>('stitch.basicAuthenticationString') ?? '';

return authString;
}

export function getUserPwdFromAuth(auth:string) : string[] {

// ignore everything before and including the space (if present)
const pureAuth:string = auth.replace(/[\s\S]*\s/g,'');

// decode
const buffer = Buffer.from(pureAuth,'base64');
const userPwd = buffer.toString();

const user = userPwd.replace(/:[\s\S]*/g,''); 		// user is anything before the first colon
const pwd  = userPwd.replace(/^[^:]*:/g,''); 		// pwd is anything after the first colon

return [user, pwd];
}

export function checkAuth() : boolean {
let isValid: boolean = getAuth().length > 10;
if (!isValid) {
	vscode.window.showErrorMessage("Setting 'Stitch: Basic Authentication String' has not been set.");
}

return isValid;
}

export function getPackageTypesFromStructure(structure:string) : string[] {
	let pt: string[] = [];
	if (isModular(structure)) {
		pt = structure.replace(/^m-multi_/,'').replace(/-[\s\S]*/g,'').split(':');
	}
	return pt;
} 

export function getButton(id:string, title:string, codicon:string = '',appearance:string = 'primary',hidden:string = '',clas:string = ''): string {
let codiconString: string = isEmpty(codicon) ? '' : `<span slot="start" class="codicon ${codicon}"></span>`;
let classString:string = isEmpty(clas) ? '' : `class="${clas}"`;
let button: string = /*html*/ `
	<vscode-button id="${id}" ${classString} appearance="${appearance}" ${hidden}>
	${title}
	${codiconString}
	</vscode-button>
	`;
return button;
}

export function forceWriteFileSync(filePath:string, fileContent:string, options:any) {
	const parentDir = parentPath(cleanPath(filePath));
	
	// make parent directory if not exists
	if(!fs.existsSync(parentDir)) {
		fs.mkdirSync(parentDir, { recursive: true });
	}
	
	// write file
	fs.writeFileSync(filePath,fileContent,options);
}

export function executePowershellFunction(psCommandArray:string[],informationMessage:string = '') {
	// get functions.ps1 name and path
	let functionsFileName = 'functions.ps1';
	getWorkspaceFile('**/scripts/' + functionsFileName).then( functionsPath => {
		let functionsDirectory = functionsPath.replace(/\\/g, '/').replace(/\/[^\/]+$/,'');

		// execute commands in new terminal window
		let terminal = vscode.window.createTerminal();
		terminal.show();

		terminal.sendText(`cd ${functionsDirectory}`);
		terminal.sendText(`. ./${functionsFileName}`);

		for (const psCommand of psCommandArray) {
			terminal.sendText(psCommand);
		}

		// let user know the commands have been executed
		if (!isEmpty(informationMessage)) {
			vscode.window.showInformationMessage(informationMessage);
		}
	});
}

export function getCleanFilePathAndName(files:any[]) : {filePath:string, fileName:string} {
	// get file name and path
	let filesValid = (typeof files !== 'undefined') && (files.length > 0);

	return {
		filePath: filesValid ? files[0].fsPath.replace(/\\/g, '/') : '',
		fileName: filesValid ? (files[0].fsPath.replace(/\\/g, '/').split('/').pop() ?? '') : ''
	};
}