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
  
  // on panel creation: update field outlines and tooltips
  checkFields();
}

function isCreate() {
  // check if create or update
  return (document.getElementById('createupdate').value === 'create');
}

function isModular() {
  return document.getElementById("modular").checked;
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
    case 'scenariofield':
      if (!isModular()) {
        // if not modular: check ALL scenarios
        for (const sc of document.querySelectorAll(".scenariofield")) {
          updateFieldOutlineAndTooltip(sc.id);
        }
      } else {
        // else: just check this one
        updateFieldOutlineAndTooltip(field.id);
      }
      break;

    // dropdown: delete scenarios if module dropdown change, refresh panel
    case 'dropdown':
      if (field.id === 'modulename') {
        vscodeApi.postMessage({ command: "clearscenarios", text: '' });
      }
      vscodeApi.postMessage({ command: "refreshpanel", text: '' });
      break;

    // modular: clear scenarios, refresh panel
    case 'modular':
      vscodeApi.postMessage({ command: "clearscenarios", text: '' });
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

function infoMessage(info) {
  vscodeApi.postMessage({ command: "showinformationmessage", text: info });
}

function getNewScenarioValue(fieldValue) {
  return fieldValue.replace(/[^\>]+\> /g, '');
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

function checkContent(id, value) {
  let isCorrect = true;

  // if this is modular scenario field: return checkModularScenario
  if (isModular() && id.startsWith('scenario')) {
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

function updateFieldDuplicate(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid red";
  field.title = 'Scenario is duplicate of other (existing) scenario';
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

function isScenarioDuplicate(fieldId) {
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

  // if no duplicate other scenarios: check existing scenarios
  if (!isDuplicate && !isCreate() ) {
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

function updateFieldOutlineAndTooltip(fieldId) {
  let isCorrect = true;
  let field = document.getElementById(fieldId);

  var fieldType = (field.className === 'field') ? field.id : field.className;

  if (!isModular() && (field.classList[0] === 'scenariofield')) {
    // check duplicate scenario drop-downs
    if (isScenarioDuplicate(field.id) && !isEmpty(field.value)) {
      isCorrect = false;
      updateFieldDuplicate(field.id);
    } else {
      updateFieldRight(field.id, fieldType);
    }   
    
  } else {
    // check any 'normal' input field
    if (!checkContent(fieldType, field.value)) {
      updateFieldWrong(field.id,fieldType);
      isCorrect = false;
    } else if (['carriername','carrierapiname','carriercode'].includes(field.id) && isEmpty(field.value)) {
      updateFieldEmpty(field.id);
      isCorrect = false;
    } else {
      updateFieldRight(field.id, fieldType);
    }
  }
  
  return isCorrect;
}

function isEmpty(string) {
  var empty = false;
  if (string === '' || string === undefined || string === null) {
    empty = true;
  }

  return empty;
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