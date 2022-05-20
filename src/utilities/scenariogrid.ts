import * as vscode from "vscode";
import {  dropdownOptions, toBoolean, uniqueArray, uniqueSort, arrayFrom1, arrayFrom0, nth, checkedString, valueString} from "../utilities/functions";

export function getScenariosGrid(scenarios: string[], modularElements: string[], scenarioFieldValues:string[], modularValue: boolean, nofScenarios: number, nofScenariosIndex: number): string {
    let scenariosGrid = /*html*/ `    
        <section class="rowsingle">
            <section class="component-container">
                <h2>Scenarios</h2>
                <vscode-divider role="separator"></vscode-divider>

                <vscode-text-field id="modularelements" value="${modularElements.join(',')}" hidden></vscode-text-field>

                <section class="component-example">
                    <vscode-checkbox id="modular" class="modular" ${checkedString(modularValue)}>Modular</vscode-checkbox>
                </section>

                ${getModularTiles(modularElements, modularValue)}

                <vscode-divider role="separator"></vscode-divider>

                <section class="component-example">
                    <p>Number of Scenarios</p>
                    <vscode-dropdown id="nofscenarios" class="dropdown" index="${nofScenariosIndex}" ${valueString(nofScenarios+'' ?? '0')} position="below">
                        ${dropdownOptions(arrayFrom0(100))}
                    </vscode-dropdown>
                </section>

                ${scenarioInputs(nofScenarios, scenarios, scenarioFieldValues, modularValue)}
            </section>
        </section>`;

    return scenariosGrid;
}

export function scenarioInputs(nofScenarios: number, scenarios: string[], scenarioFieldValues: string[], modularValue: boolean): string {
    let html: string = ``;

    for (let scenario = 0; scenario < +nofScenarios; scenario++) {

        let scenarioInputField: string = '';
        if (modularValue) {
            scenarioInputField = /*html*/ `<vscode-text-field id="scenario${scenario}" index="${scenario}" ${valueString(scenarioFieldValues[scenario])} class="scenariofield" placeholder="${(scenario + 1) + nth(scenario + 1)} scenario name..."></vscode-text-field>`;
        } else {
            scenarioInputField = /*html*/ `
                <vscode-dropdown id="scenario${scenario}" index="${scenario}" ${valueString(scenarioFieldValues[scenario])} class="scenariofield" position="below">
                    <vscode-option></vscode-option>  
                    ${dropdownOptions(scenarios)}
                </vscode-dropdown>`;
        }

        html += /*html*/`
        <section class="component-example">
            ${scenarioInputField}
        </section>`;
    }

    return html;
}

export function getModularTiles(modularElements: string[], modularValue: boolean) : string {
    let html : string = ``;

    if (modularValue) {
      let modularTiles = '';
      for (const element of modularElements) {
        if (element !== 'standard') {
          modularTiles += getModularTile(element);
        }
      }

      html = /*html*/ `
      <section class="component-example">
        ${modularTiles}
      </section>`;
    }

    return html;
}

export function getModularTile(id:string): string {
    let testButton: string = /*html*/ `
      <vscode-button id="${id}" class="modulartile" appearance="secondary">${id}</vscode-button>
      `;
    return testButton;
}
