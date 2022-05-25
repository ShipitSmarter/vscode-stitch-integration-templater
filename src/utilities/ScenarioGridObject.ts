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
        private _nofScenariosIndex: number
    ) { }

    public getHtml(): string {
        
        let scenariosGrid = /*html*/ `    
            <section class="rowsingle">
                <section class="component-container">
                ${this._modularValue ? '<section class="component-nomargin"><div class="floatleft">' : ''}
                    <div class="component-sub-container">
                        <h2>Scenarios</h2>
                        <vscode-divider role="separator"></vscode-divider>

                        <vscode-text-field id="modularelements" value="${this._modularElementsWithParents.map(el => el.element).sort().join(',')}" hidden></vscode-text-field>

                        <section class="component-example">
                            <vscode-checkbox id="modular" class="modular" ${checkedString(this._modularValue)}>Modular</vscode-checkbox>
                        </section>

                        <vscode-divider role="separator"></vscode-divider>

                        <section class="component-example">
                            <p>Number of Scenarios</p>
                            <vscode-dropdown id="nofscenarios" class="dropdown" index="${this._nofScenariosIndex}" ${valueString(this._nofScenarios+'' ?? '0')} position="below">
                                ${dropdownOptions(arrayFrom1(100))}
                            </vscode-dropdown>
                        </section>

                        ${this._scenarioInputs()}
                    </div>                    
                ${this._modularValue ? '</div>' : ''}
                ${this._modularValue ? '<div class="floatleft">' : ''}
                    ${this._modularValue ? this._getModularTiles() : ''}
                ${this._modularValue ? '</div></section>' : ''}

                </section>
            </section>`;

        return scenariosGrid;
    }

    private _scenarioInputs(): string {
        let html: string = ``;

        for (let scenario = 0; scenario < +this._nofScenarios; scenario++) {
            html += /*html*/`
            <section class="component-example">
                ${this._modularValue ? this._getScenarioInputField(scenario) : this._getScenarioDropdown(scenario)}
            </section>`;
        }

        return html;
    }

    private _getScenarioInputField(index:number) : string {
        return /*html*/ `<vscode-text-field id="scenario${index}" index="${index}" ${valueString(this._scenarioFieldValues[index])} class="scenariofield" placeholder="${(index + 1) + nth(index + 1)} scenario name..." readonly></vscode-text-field>`;
    }

    private _getScenarioDropdown(index:number) : string {
        return /*html*/ `
        <vscode-dropdown id="scenario${index}" index="${index}" ${valueString(this._scenarioFieldValues[index])} class="scenariofield" position="below">
            <vscode-option></vscode-option>  
            ${dropdownOptions(this._availableScenarios)}
        </vscode-dropdown>`;
    }

    private _getModularTiles() : string {
        let html : string = ``;
            // cycle through modular element parent folders
            let parents = uniqueSort(this._modularElementsWithParents.map(el => el.parent)).filter(el => el !== '');
            for (const parent of parents) {
                let modularTiles = '';
                
                // cycle through elements in given parent folder
                let elements = this._modularElementsWithParents.filter(el => el.parent === parent).map(el => el.element).sort();
                for (const element of elements) {
                    modularTiles += this._getModularTile(element);
                }

                // add to html
                html += /*html*/ `
                    <div class="floatleftlesspadding">
                        <section class="component-example">
                            <h3>${parent.replace(/[\s\S]*\_/g,'')}</h3>
                        </section>
                            ${modularTiles}
                    </div>`;
            }
        
        return html;
    }

    private _getModularTile(id:string): string {
        let testButton: string = /*html*/ `
        <section class="component-example">
            <vscode-button id="${id}" class="modulartile" appearance="secondary">${id}</vscode-button>
        </section>
        `;
        return testButton;
    }

}
