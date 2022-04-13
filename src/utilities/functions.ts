import { Uri, Webview, workspace , ExtensionContext} from "vscode";
import * as path from "path";

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

export async function getWorkspaceFile(matchString: string): Promise<string> {
	// get path to file in workspace
	let functionsFiles = await workspace.findFiles(matchString);
	const outFile = functionsFiles[0].fsPath.replace(/\\/g, '/');
	return outFile;
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