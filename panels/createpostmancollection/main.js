const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("createpostmancollection").addEventListener("click", createPostmanCollection);

  // save dropdowns
  const dropdowns = document.querySelectorAll(".dropdown");
  for (const field of dropdowns) {
    field.addEventListener("change", fieldChange);
  }

  // save input fields
  const fields = document.querySelectorAll(".field,.headername,.headervalue,.scenariofield");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
    if (field.classList[0] === 'scenariofield') {
      field.addEventListener("change", fieldChange);
    }
  }

   // checkboxes
   const checkBoxes = document.querySelectorAll(".independent,.modular");
   for (const checkbox of checkBoxes) {
     checkbox.addEventListener("change", fieldChange);
   }

  // headers
  // set first header read-only
  document.getElementById('headername0').readOnly = true;
  document.getElementById('headervalue0').readOnly = true;
}

function fieldChange(event) {
  const field = event.target;

  // save field value
  saveValue(field.id);
  
  // do some more stuff based on field class
  switch (field.classList[0]) {
    // input fields:
    case 'headername':
    case 'headervalue':
    case 'dropdown':
    case 'independent':
    case 'modular':
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

function isEmpty(string) {
  var empty = false;
  if (string === '' || string === undefined || string === null) {
    empty = true;
  }

  return empty;
}

function isModular() {
  return document.getElementById("modular").checked;
}

function updateFieldDuplicate(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid red";
  field.title = 'Scenario is duplicate of other (existing) scenario';
}

function updateFieldWrongModularScenario(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid red";
  field.title = 'Format: \'fromnl-tode-sl1800\'. Elements must be present in scenario-elements/modular.';
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

  return isDuplicate;
}

function updateFieldOutlineAndTooltip(fieldId) {
  let isCorrect = true;
  let field = document.getElementById(fieldId);

  var fieldType = field.className;

  if (field.classList[0] === 'scenariofield') {
    if (!isModular()) {
      // check duplicate scenario drop-downs
      if (isScenarioDuplicate(field.id) && !isEmpty(field.value)) {
        isCorrect = false;
        updateFieldDuplicate(field.id);
      } else {
        updateFieldRight(field.id, fieldType);
      }   
      
    } else {
      // check any 'normal' input field
      if (!checkModularScenario(field.value)) {
        updateFieldWrongModularScenario(field.id,fieldType);
        isCorrect = false;
      } else {
        updateFieldRight(field.id, fieldType);
      }
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

function refreshPanel(string="") {
  vscodeApi.postMessage({ command: "refreshpanel", text: string });
}

function createPostmanCollection() {
  vscodeApi.postMessage({ command: "createpostmancollection", text: "real fast!" });
}