const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  const stepsButton = document.getElementById("updatesteps");
  stepsButton.addEventListener("click", updateNofSteps);

  // save field entries
  const fields = document.getElementsByClassName("field");
  for (const field of fields) {
    field.addEventListener("keyup",saveFieldValue);
  }

  // save dropdown entries
  const dropDowns = document.getElementsByClassName("dropdown");
  for (const dropDown of dropDowns) {
    dropDown.addEventListener("change",saveFieldValue);
  }

   // save stepfield entries
   const stepFields = document.getElementsByClassName("stepfield");
   for (const stepField of stepFields) {
    stepField.addEventListener("keyup",saveStepFieldValue);
   }
}

function saveFieldValue(event) {
  const field = event.target;
  let textString = field.getAttribute('index') + '|' + field.value;
  vscodeApi.postMessage({ command: "savefieldvalue", text:  textString });
}

function saveStepFieldValue(event) {
  const flexField = event.target;
  let textString = flexField.getAttribute('indexstep') + '|' + flexField.value;
  vscodeApi.postMessage({ command: "savestepfieldvalue", text:  textString });
}


function updateNofSteps () {
  let nofStepsField = document.getElementById("nofsteps");
  vscodeApi.postMessage({ 
    command: "updatenofsteps", 
    text: nofStepsField.value
  });
}