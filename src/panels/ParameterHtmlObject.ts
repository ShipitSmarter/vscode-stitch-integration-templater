import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, hiddenString} from "../utilities/functions";

export class ParameterHtmlObject {
  // PROPERTIES
  public static currentHtmlObject: ParameterHtmlObject | undefined;

  // constructor
  public constructor(  
    private _uris: vscode.Uri[]
  ) { }

  // METHODS
  public getHtml() {
    // define necessary extension Uris
    const toolkitUri  = this._uris[0];
    const codiconsUri = this._uris[1];
    const mainUri     = this._uris[2];
    const styleUri    = this._uris[3];

    // define panel HTML
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script type="module" src="${toolkitUri}"></script>
          <script type="module" src="${mainUri}"></script>
          <link rel="stylesheet" href="${styleUri}"/> 
          <link rel="stylesheet" href="${codiconsUri}">
        </head>
        <body>
          <h1>Hello World!</h1>
          <vscode-button id="howdy">Howdy!</vscode-button>
        </body>
      </html>
    `;
  }


}