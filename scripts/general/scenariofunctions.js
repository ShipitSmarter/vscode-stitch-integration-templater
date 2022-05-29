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
    field.addEventListener('click',modularScenarioFocus);
  }

  // modular checkbox
  document.getElementById("modular").addEventListener("change", scenarioFieldChange(vscodeApi));

  // nofPackages
  for (const field of document.querySelectorAll("#nofpackages")) {
    field.addEventListener("change", changePackages(vscodeApi));
  }

  // nofPackages dropdowns
  for (const field of document.querySelectorAll(".nofpackages")) {
    field.addEventListener("change", changePackagesDropdown(vscodeApi));
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
  let element = field.id.replace('multifield','');
  let multiregex = new RegExp('-' + element + '_\\d*(-|$)');
  currentInput.value = currentInput.value.replace(multiregex, '-' + element + '_' + value + '$1');

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
    if (field.classList[0] === 'scenariofield') {
      for (const sc of document.querySelectorAll(".scenariofield")) {
        updateScenarioFieldOutlineAndTooltip(sc.id);
      }
    }
};};

export var changePackagesDropdown = function (vscodeApi) { return  function (event) {
    const nofPackagesField = event.target;
    const nofPackages = nofPackagesField.value;

    // save
    vscodeApi.postMessage({ command: "savevalue", text: 'nofpackagesdropdown|' + nofPackagesField.getAttribute('index') + '|' + nofPackages });


};};
  
export var changePackages = function (vscodeApi) { return  function (event) {
    const nofPackagesField = event.target;
    const nofPackages = nofPackagesField.value;

    // save
    vscodeApi.postMessage({ command: "savevalue", text: 'nofpackages|' + nofPackagesField.getAttribute('index') + '|' + nofPackages });

    // cycle through al scenario fields, and update with new nofPackages
    for (const field of document.querySelectorAll(".scenariofield")) {
      field.value = field.value.replace(/-multi_\d-/g,"-multi_" + nofPackages + "-");

      // trigger 'change' event to save and check content
      field.dispatchEvent(new Event('change'));
    }

    // check all multifield values
    for (const field of document.querySelectorAll(".multifield")) {
      updateMultiFieldOutlineAndTooltip(field.id);
    }
};};

export function modularScenarioFocus(event) {
    // track last selected scenario field
    // from https://stackoverflow.com/a/68176703/1716283
    const field = event.target;

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

export function lowestUnusedDigitOr1() {
  let multifields = document.querySelectorAll(".multifield");
  let maxValue = +document.getElementById("nofpackages").value;
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

export function setPrimary(fieldId,vscodeApi) {
  let field = document.getElementById(fieldId);
  const base = 'm-multi_' + document.getElementById("nofpackages").value ;

  // change appearance
  field.setAttribute('appearance','primary');

  // set multifield if present (and not already set)
  let multifield = document.querySelectorAll("#multifield" + fieldId);

  if (multifield.length > 0) {
    
    // extract current value from scenario field (if present)
    let multiregex = new RegExp('-' + field.id + '_(\\d*)(-|$)');
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
  let regex = new RegExp('-' + field.id + '([-_]|$)',"g");
  let check = currentInput.value.match(regex);
  let addstring = field.id + (multifield.length > 0 ? '_' + multifield[0].value : '');
  if (!check) {
    currentInput.value = currentInput.value + (isEmpty(currentInput.value) ? (base + '-') : '-') + addstring;

    // trigger 'change' event to save and check content
    currentInput.dispatchEvent(new Event('change'));
  }
}

export function setSecondary(fieldId,vscodeApi) {
  let field = document.getElementById(fieldId);
  const base = 'm-multi_' + document.getElementById("nofpackages").value ;

  // change appearance
  field.setAttribute('appearance','secondary');

  // clear multifield if present
  let multifield = document.querySelectorAll("#multifield" + fieldId);
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
  let oldValue = currentInput.value;
  let nonmultiregex = new RegExp('-' + field.id + '(-|$)');
  let multiregex = new RegExp('-' + field.id + '_\\d*(-|$)');

  // replace if multi, else replace if not multi
  let newValue = currentInput.value.replace(multiregex, '$1').replace(nonmultiregex, '$1');

  // remove base if all tiles deselected
  currentInput.value = (newValue === base) ? '' : newValue;

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
      let regex = new RegExp('-' + tile.id + '([-_]|$)');
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

export function checkModularScenario(content) {
  let isCorrect = true;

  // check if modular scenario contains invalid multi strings
  let currentElements = content.split('-');
  let maxValue = document.getElementById("nofpackages").value;

  for (const element of currentElements) {
    let multiValue = element.replace(/[^\_]+\_/g,'');

    if (element.includes('_') && (multiValue.includes('0') || containsHigherDigits(multiValue, maxValue) || containsRepeatingDigits(multiValue, maxValue))) {
      isCorrect = false;
      break;
    }
  }

  return isCorrect;
}

export function updateMultiFieldOutlineAndTooltip(fieldId) {
  let isCorrect = false;
  let field = document.getElementById(fieldId);
  let maxValue = document.getElementById("nofpackages").value;

  // if (field.value === '' && field.disabled === false) {
  if (field.value === '' && field.hidden === false) {
    updateMultiFieldEmpty(field.id);
  } else if (field.value.includes('0')) {
    updateMultiFieldWrong(field.id, 'May not contain 0 (only 1-9, and no higher than number of packages)');
  } else if (containsHigherDigits(field.value, maxValue)) {
    updateMultiFieldWrong(field.id, 'May not contain digits higher than number of packages');
  } else if (containsRepeatingDigits(field.value, maxValue)) {
    updateMultiFieldWrong(field.id, 'May not contain repeating digits');
  } else {
    updateScenarioFieldRight(field.id);
    isCorrect = true;
  }

  return isCorrect;
}

function updateMultiFieldWrong(fieldId,hint) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid red";
  field.title = hint;
}

function updateMultiFieldEmpty(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid cyan";
  field.title = 'Field is mandatory';
}

export function updateScenarioFieldOutlineAndTooltip(fieldId) {
    let isCorrect = true;
    let field = document.getElementById(fieldId);
  
    if (field.classList[0] === 'scenariofield') {
        // check for duplicate scenarios
        if (isScenarioDuplicate(field.id) && !isEmpty(field.value)) {
          isCorrect = false;
          updateScenarioFieldDuplicate(field.id);
        } else if (isModular() && !checkModularScenario(field.value)) {
          updateScenarioFieldWrongModularScenario(field.id);
          isCorrect = false;
        } else if (field.id === currentInput.id && isModular()) { 
          updateScenarioFieldFocused(field.id);
        } else {
          updateScenarioFieldRight(field.id);
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
    field.title = 'One or more modular element fields are invalid. select scenario to see more details.';
}
  
export function updateScenarioFieldRight(fieldId, info="") {
    let field = document.getElementById(fieldId);
    field.style.outline = "none";
    field.title = info;
}

export function updateScenarioFieldFocused(fieldId) {
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
  