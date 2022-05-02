const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("createintegration").addEventListener("click", createIntegration);
  document.getElementById("checkintegrationexists").addEventListener("click", checkIntegrationPath);

  // input fields
  const fields = document.querySelectorAll(".field,.stepfield,.otherstepfield,.scenariofield,.dropdown,.stepdropdown,.modular,.existingscenariocheckbox");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
    if (field.classList[0] === 'scenariofield') {
      field.addEventListener("change", fieldChange);
    }
  }

  // fixed/step dropdowns
  const dropDowns = document.querySelectorAll(".dropdown,.stepdropdown");
  for (const dropDown of dropDowns) {
    dropDown.addEventListener("change", fieldChange);
  }

  // checkboxes
  const checkBoxes = document.querySelectorAll(".modular,.existingscenariocheckbox");
  for (const checkbox of checkBoxes) {
    checkbox.addEventListener("click", fieldChange);
  }

  // on panel creation: save all dropdown values
  saveValue("modulename");
  saveValue("nofsteps");
  saveValue("nofscenarios");

  // stepDropdowns
  for (const stepDropDown of document.getElementsByClassName("stepdropdown")) {
    saveValue(stepDropDown.id);

    // if 'other': reveal other step field
    if (stepDropDown.value === 'other') {
      let index = stepDropDown.getAttribute('indexstep');
      document.getElementById("otherstepname" + index).style.display = 'inline-table';
    }
  }

  // on panel creation: update field outlines and tooltips
  checkFields();
}

function fieldChange(event) {
  const field = event.target;

  // save field value
  saveValue(field.id);
  
  // do some more stuff based on field class
  switch (field.classList[0]) {
    // input fields: check contents
    case 'field':
    case 'stepfield':
    case 'otherstepfield':
    case 'scenariofield':
      updateFieldOutlineAndTooltip(field.id);
      break;

    // modular, dropdown: refresh panel
    case 'dropdown':
    case 'modular':
      vscodeApi.postMessage({ command: "refreshpanel", text: '' });
      break;

    // stepdropdown: show/hide other step field
    case 'stepdropdown':
      var index = field.getAttribute('indexstep');
      var otherStepField = document.getElementById("otherstepname" + index);

      if (field.value === 'other') {
        // if 'other': show other step field 
        otherStepField.style.display = 'inline-table';
      } else {
        // not other: hide other step field and delete value
        otherStepField.style.display = 'none';
        otherStepField.value = '';
        saveValue(otherStepField.id);
      }
      break;
    
    // existingscenariocheckbox: update associated existing scenario field
    case 'existingscenariocheckbox':
      var scenarioId = field.id.slice(3, field.id.length);
      var scenario = document.getElementById(scenarioId);
      if (field.checked) {
        scenario.readOnly = true;
        scenario.disabled = false;
      } else {
        scenario.disabled = true;
        scenario.readOnly = false;
      }
      break;
  }
  
}

function saveValue(fieldId) {
  var field = document.getElementById(fieldId);
  var attr = '';
  switch (field.classList[0]) {
    case 'dropdown':
    case 'field':
      attr = 'index';
      break;
    case 'stepdropdown':
    case 'stepfield':
      attr = 'indexstep';
      break;
    case 'otherstepfield':
      attr = 'indexotherstep';
      break;
    case 'scenariofield':
      attr = 'indexscenario';
      break;
    case 'existingscenariocheckbox':
      attr = 'indexescheckbox';
      break;
    case 'modular':
      attr = '';
      break;
  }
  var value = field.checked ?? field.value;
  var textString = field.classList[0] + '|' + (field.getAttribute(attr) ?? '') + '|' + value;
  vscodeApi.postMessage({ command: "savevalue", text: textString });
}

function checkFields() {
  // check if any incorrect field contents and update fields outlining and tooltip in the process
  var check = true;
  const fields = document.querySelectorAll(".field,.stepfield,.otherstepfield,.scenariofield");
  for (const field of fields) {
    check = updateFieldOutlineAndTooltip(field.id) ? check : false;
  }

  return check;
}

function checkContent(id, value, modular = 'normal') {
  let isCorrect = true;

  // return checkModularScenario instead if 'modular'
  if (modular === 'modular') {
    isCorrect = checkModularScenario(value);
  } else {
    // else: check 'normal'
    let check = '';
    switch (id) {
      case 'carriername':
        check = value.match(/[^a-z0-9]/);
        break;
      case 'carrierapiname':
        check = value.match(/[^a-z0-9\-]/);
        break;
      case 'carriercode':
        check = value.match(/[^A-Z0-9]/);
        if (value.length !== 3) {
          check = 'invalid';
        }
        break;
      case 'carrierapidescription':
        check = value.match(/[^A-Za-z0-9\-\:\(\) ]/);
        break;
      case 'testuser':
        check = value.match(/[^A-Za-z0-9\-\_]/);
        break;
      case 'testpwd':
        check = '';
        break;

      case 'stepfield':
        check = value.match(/[^A-Za-z0-9\:\/\.\?\=\&\-\_]/);
        break;

      case 'otherstepfield':
        check = value.match(/[^a-z0-9\_]/);
        break;
    }

    // if invalid content: return false
    if (check !== '' && check !== null) {
      isCorrect = false;
    }
  }

  return isCorrect;
}

function getContentHint(elementid) {
  let hint = '';
  switch (elementid) {
    case 'carriername':
      hint = 'a-z, 0-9 (no capitals)';
      break;
    case 'carrierapiname':
      hint = 'a-z, 0-9, \'-\' (no capitals)';
      break;
    case 'carriercode':
      hint = 'A-Z, 0-9 (only capitals); exactly 3 characters';
      break;
    case 'carrierapidescription':
      hint = 'A-Z, a-z, 0-9, \':\', \'(\', \')\' (spaces allowed)';
      break;
    case 'testuser':
      hint = 'A-Z, a-z, 0-9, \'-\', \'_\' (no spaces)';
      break;
    case 'testpwd':
      hint = 'Any character allowed';
      break;

    case 'stepfield':
      hint = 'A-Z, a-z, 0-9, :/.?=&-_ (no spaces)';
      break;

    case 'scenariofield':
      hint = 'Format: \'fromnl-tode-sl1800\'. Elements must be present in scenario-elements/modular.';
      break;

    case 'otherstepfield':
      hint = 'a-z, 0-9, \'_\' (no spaces)';
      break;
  }

  return hint;
}

function updateFieldWrong(fieldId,fieldType) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid red";
  field.title = getContentHint(fieldType);
}

function updateFieldRight(fieldId,fieldType) {
  let field = document.getElementById(fieldId);
  field.style.outline = "none";
  field.title = '';
}

function updateFieldOutlineAndTooltip(fieldId) {
  let isCorrect = true;
  let field = document.getElementById(fieldId);

  var fieldType = (field.className === 'field') ? field.id : field.className;
  var modular = (field.className === 'scenariofield') ? 'modular' : 'normal';

  if (document.getElementById("modular").checked || (field.className !== 'scenarioField')) {
    // ^^ skip if field is scenarioField and modular is unchecked
    if (!checkContent(fieldType, field.value, modular)) {
      updateFieldWrong(field.id,fieldType);
      isCorrect = false;
    } else {
      updateFieldRight(field.id, fieldType);
    }
  }
  
  return isCorrect;
}

function checkModularScenario(content) {
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

function checkIntegrationPath() {
  // check if module exists
  vscodeApi.postMessage({ command: "checkintegrationexists", text: 'checkintegrationexists' });
}

function createIntegration() {
  // check field content
  if (checkFields()) {
    vscodeApi.postMessage({ command: "createintegration", text: "real fast!" });
  } else {
    vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
  }
}