import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, readonlyString} from "./functions";


export class ScenarioGridObject {
    // PROPERTIES
    public static currentScenarioGridObject: ScenarioGridObject | undefined;

    // constructor
    public constructor (
        private _availableScenarios: string[],
        private _modularElementsWithParents: {parent:string, element:string}[],
        private _scenarioFieldValues: string[],
        private _modularValue: boolean,
        private _nofScenarios: number,
        private _nofScenariosIndex: number,
        private _isUpdate: boolean = false
    ) { }

    public getHtml(): string {
        
        let scenariosGrid = /*html*/ `    
            <section class="rowsingle">
                <section class="component-container">
                    <div class="component-sub-container">
                        <h2>Scenarios</h2>
                        <vscode-divider role="separator"></vscode-divider>

                        <vscode-text-field id="modularelements" value="${this._modularElementsWithParents.map(el => el.element).sort().join(',')}" hidden></vscode-text-field>

                        <section class="component-example">
                            <vscode-checkbox id="modular" class="modular" ${checkedString(this._modularValue)} ${readonlyString(this._isUpdate)}>Modular</vscode-checkbox>
                        </section>

                        ${this._getModularTiles()}

                        <vscode-divider role="separator"></vscode-divider>

                        <section class="component-example">
                            <p>Number of Scenarios</p>
                            <vscode-dropdown id="nofscenarios" class="dropdown" index="${this._nofScenariosIndex}" ${valueString(this._nofScenarios+'' ?? '0')} position="below">
                                ${dropdownOptions(arrayFrom1(100))}
                            </vscode-dropdown>
                        </section>

                        ${this._scenarioInputs()}
                    </div>
                </section>
            </section>`;

        return scenariosGrid;
    }

    private _scenarioInputs(): string {
        let html: string = ``;

        for (let scenario = 0; scenario < +this._nofScenarios; scenario++) {

            let scenarioInputField: string = '';
            if (this._modularValue) {
                scenarioInputField = /*html*/ `<vscode-text-field id="scenario${scenario}" index="${scenario}" ${valueString(this._scenarioFieldValues[scenario])} class="scenariofield" placeholder="${(scenario + 1) + nth(scenario + 1)} scenario name..."></vscode-text-field>`;
            } else {
                scenarioInputField = /*html*/ `
                    <vscode-dropdown id="scenario${scenario}" index="${scenario}" ${valueString(this._scenarioFieldValues[scenario])} class="scenariofield" position="below">
                        <vscode-option></vscode-option>  
                        ${dropdownOptions(this._availableScenarios)}
                    </vscode-dropdown>`;
            }

            html += /*html*/`
            <section class="component-example">
                ${scenarioInputField}
            </section>`;
        }

        return html;
    }

    private _getModularTiles() : string {
        let html : string = ``;
        if (this._modularValue) {
            // cycle through modular element parent folders
            let parents = uniqueSort(this._modularElementsWithParents.map(el => el.parent));
            for (const parent of parents) {
                let modularTiles = '';
                // cycle through elements in given parent folder
                let elements = this._modularElementsWithParents.filter(el => el.parent === parent).map(el => el.element).sort();
                for (const element of elements) {
                    if (element !== 'standard') {
                        modularTiles += this._getModularTile(element);
                    }
                }
                html += /*html*/ `
                    <section class="component-example">
                        ${modularTiles}
                    </section>`;
            }
        }
        
        return html;
    }

    private _getModularTile(id:string): string {
        let testButton: string = /*html*/ `
        <vscode-button id="${id}" class="modulartile" appearance="secondary">${id}</vscode-button>
        `;
        return testButton;
    }

}
