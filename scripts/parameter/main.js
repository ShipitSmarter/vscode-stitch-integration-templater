import { isEmpty } from "../general/general.js";

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {

  // button onclick event listeners
  document.getElementById("getparameters").addEventListener("click", getParameters);
  // document.getElementById("refresh").addEventListener("click", refreshContent);
  document.getElementById("load").addEventListener("click",loadFile);

  // previous checkbox
  document.getElementById("previous").addEventListener("change", previousChange);

  // load file checkbox
  document.getElementById("showload").addEventListener("change", showLoadChange);


  // save dropdowns
  const dropdowns = document.querySelectorAll(".dropdown");
  for (const field of dropdowns) {
    field.addEventListener("change", fieldChange);
  }

  // save input fields
  const fields = document.querySelectorAll(".field,.codecompanyfield,.codecustomerfield,.parameternamefield,.newvaluefield");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
  }

  // actions on panel load
  updateHighlightSet();
}

function fieldChange(event) {
  const field = event.target;

  // save field value
  saveValue(field.id);
}

function previousChange(event) {
  const field = event.target;

  saveValue(field.id);

  updateHighlightSet();
}

function showLoadChange(event) {
  const field = event.target;

  saveValue(field.id);

  if (field.checked) {
    document.getElementById("files").hidden = false;
    document.getElementById("load").hidden = false;
  } else {
    document.getElementById("files").hidden = true;
    document.getElementById("load").hidden = true;
  }
}

function updateHighlightSet() {
  const prevs = document.querySelectorAll(".previousvaluefield");
  const news = document.querySelectorAll(".newvaluefield");

  if (document.getElementById("previous").checked) {
    for (const prev of prevs) {
      highlightSet(prev.id);
    }
    for (const neww of news) {
      unHighlight(neww.id);
    }
  } else {
    for (const neww of news) {
      highlightSet(neww.id);
    }
    for (const prev of prevs) {
      unHighlight(prev.id);
    }
  }
}

function highlightSet(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid cyan";
}

function unHighlight(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "none";
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

function loadFile() {
  var path = document.getElementById("files").value;
  vscodeApi.postMessage({ command: "loadfile", text: path });
}

function getParameters() {
  // check field content
  if (true) {
    vscodeApi.postMessage({ command: "getparameters", text: "real fast!" });
  } else {
    vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
  }
}