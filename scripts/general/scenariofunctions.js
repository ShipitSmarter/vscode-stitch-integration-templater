import { isEmpty } from "../general/general.js";

// track last selected text field
let currentInput = document.querySelectorAll(".scenariofield")[0];

export function addScenarioEventListeners(vscodeApi) {
  // tile buttons
  for (const tilebutton of document.querySelectorAll(".modulartile")) {
    tilebutton.addEventListener("click", clickTile(vscodeApi));
  }

  for (const field of document.querySelectorAll(".scenariofield")) {
    field.addEventListener("keyup", scenarioFieldChange(vscodeApi));
    field.addEventListener("change", scenarioFieldChange(vscodeApi));
    field.addEventListener('focus',modularScenarioFocus);
  }

  // modular checkbox
  document.getElementById("modular").addEventListener("change", scenarioFieldChange(vscodeApi));
}

export var clickTile = function (vscodeApi) { return function (event) {
    const field = event.target;
    const base = 'm';
  
    // add/remove tile content to last selected text field
    let currentElements = currentInput.value.split('-');
    if (currentElements.includes(field.id)) {
      let newValue = currentElements.filter(el => el !== field.id).join('-');
      currentInput.value = (newValue === base) ? '' : newValue;
    } else {
      currentInput.value = currentInput.value + (isEmpty(currentInput.value) ? (base + '-') : '-') + field.id;
    }
  
    // save field value
    //saveScenarioValue(currentInput.id, vscodeApi);
  
    // trigger 'change' event to save and check content
    currentInput.dispatchEvent(new Event('change'));
  
    // update appearance on click
    flipTile(field.id);
};};

export var scenarioFieldChange = function (vscodeApi) { return  function (event) {
    // passing parameter and event to listener function
    // from https://stackoverflow.com/a/8941670/1716283
    const field = event.target;

    // save field value
    saveScenarioValue(field.id, vscodeApi);
    
    // check all scenarios for validity
    for (const sc of document.querySelectorAll(".scenariofield")) {
        updateScenarioFieldOutlineAndTooltip(sc.id);
    }

};};
  
export function modularScenarioFocus(event) {
    // track last selected scenario field
    // from https://stackoverflow.com/a/68176703/1716283
    const field = event.target;
  
    // update currentInput
    currentInput = field;
  
    // update tiles
    updateTiles(currentInput.value);
}

export function saveScenarioValue(fieldId, vscodeApi) {
    var field = document.getElementById(fieldId);
    var attr = 'index';
    var value = field.checked ?? field.value;
    var textString = field.classList[0] + '|' + (field.getAttribute(attr) ?? '') + '|' + value;
    vscodeApi.postMessage({ command: "savevalue", text: textString });
}

export function flipTile(fieldId) {
    let field = document.getElementById(fieldId);
  
    let app = 'appearance';
    if (field.getAttribute(app) === 'primary'){
      field.setAttribute(app,'secondary');
    } else {
      field.setAttribute(app,'primary');
    }
}

export function checkScenarioFields() {
    // check if any incorrect field contents and update fields outlining and tooltip in the process
    var check = true;
    const fields = document.querySelectorAll(".scenariofield");
    for (const field of fields) {
      check = updateScenarioFieldOutlineAndTooltip(field.id) ? check : false;
    }
  
    return check;
}
  
export function updateTiles(content) {
    let currentElements = content.split('-');
    
    let tiles = document.querySelectorAll(".modulartile");
    for (const tile of tiles) {
      if (currentElements.includes(tile.id)) {
        tile.setAttribute('appearance','primary');
      } else {
        tile.setAttribute('appearance','secondary');
      }
    }
}

export function checkModularScenario(content) {
    let currentElements = content.split('-');
    let modularElements = document.getElementById("modularelements").value.split(',');
    let isValid = true;
    if (currentElements !== null && !(currentElements.length === 1 && currentElements[0] === '')) {
      for (let index = 0; index < currentElements.length; index++) {
        if (!modularElements.includes(currentElements[index])) {
          isValid = false;
          break;
        }
      }
    }
  
    return isValid;
}

export function isModular() {
    return document.getElementById("modular").checked;
}

export function updateScenarioFieldOutlineAndTooltip(fieldId) {
    let isCorrect = true;
    let field = document.getElementById(fieldId);
  
    var fieldType = field.className;
  
    if (field.classList[0] === 'scenariofield') {
        // check for duplicate scenarios
        if (isScenarioDuplicate(field.id) && !isEmpty(field.value)) {
          isCorrect = false;
          updateScenarioFieldDuplicate(field.id);
        } else if (isModular() && !checkModularScenario(field.value)) {
          updateScenarioFieldWrongModularScenario(field.id,fieldType);
          isCorrect = false;
        } else {
          updateScenarioFieldRight(field.id, fieldType);
        }
    }
    
    return isCorrect;
}

export function updateScenarioFieldDuplicate(fieldId) {
    let field = document.getElementById(fieldId);
    field.style.outline = "1px solid red";
    field.title = 'Scenario is duplicate of other (existing) scenario';
}
  
export function updateScenarioFieldWrongModularScenario(fieldId) {
    let field = document.getElementById(fieldId);
    field.style.outline = "1px solid red";
    field.title = 'Format: \'fromnl-tode-sl1800\'. Elements must be present in scenario-elements/modular.';
}
  
export function updateScenarioFieldRight(fieldId,fieldType) {
    let field = document.getElementById(fieldId);
    field.style.outline = "none";
    field.title = '';
}

export function getNewScenarioValue(fieldValue) {
  return fieldValue.replace(/[^\>]+\> /g, '');
}
  
export function isScenarioDuplicate(fieldId) {
  var isDuplicate = false;
  let field = document.getElementById(fieldId);
  
  // check other new scenarios
  var scenarioFields = document.querySelectorAll(".scenariofield");
  for (const sf of scenarioFields) {
    if (sf.id !== field.id && sf.value === field.value && !isEmpty(sf.value)) {
      // if scenario equal to other scenario: duplicate
      isDuplicate = true;
      break;
    }
  }

  // check existing scenarios (if present)
  if (!isDuplicate ) {
    var actualValue = getNewScenarioValue(field.value);
    var existingScenarios = document.querySelectorAll(".existingscenariofield");
    for (const es of existingScenarios) {
      if (actualValue === es.value ) {
        // if scenario equal to existing scenario: duplicate
        isDuplicate = true;
        break;
      }    
    }
  }
  
  return isDuplicate;
}
  