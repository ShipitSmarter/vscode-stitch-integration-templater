import { checkScenarioFields, addScenarioEventListeners } from "../general/scenariofunctions.js";
import { isEmpty } from "../general/general.js";

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("createintegration").addEventListener("click", createIntegration);
  document.getElementById("checkintegrationexists").addEventListener("click", checkIntegrationPath);

  // input fields
  const fields = document.querySelectorAll(".field,.stepfield,.otherstepfield,.dropdown,.stepdropdown,.existingscenariocheckbox");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
  }

  // fixed/step dropdowns
  const dropDowns = document.querySelectorAll(".dropdown,.stepdropdown");
  for (const dropDown of dropDowns) {
    dropDown.addEventListener("change", fieldChange);
  }

  // checkboxes
  const checkBoxes = document.querySelectorAll(".existingscenariocheckbox,.checkallexisting");
  for (const checkbox of checkBoxes) {
    checkbox.addEventListener("change", fieldChange);
  }

  // on panel creation: save all dropdown values (if exist)
  saveValue("modulename");
  saveValue("nofscenarios");
  if(isCreate()) {
    saveValue("nofsteps");
  }

  // stepDropdowns (if create)
  if(isCreate()) {
    for (const stepDropDown of document.querySelectorAll(".stepdropdown")) {
      saveValue(stepDropDown.id);
  
      // if 'other': reveal other step field
      if (stepDropDown.value === 'other') {
        var index = stepDropDown.getAttribute('indexstep');
        document.getElementById("otherstepname" + index).style.display = 'inline-table';
      }
    }
  }

  // scenario grid fields
  addScenarioEventListeners(vscodeApi);
  
  // on panel creation: update field outlines and tooltips
  checkFields();
}

function isCreate() {
  // check if create or update
  return (document.getElementById('createupdate').value === 'create');
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
      updateFieldOutlineAndTooltip(field.id);
      break;

    // dropdown: delete scenarios if module dropdown change, refresh panel
    case 'dropdown':
      if (field.id === 'modulename') {
        vscodeApi.postMessage({ command: "clearscenarios", text: '' });
      }
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

    case 'checkallexisting':
      for (const checkbox of document.querySelectorAll(".existingscenariocheckbox")) {
        checkbox.checked = field.checked;
      }  
      break;
  }
  
}

function infoMessage(info) {
  vscodeApi.postMessage({ command: "showinformationmessage", text: info });
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

    case 'existingscenariocheckbox':
      attr = 'indexescheckbox';
      break;

  }
  var value = field.checked ?? field.value;
  var textString = field.classList[0] + '|' + (field.getAttribute(attr) ?? '') + '|' + value;
  vscodeApi.postMessage({ command: "savevalue", text: textString });
}

function checkFields() {
  // check if any incorrect field contents and update fields outlining and tooltip in the process
  var check = true;
  const fields = document.querySelectorAll(".field,.stepfield,.otherstepfield");
  for (const field of fields) {
    check = updateFieldOutlineAndTooltip(field.id) ? check : false;
  }

  // check scenario fields
  check = checkScenarioFields() ? check : false;

  return check;
}

function checkContent(id, value) {
  let isCorrect = true;

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
        if (value.length !== 3 && value.length !== 0) {
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

function updateFieldEmpty(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid cyan";
  field.title = 'Field is mandatory';
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

  // check any non-scenario input field
  if (!checkContent(fieldType, field.value)) {
    updateFieldWrong(field.id,fieldType);
    isCorrect = false;
  } else if (['carriername','carrierapiname','carriercode'].includes(field.id) && isEmpty(field.value)) {
    updateFieldEmpty(field.id);
    isCorrect = false;
  } else {
    updateFieldRight(field.id, fieldType);
  }
  
  return isCorrect;
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