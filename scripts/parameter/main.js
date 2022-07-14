import { isEmpty } from "../general/general.js";

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {

  // button onclick event listeners
  document.getElementById("getparameters").addEventListener("click", getParameters);
  // document.getElementById("refresh").addEventListener("click", refreshContent);
  // document.getElementById("load").addEventListener("click",loadPmc);

  // independent checkbox
  // document.getElementById("independent").addEventListener("change", fieldChange);


  // save dropdowns
  const dropdowns = document.querySelectorAll(".dropdown");
  for (const field of dropdowns) {
    field.addEventListener("change", fieldChange);
  }

  // save input fields
  const fields = document.querySelectorAll(".field");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
  }
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

function getParameters() {
  // check field content
  if (true) {
    vscodeApi.postMessage({ command: "getparameters", text: "real fast!" });
  } else {
    vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
  }
}