import { isEmpty } from "../general/general.js";

// track last selected text field
let currentInput = document.querySelectorAll(".scenariofield")[0];

export function addScenarioEventListeners(vscodeApi) {
  // tile buttons
  for (const tilebutton of document.querySelectorAll(".modulartile")) {
    tilebutton.addEventListener("click", clickTile(vscodeApi));
  }

  // scenario fields
  for (const field of document.querySelectorAll(".scenariofield")) {
    field.addEventListener("keyup", scenarioFieldChange(vscodeApi));
    field.addEventListener("change", scenarioFieldChange(vscodeApi));
  }

  // scenario custom fields
  for (const field of document.querySelectorAll(".scenariocustomfield")) {
    field.addEventListener("keyup", scenarioFieldChange(vscodeApi));
    field.addEventListener("change", scenarioFieldChange(vscodeApi));
    field.addEventListener('focus',modularScenarioFocus);
  }

  // modular checkbox
  document.getElementById("modular").addEventListener("change", scenarioFieldChange(vscodeApi));

  // nofPackages dropdowns
  for (const field of document.querySelectorAll(".nofpackages")) {
    field.addEventListener("change", changePackages(vscodeApi));
  }

  // multi fields
  for (const field of document.querySelectorAll(".multifield")) {
    // field.addEventListener("change",multiFieldChange(vscodeApi));
    field.addEventListener("keyup",multiFieldChange(vscodeApi));
  }

  // if modular: check currentInput content and update tiles
  if (isModular()) {
    updateTiles(currentInput.value);
  }
}

export var clickTile = function (vscodeApi) { return function (event) {
    const field = event.target;
  
    // update tile appearance and possibly set multi field
    if (field.getAttribute('appearance') === 'primary'){
      setSecondary(field.id,vscodeApi);
    } else {
      setPrimary(field.id,vscodeApi);
    }
};};

export var multiFieldChange = function (vscodeApi) { return  function (event) {
  const field = event.target;

  // check content validity
  updateMultiFieldOutlineAndTooltip(field.id);

  // save field value
  var value = field.value;
  var textString = field.id + '|' + (field.getAttribute('index') ?? '') + '|' + field.value;
  vscodeApi.postMessage({ command: "savemultivalue", text: textString });

  // update scenario in currentInput
  const parent = field.getAttribute('parent');
  const element = field.getAttribute('name');
  const fullName = parent + ':' + element;
  let multiregex = new RegExp('-' + fullName + '_[^-]*(-|$)');
  let newValue = currentInput.value.replace(multiregex, '-' + fullName + '_' + value + '$1');
  updateModularValue(currentInput.id, newValue);

  // trigger 'change' event to save and check content
  currentInput.dispatchEvent(new Event('change')); 
};};


export var scenarioFieldChange = function (vscodeApi) { return  function (event) {
    // passing parameter and event to listener function
    // from https://stackoverflow.com/a/8941670/1716283
    const field = event.target;

    // save field value
    saveScenarioValue(field.id, vscodeApi);
    
    // check all scenarios for validity
    if (['scenariofield','scenariocustomfield'].includes(field.classList[0])) {
      for (const sc of document.querySelectorAll(".scenariofield")) {
        updateScenarioFieldOutlineAndTooltip(sc.id);
      }
    }
};};

export var changePackages = function (vscodeApi) { return  function (event) {
    const nofPackagesField = event.target;
    const nofPackages = nofPackagesField.value;
    const index = nofPackagesField.getAttribute('index');

    // save
    vscodeApi.postMessage({ command: "savevalue", text: 'nofpackagesdropdown|' + index + '|' + nofPackages });

    // select associated scenario field
    const scenarioField = document.getElementById("scenario" + index);
    scenarioField.dispatchEvent(new Event('click'));

    // update scenario field with new nofPackages
    let newValue = scenarioField.value.replace(/-multi_\d-/g,"-multi_" + nofPackages + "-");
    updateModularValue(scenarioField.id, newValue);

    // trigger 'change' event to save and check content
    scenarioField.dispatchEvent(new Event('change')); 

    // update scenario field validity check
    //updateScenarioFieldOutlineAndTooltip(scenarioField.id);

    // check all multifield values
    for (const field of document.querySelectorAll(".multifield")) {
      updateMultiFieldOutlineAndTooltip(field.id);
    }

};};

export function modularScenarioFocus(event) {
    // track last selected scenario field
    // from https://stackoverflow.com/a/68176703/1716283
    const customfield = event.target;
    const field = document.getElementById(customfield.id.replace('scenariocustom','scenario'));

    if (field.id !== currentInput.id && isModular()) {
      // update currentInput
      let previousInput = currentInput;
      currentInput = field;
      
      // update field outlines
      updateScenarioFieldOutlineAndTooltip(previousInput.id);
      updateScenarioFieldOutlineAndTooltip(currentInput.id);

      // update tiles
      updateTiles(currentInput.value);

      // check all multifield values
      for (const field of document.querySelectorAll(".multifield")) {
        updateMultiFieldOutlineAndTooltip(field.id);
      }
    }
}

export function saveScenarioValue(fieldId, vscodeApi) {
    var field = document.getElementById(fieldId);
    var attr = 'index';
    var value = field.checked ?? field.value;
    var textString = field.classList[0] + '|' + (field.getAttribute(attr) ?? '') + '|' + value;
    vscodeApi.postMessage({ command: "savevalue", text: textString });
}

export function getNofPackages(scenarioFieldId) {
  let nofPackages = 1;

  let scenarioField = document.getElementById(scenarioFieldId);
  let nofPackagesField = document.querySelectorAll("#nofpackages" + scenarioField.getAttribute('index'));

  if (nofPackagesField.length > 0) {
    nofPackages = nofPackagesField[0].value;
  }

  return +nofPackages;
}

export function lowestUnusedDigitOr1() {
  let multifields = document.querySelectorAll(".multifield");
  let maxValue = getNofPackages(currentInput.id);
  let concatenatedValues = '';
  let lowestUnused = 0;
  for (const multifield of multifields) {
    concatenatedValues += multifield.value;
  }

  // get lowest unused digit (max is nofPackages)
  for (const digit of [...Array(maxValue).keys()].map(x => ++x)) {
    if (!concatenatedValues.includes(digit+"")) {
      lowestUnused = digit;
      break;
    }
  }

  return (lowestUnused === 0) ? 1 : lowestUnused;
}

function updateModularValue(fieldId, newValue) {
  let field = document.getElementById(fieldId);
  let curValue = field.value;

  // update modular scenario field
  field.value = newValue;

  // update custom name if necessary
  let curCleanValue = curValue.replace(/\:/g,'');
  let newCleanValue = newValue.replace(/\:/g,'');
  let custom = document.getElementById(field.id.replace('scenario','scenariocustom'));
  if (isEmpty(custom.value) || (custom.value === curCleanValue) ) {
    custom.value = newCleanValue;
  }
}

export function setPrimary(fieldId,vscodeApi) {
  let field = document.getElementById(fieldId);
  const base = 'm-multi_' + getNofPackages(currentInput.id);
  const parent = field.getAttribute('parent');
  const element = field.getAttribute('name');

  // change appearance
  field.setAttribute('appearance','primary');

  // set multifield if present (and not already set)
  let multifield = document.querySelectorAll("#multifield" + parent + element);

  if (multifield.length > 0) {
    
    // extract current value from scenario field (if present)
    let multiregex = new RegExp('-' + element + '_([^-]*)(-|$)');
    let matchMultiInScenario = currentInput.value.match(multiregex);
    if (matchMultiInScenario) {
      multifield[0].value = matchMultiInScenario[1];
    } else 
    if (multifield[0].value === '') {
      //calculate multi value (lowest unused digit or 1) unless already set
      multifield[0].value = lowestUnusedDigitOr1() + "";

      // trigger 'keyup' event to save and check content
      multifield[0].dispatchEvent(new Event('keyup'));
    }

    //show multi field
    multifield[0].hidden = false;
    // multifield[0].disabled = false;
  }

  // add tile content to last selected scenario field
  // let currentElements = currentInput.value.split('-');
  let fullName = parent + ':' + element;
  let regex = new RegExp('-' + fullName + '([-_]|$)',"g");
  let check = currentInput.value.match(regex);
  let addstring = fullName + (multifield.length > 0 ? '_' + multifield[0].value : '');
  if (!check) {
    let curValue = currentInput.value;
    let newValue = currentInput.value + (isEmpty(curValue) ? (base + '-') : '-') + addstring;

    // update value
    updateModularValue(currentInput.id, newValue);

    // trigger 'change' event to save and check content
    currentInput.dispatchEvent(new Event('change'));
  }
}

export function setSecondary(fieldId,vscodeApi) {
  let field = document.getElementById(fieldId);
  const base = 'm-multi_' + getNofPackages(currentInput.id);
  const parent = field.getAttribute('parent');
  const element = field.getAttribute('name');

  // change appearance
  field.setAttribute('appearance','secondary');

  // clear multifield if present
  let multifield = document.querySelectorAll("#multifield" + parent + element);
  if (multifield.length > 0) {

    //clear multi value
    multifield[0].value = '';
    // trigger 'keyup' event to save and check content
    multifield[0].dispatchEvent(new Event('keyup'));

    //hide multi field
    multifield[0].hidden = true;
    // multifield[0].disabled = true;

    // update validity check
    updateMultiFieldOutlineAndTooltip(multifield[0].id);
  }

  // remove tile content from last selected scenario field
  let fullName = parent + ':' + element;
  let oldValue = currentInput.value;
  let nonmultiregex = new RegExp('-' + fullName + '(-|$)');
  let multiregex = new RegExp('-' + fullName + '_[^-]*(-|$)');

  // replace if multi, else replace if not multi
  let curValue = currentInput.value;
  let tempNewValue = curValue.replace(multiregex, '$1').replace(nonmultiregex, '$1');

  // update field
  let newValue = (tempNewValue === base) ? '' : tempNewValue;
  updateModularValue(currentInput.id, newValue);

  // if updated: trigger 'change' event to save and check content
  if (currentInput.value !== oldValue) {
    currentInput.dispatchEvent(new Event('change'));
  }
}

export function checkScenarioFields() {
    // check if any incorrect field contents and update fields outlining and tooltip in the process
    var check = true;
    const fields = document.querySelectorAll(".scenariofield");
    for (const field of fields) {
      check = updateScenarioFieldOutlineAndTooltip(field.id) ? check : false;
    }

    // check all multifield values
    for (const field of document.querySelectorAll(".multifield")) {
      check = updateMultiFieldOutlineAndTooltip(field.id) ? check : false;
    }
  
    return check;
}
  
export function updateTiles(content) {
    // let currentElements = content.split('-');
    
    let tiles = document.querySelectorAll(".modulartile");
    for (const tile of tiles) {
      let element = tile.getAttribute('name');
      let parent = tile.getAttribute('parent');
      let fullName = parent + ':' + element;
      let regex = new RegExp('-' + fullName + '([-_]|$)');
      // if (currentElements.includes(tile.id)) {
      if (content.match(regex)) {
        setPrimary(tile.id);
      } else {
        setSecondary(tile.id);
      }
    }
}

export function isModular() {
    return document.getElementById("modular").checked;
}

export function countInString(string, element) {
  let l1 = string.length;
  let l2 = string.replace(new RegExp(element, 'g'), '').length;

  return (l1 - l2) / element.length;
}

export function containsRepeatingDigits(string, maxdigit) {
  let containsRepeating = false;
  for (let index = 1; index <= +maxdigit; index++) {
    if (countInString(string,index+"") > 1) {
      containsRepeating = true;
      break;
    }
  }

  return containsRepeating;
}

export function containsHigherDigits(string, maxdigit) {
  let containsHigher = false;
  for (let index = +maxdigit+1; index <= 9; index++) {
    if (string.includes(index+"")) {
      containsHigher = true;
      break;
    }
  }

  return containsHigher;
}

export function checkModularScenario(fieldId) {
  let isCorrect = true;
  let field = document.getElementById(fieldId);
  let content = field.value;

  // check if modular scenario contains invalid multi strings
  let currentElements = content.split('-');
  let maxValue = getNofPackages(field.id)+"";

  for (const element of currentElements) {
    let multiValue = element.replace(/[^\_]+\_/g,'');

    if (element.includes('_') && (multiValue.match(/\D/g) || multiValue.includes('0') || containsHigherDigits(multiValue, maxValue) || containsRepeatingDigits(multiValue, maxValue))) {
      isCorrect = false;
      break;
    }
  }

  return isCorrect;
}

export function checkCustomName(fieldId) {
  let isCorrect = true;
  let field = document.getElementById(fieldId);

  // check if custom name is correct
  let check = field.value.match(/[^A-Za-z0-9\_\-]/);

  // if invalid content: return false
  if (check !== '' && check !== null) {
    isCorrect = false;
  }

  return isCorrect;
}

export function updateMultiFieldOutlineAndTooltip(fieldId) {
  let isCorrect = false;
  let field = document.getElementById(fieldId);
  let maxValue = getNofPackages(currentInput.id)+"";

  // if (field.value === '' && field.disabled === false) {
  if (field.value === '' && field.hidden === false) {
    updateEmpty(field.id);
  } else if (field.value.match(/\D/g)) {
    updateWrong(field.id, 'Should contain only digits (1-9)');
  } else if (field.value.includes('0')) {
    updateWrong(field.id, 'Should not contain 0 (only 1-9)');
  } else if (containsHigherDigits(field.value, maxValue)) {
    updateWrong(field.id, 'Should not contain digits higher than number of packages');
  } else if (containsRepeatingDigits(field.value, maxValue)) {
    updateWrong(field.id, 'Should not contain repeating digits');
  } else {
    updateRight(field.id);
    isCorrect = true;
  }

  return isCorrect;
}

export function updateScenarioFieldOutlineAndTooltip(fieldId) {
    let isCorrect = true;
    let field = document.getElementById(fieldId);
  
    if (field.classList[0] === 'scenariofield') {
        let customfield = document.getElementById(field.id.replace('scenario','scenariocustom'));

        // check if scenario is correct
        // if (isScenarioDuplicate(field.id) && !isEmpty(field.value)) {
        //   isCorrect = false;
        //   updateWrong(customfield.id,'Scenario is duplicate of other (existing) scenario');
        // } else 
        if (isModular() && !checkModularScenario(field.id)) {
          updateWrong(customfield.id,'One or more modular element fields are invalid. select scenario to see more details.');
          isCorrect = false;
         
        // check if custom name is correct
        } else if (!checkCustomName(customfield.id)) {
          updateWrong(customfield.id,'Allowed: A-Z, a-z, 0-9, -, _ (no spaces)');
          isCorrect = false;
        } else if (isCustomNameDuplicate(customfield.id) && !isEmpty(customfield.value)) { 
          updateWrong(customfield.id,'Name is duplicate of other (existing) scenario');
          isCorrect = false;

        // check if combination is correct
        } else if (isEmpty(field.value) && !isEmpty(customfield.value)) {
          updateWrong(customfield.id,'No tiles selected');
          isCorrect = false;
        } else if (!isEmpty(field.value) && isEmpty(customfield.value)) {
          updateWrong(customfield.id,'Must specify name if tiles selected');
          isCorrect = false;

        // check focused or correct
        } else if (field.id === currentInput.id && isModular()) { 
          updateFocused(customfield.id);
        } else {
          updateRight(customfield.id);
        }
    }
    
    return isCorrect;
}

function updateWrong(fieldId,title="Wrong") {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid red";
  field.title = title;
}

function updateEmpty(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid cyan";
  field.title = 'Field is mandatory';
}

export function updateRight(fieldId) {
    let field = document.getElementById(fieldId);
    field.style.outline = "none";
    field.title = '';
}

export function updateFocused(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid blue";
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

export function isCustomNameDuplicate(fieldId) {
  var isDuplicate = false;
  let field = document.getElementById(fieldId);
  
  // check other new scenarios
  var customFields = document.querySelectorAll(".scenariocustomfield");
  for (const sf of customFields) {
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
  