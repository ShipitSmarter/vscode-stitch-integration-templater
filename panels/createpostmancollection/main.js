import { checkScenarioFields, addScenarioEventListeners } from "./scenariofunctions.js";
import { isEmpty } from "./general.js";

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {

  // button onclick event listeners
  document.getElementById("createpostmancollection").addEventListener("click", createPostmanCollection);
  document.getElementById("refresh").addEventListener("click", refreshContent);

  // independent checkbox
  document.getElementById("independent").addEventListener("change", fieldChange);

  // save dropdowns
  const dropdowns = document.querySelectorAll(".dropdown,.dropdownfield");
  for (const field of dropdowns) {
    field.addEventListener("change", fieldChange);
  }

  // save input fields
  const fields = document.querySelectorAll(".field,.headername,.headervalue");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
  }

  // headers
  // set first header read-only
  document.getElementById('headername0').readOnly = true;

  // scenario grid fields
  addScenarioEventListeners(vscodeApi);

   // on panel creation: update field outlines and tooltips
   checkScenarioFields();
}

function fieldChange(event) {
  const field = event.target;

  // save field value
  saveValue(field.id);
  
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

function refreshContent() {
  vscodeApi.postMessage({ command: "refreshcontent", text: "" });
}

function createPostmanCollection() {
  // check field content
  if (checkScenarioFields()) {
    vscodeApi.postMessage({ command: "createpostmancollection", text: "real fast!" });
  } else {
    vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
  }
}