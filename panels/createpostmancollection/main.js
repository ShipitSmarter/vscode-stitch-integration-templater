import { flipTile, updateTiles, isModular, updateScenarioFieldOutlineAndTooltip } from "./scenariofunctions.js";
import { isEmpty } from "./general.js";

// track last selected text field
let currentInput = document.querySelectorAll(".scenariofield")[0];

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);


function main() {

  // button onclick event listeners
  document.getElementById("createpostmancollection").addEventListener("click", createPostmanCollection);
  document.getElementById("refresh").addEventListener("click", refreshContent);

  // tile buttons
  for (const tilebutton of document.querySelectorAll(".modulartile")) {
    tilebutton.addEventListener("click", clickTile);
  }

  // save dropdowns
  const dropdowns = document.querySelectorAll(".dropdown,.dropdownfield");
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

  // track last selected scenario field
  // from https://stackoverflow.com/a/68176703/1716283
  // if (isModular()) {
    for (const scenariofield of document.querySelectorAll(".scenariofield")) {
      scenariofield.addEventListener('focus',modularScenarioFocus);
    }
  // }
  

   // checkboxes
   const checkBoxes = document.querySelectorAll(".independent,.modular");
   for (const checkbox of checkBoxes) {
     checkbox.addEventListener("change", fieldChange);
   }

  // headers
  // set first header read-only
  document.getElementById('headername0').readOnly = true;

   // on panel creation: update field outlines and tooltips
   checkFields();
}

function clickTile(event) {
  const field = event.target;

  // add/remove tile content to last selected text field
  let currentElements = currentInput.value.split('-');
  if (currentElements.includes(field.id)) {
    currentInput.value = currentElements.filter(el => el !== field.id).join('-');
  } else {
    currentInput.value = currentInput.value + (isEmpty(currentInput.value) ? '' : '-') + field.id;
  }

  // save field value
  saveValue(currentInput.id);

  // trigger 'change' event to save
  // currentInput.dispatchEvent(new Event('change'));

  // update appearance on click
  flipTile(field.id);
}

function modularScenarioFocus(event) {
  const field = event.target;

  // update currentInput
  currentInput = field;

  // update tiles
  updateTiles(currentInput.value);
}

function fieldChange(event) {
  const field = event.target;

  // save field value
  saveValue(field.id);
  
  // do some more stuff based on field class
  switch (field.classList[0]) {
    case 'scenariofield':
      if (!isModular()) {
        // if not modular: check ALL scenarios
        for (const sc of document.querySelectorAll(".scenariofield")) {
          updateScenarioFieldOutlineAndTooltip(sc.id);
        }
      } else {
        // else: just check this one
        updateScenarioFieldOutlineAndTooltip(field.id);
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

function checkFields() {
  // check if any incorrect field contents and update fields outlining and tooltip in the process
  var check = true;
  const fields = document.querySelectorAll(".scenariofield");
  for (const field of fields) {
    check = updateScenarioFieldOutlineAndTooltip(field.id) ? check : false;
  }

  return check;
}

function refreshPanel(string="") {
  vscodeApi.postMessage({ command: "refreshpanel", text: string });
}

function refreshContent() {
  vscodeApi.postMessage({ command: "refreshcontent", text: "" });
}

function createPostmanCollection() {
  // check field content
  if (checkFields()) {
    vscodeApi.postMessage({ command: "createpostmancollection", text: "real fast!" });
  } else {
    vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
  }
}