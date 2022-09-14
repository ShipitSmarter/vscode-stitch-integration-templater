import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString, readonlyString, hiddenString, getButton} from "./functions";

// type definitions
type ScenarioObject = {
    name: string,
    structure: string
};
  
type IntegrationObject = {
    path:string, carrier:string, 
    api:string, module:string, 
    carriercode:string,
     modular: boolean, 
     scenarios:string[], 
     validscenarios: ScenarioObject[]
};
  
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
  

export class ScenarioGridObject {
    // PROPERTIES
    public static currentScenarioGridObject: ScenarioGridObject | undefined;

    // constructor
    public constructor (
        private _availableScenarios: string[],
        private _modularElementsWithParents: ModularElementObject[],
        private _packageTypes: string[],
        private _scenarioFieldValues: string[],
        private _nofScenarios: number,
        private _nofScenariosIndex: number,
        private _multiFieldValues: {[details: string] : string;},
        private _nofPackages: string[],
        private _scenarioCustomFields: string[]
    ) { }
    
    public getHtml(): string {
        
        let scenariosGrid = /*html*/ `    
            <section class="rowsingle">
                <section class="component-container">
                    <section class="component-nomargin">
                        <div class="floatleft">
                            <div class="component-sub-container">
                                <h2>Scenarios</h2>
                                <vscode-text-field id="modularelements" value="${this._modularElementsWithParents.map(el => el.element).sort().join(',')}" hidden></vscode-text-field>

                                <section class="component-example">
                                    <p>Number of Scenarios</p>
                                    <vscode-dropdown id="nofscenarios" class="dropdown" index="${this._nofScenariosIndex}" ${valueString(this._nofScenarios+'' ?? '0')} position="below">
                                        ${dropdownOptions(arrayFrom1(100))}
                                    </vscode-dropdown>
                                </section>

                                ${this._modularScenarioInputs()}
                            </div>                    
                        </div>
                        
                        <div class="floatleft">
                            ${this._getModularTiles()}
                        </div>
                    </section>

                </section>
            </section>`;

        return scenariosGrid;
    }

    private _modularScenarioInputs(): string {
        
        let scenarioNameGrid: string = ``;
        for (let scenario = 0; scenario < +this._nofScenarios; scenario++) {
            scenarioNameGrid += /*html*/ `
                <section class="component-nomargin">
                    <vscode-dropdown id="nofpackages${scenario}" class ="nofpackages" index="${scenario}" ${valueString(this._nofPackages[scenario] ?? '1')} position="below">
                        ${dropdownOptions(arrayFrom1(9))}
                    </vscode-dropdown>
                </section>`;
            scenarioNameGrid += this._getScenarioInputField(scenario);
        }

        return /*html*/`
        <section class="flexwrapper">
            <section class="grid2flex">
                <div># Packages</div>
                <div>Scenario name</div>
                ${scenarioNameGrid}
                <div>
                    ${getButton('addscenario','+','','primary')}
                </div>
            </section>
        </section>
        `;
    }

    private _shipmentPackageTypes(scenarioIndex:number): string {
        
        let shipmentPackageTypeGrid: string = ``;
        for (let index = 0; index <= 9; index++) {
            shipmentPackageTypeGrid += /*html*/ `
                <vscode-dropdown id="scenario${scenarioIndex}packagetype${index}" class ="packagetype" scenarioindex="${scenarioIndex}" index="${index}" position="below" hidden>
                    ${dropdownOptions(this._packageTypes)}
                </vscode-dropdown>`;    
        }

        return /*html*/`
        <section class="flexwrapper">
            ${shipmentPackageTypeGrid}
            ${getButton('removepackagetype' + scenarioIndex,'-','','primary','','removepackagetype')}
            ${getButton('addpackagetype' + scenarioIndex,'+','','primary','','addpackagetype')}
        </section>
        `;
    }

    private _getScenarioInputField(index:number) : string {
        return /*html*/ `
        <section class="component-nomargin">
            <vscode-text-field id="scenario${index}" index="${index}" ${valueString(this._scenarioFieldValues[index])} class="scenariofield" hidden></vscode-text-field>
            <vscode-text-field id="scenariocustom${index}" index="${index}" ${valueString(this._scenarioCustomFields[index])} class="scenariocustomfield" placeholder="${(index + 1) + nth(index + 1)} scenario name..."></vscode-text-field>
            <section class="packagetypes" id="packagetypes${index}" index="${index}">
                ${this._shipmentPackageTypes(index)}
            </section>
        </section>`;
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
                    // get current modularElements object
                    let currentElementObject = this._modularElementsWithParents.filter(el => el.parent === parent && el.element === element)[0];

                    // build modular tile (and add multifield, if appropriate)
                    modularTiles += /*html*/ `
                    <section class="component-example">
                        <vscode-button id="${this._getCleanParent(parent) + element}" name="${element}" class="modulartile" parent="${this._getCleanParent(parent)}" appearance="secondary">${element}</vscode-button>
                        ${ currentElementObject.multi ? /*html*/ `
                            <vscode-text-field id="multifield${this._getCleanParent(parent) + element}" name="${element}" parent="${this._getCleanParent(parent)}" ${valueString(this._multiFieldValues["multifield" + element])} class="multifield" placeholder="packages..." hidden></vscode-text-field>
                        ` : ''}
                    </section>
                    `;
                }

                // add to html
                html += /*html*/ `
                    <div class="floatleftlesspadding">
                        <section class="component-example">
                            <h3>${this._getCleanParent(parent)}</h3>
                        </section>
                            ${modularTiles}
                    </div>`;
            }
        
        return html;
    }

    private _getCleanParent(parent:string) : string {
        return parent.replace(/[\s\S]*\_/g,'');
    }

}
