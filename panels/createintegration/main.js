const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("createintegration").addEventListener("click", createIntegration);
  document.getElementById("checkintegrationexists").addEventListener("click", checkIntegrationPath);

  // save field entries
  const fields = document.getElementsByClassName("field");
  for (const field of fields) {
    field.addEventListener("keyup", saveFieldValue);
  }

  // save dropdown entries
  const dropDowns = document.getElementsByClassName("dropdown");
  for (const dropDown of dropDowns) {
    dropDown.addEventListener("change", dropdownChange);
  }

  // save modular checkbox entry
  document.getElementById("modular").addEventListener("click", saveModularValue);

  // save step field entries: 
  // fields
  const stepFields = document.getElementsByClassName("stepfield");
  for (const stepField of stepFields) {
    stepField.addEventListener("keyup", saveStepFieldValue);
  }

  // other step fields
  const otherStepFields = document.getElementsByClassName("otherstepfield");
  for (const otherStepField of otherStepFields) {
    otherStepField.addEventListener("keyup", saveOtherStepValue);
  }

  // dropdowns
  const stepDropDowns = document.getElementsByClassName("stepdropdown");
  for (const stepDropDown of stepDropDowns) {
    stepDropDown.addEventListener("change", stepDropdownChange);
  }

  // save scenario field entries
  const scenarioFields = document.getElementsByClassName("scenariofield");
  for (const scenarioField of scenarioFields) {
    scenarioField.addEventListener("keyup", saveScenarioFieldValue);
    scenarioField.addEventListener("change", saveScenarioFieldValue);
  }

  // save existing scenario checkbox entries
  for (const esCheckbox of document.getElementsByClassName("existingscenariocheckbox")) {
    esCheckbox.addEventListener("click", saveESCheckboxValue);
  }

  // on panel creation: save all dropdown values
  // fieldValues dropdowns (modulename, nofsteps)
  vscodeApi.postMessage({ command: "savefieldvalue", text: '2|' + document.getElementById("modulename").value });
  vscodeApi.postMessage({ command: "savefieldvalue", text: '5|' + document.getElementById("nofsteps").value });
  vscodeApi.postMessage({ command: "savefieldvalue", text: '6|' + document.getElementById("nofscenarios").value });

  // stepDropdowns
  for (const stepDropDown of document.getElementsByClassName("stepdropdown")) {
    let textString = stepDropDown.getAttribute('indexstep') + '|' + stepDropDown.value;
    vscodeApi.postMessage({ command: "savestepfieldvalue", text: textString });

    // if 'other': reveal other step field
    if (stepDropDown.value === 'other') {
      let index = stepDropDown.getAttribute('indexstep');
      document.getElementById("otherstepname" + index).style.display = 'inline-table';
    }
  }

  // on panel creation: update field outlines and tooltips
  checkFields();
}

function checkIntegrationPath() {
  // check if module exists
  vscodeApi.postMessage({ command: "checkintegrationexists", text: 'checkintegrationexists' });
}

function dropdownChange(event) {
  const field = event.target;

  // save field value
  let textString = field.getAttribute('index') + '|' + field.value;
  vscodeApi.postMessage({ command: "savefieldvalue", text: textString });

  // refresh panel
  vscodeApi.postMessage({ command: "refreshpanel", text: 'fromdropdown' });
}

function saveFieldValue(event) {
  const field = event.target;

  // save field value
  let textString = field.getAttribute('index') + '|' + field.value;
  vscodeApi.postMessage({ command: "savefieldvalue", text: textString });

  // if invalid content: add red outline and tooltip
  updateFieldOutlineAndTooltip(field.id,field.id);
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

function checkFields() {
  // check if any incorrect field contents and update fields outlining and tooltip in the process
  let correctContent = true;

  // fixed fields
  let fixedFields = document.getElementsByClassName('field');
  for (const fixedField of fixedFields) {
    if (!updateFieldOutlineAndTooltip(fixedField.id, fixedField.id)) {
      correctContent = false;
    }
  }

  // step url fields
  let stepFields = document.getElementsByClassName('stepfield');
  for (const stepField of stepFields) {
    if (!updateFieldOutlineAndTooltip(stepField.id, stepField.className)) {
      correctContent = false;
    }
  }

  // 'other' step fields
  let otherStepFields = document.getElementsByClassName('otherstepfield');
  for (const otherStepField of otherStepFields) {
    if (!updateFieldOutlineAndTooltip(otherStepField.id, otherStepField.className)) {
      correctContent = false;
    }
  }

  // modular scenario fields
  if (document.getElementById("modular").checked) {
    let scenarioFields = document.getElementsByClassName('scenariofield');
    for (const scenarioField of scenarioFields) {
      if (!updateFieldOutlineAndTooltip(scenarioField.id, scenarioField.className, 'modular')) {
        correctContent = false;
      }
    }
  }

  return correctContent;
}

function stepDropdownChange(event) {
  const stepField = event.target;

  // save field
  let index = stepField.getAttribute('indexstep');
  let textString = index + '|' + stepField.value;
  vscodeApi.postMessage({ command: "savestepfieldvalue", text: textString });

  // if 'other', show other step field
  if (stepField.value === 'other') {
    document.getElementById("otherstepname" + index).style.display = 'inline-table';
  } else {
    // not other: hide other step field and delete value
    document.getElementById("otherstepname" + index).style.display = 'none';
    document.getElementById("otherstepname" + index).value = '';
    let otherTextString = index + '|';
    vscodeApi.postMessage({ command: "saveotherstepvalue", text: otherTextString });
  }
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

function updateFieldOutlineAndTooltip(fieldId, fieldType, modular = 'normal') {
  let isCorrect = true;
  let field = document.getElementById(fieldId);
  if (!checkContent(fieldType, field.value, modular)) {
    updateFieldWrong(field.id,fieldType);
    isCorrect = false;
  } else {
    updateFieldRight(field.id, fieldType);
  }

  return isCorrect;
}

function saveStepFieldValue(event) {
  const stepField = event.target;

  // save field value
  let textString = stepField.getAttribute('indexstep') + '|' + stepField.value;
  vscodeApi.postMessage({ command: "savestepfieldvalue", text: textString });

  // if invalid content: add red outline and tooltip
  updateFieldOutlineAndTooltip(stepField.id, stepField.className);
}

function saveOtherStepValue(event) {
  const otherStepField = event.target;

  // save field value
  let textString = otherStepField.getAttribute('indexotherstep') + '|' + otherStepField.value;
  vscodeApi.postMessage({ command: "saveotherstepvalue", text: textString });

  // if invalid content: add red outline and tooltip
  updateFieldOutlineAndTooltip(otherStepField.id, otherStepField.className);
}

function checkModularScenario(content) {
  let currentElements = content.split('-');
  let modularElements = document.getElementById("modularelements").value.split(',');
  let isValid = true;
  if (currentElements !== null) {
    for (let index = 0; index < currentElements.length; index++) {
      if (!modularElements.includes(currentElements[index])) {
        isValid = false;
        break;
      }
    }
  }

  return isValid;
}

function saveScenarioFieldValue(event) {
  const scenarioField = event.target;

  // save field value
  let textString = scenarioField.getAttribute('indexscenario') + '|' + scenarioField.value;
  vscodeApi.postMessage({ command: "savescenariofieldvalue", text: textString });

  // if modular: check if contains allowed elements
  if (document.getElementById("modular").checked) {
    //if invalid: show red outline and content tooltip
    updateFieldOutlineAndTooltip(scenarioField.id, scenarioField.className, 'modular');
  }
}

function saveModularValue(event) {
  const field = event.target;
  let textString = field.checked;
  vscodeApi.postMessage({ command: "savemodularvalue", text: textString });

  // refresh panel
  vscodeApi.postMessage({ command: "refreshpanel", text: 'frommodular' });
}

function saveESCheckboxValue(event) {
  const field = event.target;

  // save value
  let textString = field.getAttribute('indexescheckbox') + '|' + field.checked;
  vscodeApi.postMessage({ command: "saveescheckboxvalue", text: textString });

  // update associated existing scenario field
  let scenarioId = field.id.slice(3, field.id.length);
  if (field.checked) {
    document.getElementById(scenarioId).readOnly = true;
    document.getElementById(scenarioId).disabled = false;
  } else {
    document.getElementById(scenarioId).disabled = true;
    document.getElementById(scenarioId).readOnly = false;
  }
}

function createIntegration() {
  // check field content
  if (checkFields()) {
    //vscodeApi.postMessage({ command: "showinformationmessage", text: "correct code content" });
    vscodeApi.postMessage({ command: "createintegration", text: "real fast!" });
  } else {
    vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
  }
}