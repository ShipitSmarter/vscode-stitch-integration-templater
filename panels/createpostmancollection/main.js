const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("createpostmancollection").addEventListener("click", createPostmanCollection);

  // dropdowns
  const fields = document.querySelectorAll(".dropdown");
  for (const field of fields) {
    field.addEventListener("change", fieldChange);
  }

  // on panel creation: save all dropdown values (if exist)
  saveValue("modulename");
}

function fieldChange(event) {
  const field = event.target;

  // save field value
  saveValue(field.id);
  
  // do some more stuff based on field class
  switch (field.classList[0]) {
    // input fields:
    case 'field':
      // some input field logic here
      break;

    // dropdown: delete scenarios if module dropdown change, refresh panel
    case 'dropdown':
      // some dropdown logic here
      //refreshPanel('dropdown');
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
  }
  var value = field.value;
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