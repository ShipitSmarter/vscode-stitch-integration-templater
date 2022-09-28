import { checkScenarioFields, addScenarioEventListeners } from "../general/scenariofunctions.js";
import { isEmpty } from "../general/general.js";

const vscodeApi = acquireVsCodeApi();

const scenarioGridExists = !!document.getElementById("scenariogrid");
window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("createintegration").addEventListener("click", createIntegration);
  document.getElementById("checkintegrationexists").addEventListener("click", checkIntegrationPath);
  document.getElementById("addstep").addEventListener("click",addStep);
  document.getElementById("removestep").addEventListener("click",removeStep);

  // step up/down buttons
  for (const field of document.querySelectorAll(".stepup")) {
    field.addEventListener("click",stepUp);
  }

  for (const field of document.querySelectorAll(".stepdown")) {
    field.addEventListener("click",stepDown);
  }

  // input fields
  const fields = document.querySelectorAll(".field,.dropdown,.stepdropdown,.existingscenariocheckbox");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
  }

  // fixed/step dropdowns
  const dropDowns = document.querySelectorAll(".dropdown,.stepdropdown,.steptypedropdown,.stepmethoddropdown");
  for (const dropDown of dropDowns) {
    dropDown.addEventListener("change", fieldChange);
  }

  // checkboxes
  const checkBoxes = document.querySelectorAll(".existingscenariocheckbox,.checkallexisting");
  for (const checkbox of checkBoxes) {
    checkbox.addEventListener("change", fieldChange);
  }

  // scenario grid fields
  if (scenarioGridExists) {
    addScenarioEventListeners(vscodeApi);
  }  
  
  // on panel creation: update field outlines and tooltips
  checkFields();

  // on panel creation: re-save all step name dropdowns with value equal to modulename
  for (const stepNameField of document.querySelectorAll(".stepdropdown")) {
    if (stepNameField.value === document.getElementById("modulename").value) {
      stepNameField.dispatchEvent(new Event('change'));
    }
  }
}

function isCreate() {
  // check if create or update
  return (document.getElementById('createupdate').value === 'create');
}

function getExistingSteps() {
  // return existing steps from hidden field
  return document.getElementById("existingsteps").value.split(",");
}

function fieldChange(event) {
  const field = event.target;

  // save field value
  saveValue(field.id);
  
  // do some more stuff based on field class
  switch (field.classList[0]) {
    // input fields: check contents
    case 'field':
      updateFieldOutlineAndTooltip(field.id);
      break;
    
    // existingscenariocheckbox: update associated existing scenario field
    case 'existingscenariocheckbox':
      var scenarioId = field.id.slice(3, field.id.length);
      // var scenario = document.getElementById(scenarioId);
      var scenarioname = document.getElementById(scenarioId.replace('scenario','scenariocustom'));
      if (field.checked) {
        // scenario.readOnly = true;
        scenarioname.readOnly = true;
        // scenario.disabled = false;
        scenarioname.disabled = false;
      } else {
        // scenario.disabled = true;
        scenarioname.disabled = true;
        // scenario.readOnly = false;
        scenarioname.readOnly = false;
      }
      break;

    case 'checkallexisting':
      for (const checkbox of document.querySelectorAll(".existingscenariocheckbox")) {
        checkbox.checked = field.checked;
      }  
      break;

    case 'stepdropdown' :
      field.title = field.value;
      break;
  }
  
}

function infoMessage(info) {
  vscodeApi.postMessage({ command: "showinformationmessage", text: info });
}

function saveValue(fieldId) {
  var field = document.getElementById(fieldId);
  var attr = 'index';
  var value = field.checked ?? field.value;
  var textString = field.classList[0] + '|' + (field.getAttribute(attr) ?? '') + '|' + value;
  vscodeApi.postMessage({ command: "savevalue", text: textString });
}

function checkFields() {
  // check if any incorrect field contents and update fields outlining and tooltip in the process
  var check = true;
  const fields = document.querySelectorAll(".field");
  for (const field of fields) {
    check = updateFieldOutlineAndTooltip(field.id) ? check : false;
  }

  // check scenario fields
  if (scenarioGridExists) {
    check = checkScenarioFields() ? check : false;
  }
  
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
  } else if (['carriername','carriercode'].includes(field.id) && isEmpty(field.value)) {
    updateFieldEmpty(field.id);
    isCorrect = false;
  } else if (field.id === 'carrierapiname' && isEmpty(field.value) && isCreate()) {
    // api field may not be empty if 'create'
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

function addStep(event) {
  const field = event.target;

  let existingSteps = document.getElementById("existingsteps").value.split(',');
  let stepOptions = document.getElementById("stepoptions").value.split(',');
  let possibleSteps = existingSteps.concat(stepOptions).filter(el => !isEmpty(el));
  let maxSteps = possibleSteps.length;

  let nofStepsField = document.getElementById("nofsteps");
  let nofSteps = parseInt(nofStepsField.value);

  if (nofSteps < maxSteps) {
    nofStepsField.value = (nofSteps + 1).toString();
    nofStepsField.dispatchEvent(new Event('change'));
  }
}

function removeStep(event) {
  const field = event.target;

  let nofStepsField = document.getElementById("nofsteps");
  let nofSteps = parseInt(nofStepsField.value);

  if (nofSteps > getExistingSteps().length) {
    // find lowest 'new' step and remove
    for (let index=(nofSteps -1); index >= 0; index-- ) {
      var stepName = document.getElementById("stepname" + index.toString()).value;
      if (!getExistingSteps().includes(stepName)) {
        vscodeApi.postMessage({ command: "removestepindex", text: index.toString() });
        break;
      }
    }

    // nofStepsField.value = (nofSteps - 1).toString();
    // nofStepsField.dispatchEvent(new Event('change'));
  }
}

function switchSteps(index1, index2) {
  // get current values
  let stepName1 = document.getElementById("stepname" + index1);
  let stepType1 = document.getElementById("steptype" + index1);
  let stepMethod1 = document.getElementById("stepmethod" + index1);

  let stepName1Value = stepName1.value;
  let stepType1Value = stepType1.value;
  let stepMethod1Value = stepMethod1.value;

  let stepName1Existing = getExistingSteps().includes(stepName1Value);

  let stepName2 = document.getElementById("stepname" + index2);
  let stepType2 = document.getElementById("steptype" + index2);
  let stepMethod2 = document.getElementById("stepmethod" + index2);

  let stepName2Value = stepName2.value;
  let stepType2Value = stepType2.value;
  let stepMethod2Value = stepMethod2.value;

  let stepName2Existing = getExistingSteps().includes(stepName2Value);

  // switch values
  stepName1.value = stepName2Value;
  stepType1.value = stepType2Value;
  stepMethod1.value = stepMethod2Value;

  stepName2.value = stepName1Value;
  stepType2.value = stepType1Value;
  stepMethod2.value = stepMethod1Value;

  // show/hide
  if (stepName1Existing) {
    hideStep(index2);
  } else {
    showStep(index2);
  }

  if (stepName2Existing) {
    hideStep(index1);
  } else {
    showStep(index1);
  }

}

function showStep(index) {
  let stepNameField = document.getElementById("stepname" + index);
  let stepTypeField = document.getElementById("steptype" + index);
  let stepMethodField = document.getElementById("stepmethod" + index);
  let stepUpButton = document.getElementById("stepup" + index);
  let stepDownButton = document.getElementById("stepdown" + index);

  stepNameField.disabled = false;
  stepTypeField.disabled = false;
  if(stepTypeField.value === 'http') {
    stepMethodField.disabled = false;
  } else {
    stepMethodField.disabled = true;
  }
  stepUpButton.hidden = false;
  stepDownButton.hidden = false;
}

function hideStep(index) {
  let stepNameField = document.getElementById("stepname" + index);
  let stepTypeField = document.getElementById("steptype" + index);
  let stepMethodField = document.getElementById("stepmethod" + index);
  let stepUpButton = document.getElementById("stepup" + index);
  let stepDownButton = document.getElementById("stepdown" + index);

  stepNameField.disabled = true;
  stepTypeField.disabled = true;
  stepMethodField.disabled = true;
  stepUpButton.hidden = true;
  stepDownButton.hidden = true;
}

function stepUp(event) {
  let stepUpButton = event.target;
  const index = parseInt(stepUpButton.id.replace("stepup",''));

  if (index > 0) {
    // switchSteps(index.toString(),(index-1).toString());
    vscodeApi.postMessage({ command: "switchsteps", text: (index.toString() + "|" + (index-1).toString()) });
  }
}

function stepDown(event) {
  let nofSteps = parseInt(document.getElementById("nofsteps").value);
  let stepDownButton = event.target;
  const index = parseInt(stepDownButton.id.replace("stepdown",''));

  if (index < (nofSteps-1)) {
    //switchSteps(index.toString(),(index+1).toString());
    vscodeApi.postMessage({ command: "switchsteps", text: (index.toString() + "|" + (index+1).toString()) });
  }
}