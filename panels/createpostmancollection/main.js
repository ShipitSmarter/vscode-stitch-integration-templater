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
  const fields = document.querySelectorAll(".field,.headername,.headervalue");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
  }

   // checkboxes
   const checkBoxes = document.querySelectorAll(".independent");
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
      break;
    case 'dropdown':
      break;
    case 'independent':
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

function refreshPanel(string="") {
  vscodeApi.postMessage({ command: "refreshpanel", text: string });
}

function createPostmanCollection() {
  vscodeApi.postMessage({ command: "createpostmancollection", text: "real fast!" });
}