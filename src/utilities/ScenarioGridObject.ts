import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString} from "./functions";


export class ScenarioGridObject {
    // PROPERTIES
    public static currentScenarioGridObject: ScenarioGridObject | undefined;

    // constructor
    public constructor (
        private _availableScenarios: string[],
        private _modularElements: string[],
        private _scenarioFieldValues: string[],
        private _modularValue: boolean,
        private _nofScenarios: number,
        private _nofScenariosIndex: number
    ) { }

    public getHtml(): string {
        
        let scenariosGrid = /*html*/ `    
            <section class="rowsingle">
                <section class="component-container">
                    <h2>Scenarios</h2>
                    <vscode-divider role="separator"></vscode-divider>

                    <vscode-text-field id="modularelements" value="${this._modularElements.join(',')}" hidden></vscode-text-field>

                    <section class="component-example">
                        <vscode-checkbox id="modular" class="modular" ${checkedString(this._modularValue)}>Modular</vscode-checkbox>
                    </section>

                    ${this._getModularTiles()}

                    <vscode-divider role="separator"></vscode-divider>

                    <section class="component-example">
                        <p>Number of Scenarios</p>
                        <vscode-dropdown id="nofscenarios" class="dropdown" index="${this._nofScenariosIndex}" ${valueString(this._nofScenarios+'' ?? '0')} position="below">
                            ${dropdownOptions(arrayFrom0(100))}
                        </vscode-dropdown>
                    </section>

                    ${this._scenarioInputs()}
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
        let modularTiles = '';
        for (const element of this._modularElements) {
            if (element !== 'standard') {
            modularTiles += this._getModularTile(element);
            }
        }

        html = /*html*/ `
        <section class="component-example">
            ${modularTiles}
        </section>`;
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
