import { isEmpty } from "./general.js";

export function flipTile(fieldId) {
    let field = document.getElementById(fieldId);
  
    let app = 'appearance';
    if (field.getAttribute(app) === 'primary'){
      field.setAttribute(app,'secondary');
    } else {
      field.setAttribute(app,'primary');
    }
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
      if (!isModular()) {
        // check duplicate scenario drop-downs
        if (isScenarioDuplicate(field.id) && !isEmpty(field.value)) {
          isCorrect = false;
          updateScenarioFieldDuplicate(field.id);
        } else {
          updateScenarioFieldRight(field.id, fieldType);
        }   
        
      } else {
        // check any 'normal' input field
        if (!checkModularScenario(field.value)) {
          updateScenarioFieldWrongModularScenario(field.id,fieldType);
          isCorrect = false;
        } else {
          updateScenarioFieldRight(field.id, fieldType);
        }
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
  
export function isScenarioDuplicate(fieldId) {
    var isDuplicate = false;
    let field = document.getElementById(fieldId);
    
    // check other scenarios
    var scenarioFields = document.querySelectorAll(".scenariofield");
    for (const sf of scenarioFields) {
      if (sf.id !== field.id && sf.value === field.value) {
        // if scenario equal to other scenario: duplicate
        isDuplicate = true;
        break;
      }
    }
  
    return isDuplicate;
}
  