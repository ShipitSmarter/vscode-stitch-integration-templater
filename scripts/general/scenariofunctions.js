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
    field.addEventListener("change", changePackages);
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

  // save field value
  var value = field.value;
  var textString = field.id + '|' + (field.getAttribute('index') ?? '') + '|' + field.value;
  vscodeApi.postMessage({ command: "savemultivalue", text: textString });

  //TODO: update scenario in currentInput
  
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
  
export function changePackages(event) {
  const nofPackages = event.target.value;

  // cycle through al scenario fields, and update with new nofPackages
  for (const field of document.querySelectorAll(".scenariofield")) {
    field.value = field.value.replace(/-multi_\d-/g,"-multi_" + nofPackages + "-");

    // trigger 'change' event to save and check content
    field.dispatchEvent(new Event('change'));
  }
}

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

  // set multifield if present
  let multifield = document.querySelectorAll("#multifield" + fieldId);
  // vscodeApi.postMessage({ command: "setprime", text: multifield[0].id });
  if (multifield.length > 0) {
    //calculate multi value (lowest unused digit or 1) unless already set
    if (multifield[0].value === '') {
      multifield[0].value = lowestUnusedDigitOr1() + "";
      // trigger 'keyup' event to save and check content
      multifield[0].dispatchEvent(new Event('keyup'));
    }

    //show multi field
    //multifield[0].hidden = false;
    multifield[0].disabled = false;
  }

  // add tile content to last selected scenario field
  let currentElements = currentInput.value.split('-');
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
    //multifield[0].hidden = true;
    multifield[0].disabled = true;
  }

  // remove tile content from last selected scenario field
  let currentElements = currentInput.value.split('-');
  let regex = new RegExp('-' + field.id + '([-_]|$)');
  let check = currentInput.value.match(regex);
  if (check) {
    //let newValue = currentElements.filter(el => el !== field.id &&).join('-');
    // replace if multi, else replace if not multi
    let multiregex = new RegExp('-' + field.id + '_\\d+(-|$)');
    let newValue = currentInput.value.replace(multiregex, '$1').replace(regex, check[1]);
    currentInput.value = (newValue === base) ? '' : newValue;

    // trigger 'change' event to save and check content
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
  
    return check;
}
  
export function updateTiles(content) {
    let currentElements = content.split('-');
    
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
        // } else if (isModular() && !checkModularScenario(field.value)) {
        //   updateScenarioFieldWrongModularScenario(field.id,fieldType);
        //   isCorrect = false;
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
    field.title = 'Format: \'fromnl-tode-sl1800\'. Elements must be present in scenario-elements/modular.';
}
  
export function updateScenarioFieldRight(fieldId) {
    let field = document.getElementById(fieldId);
    field.style.outline = "none";
    field.title = '';
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
  