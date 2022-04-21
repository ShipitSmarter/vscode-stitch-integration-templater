const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("updatesteps").addEventListener("click", updateNofSteps);
  document.getElementById("updatescenarios").addEventListener("click", updateNofScenarios);

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

  // save create/update radio entry
  const createUpdateFields = document.getElementsByName("createupdate");
  for (const createUpdateField of createUpdateFields) {
    createUpdateField.addEventListener("click",saveCreateUpdateValue);
  }

  // save modular checkbox entry
  document.getElementById("modular").addEventListener("click",saveModularValue);

   // save step field entries: 
   // fields
   const stepFields = document.getElementsByClassName("stepfield");
   for (const stepField of stepFields) {
    stepField.addEventListener("keyup",saveStepFieldValue);
   }

   // dropdowns
   const stepDropDowns = document.getElementsByClassName("stepdropdown");
   for (const stepDropDown of stepDropDowns) {
    stepDropDown.addEventListener("change",saveStepFieldValue);
   }

   // save scenario field entries
   const scenarioFields = document.getElementsByClassName("scenariofield");
   for (const scenarioField of scenarioFields) {
    scenarioField.addEventListener("keyup",saveScenarioFieldValue);
   }
}

function saveFieldValue(event) {
  const field = event.target;
  let textString = field.getAttribute('index') + '|' + field.value;
  vscodeApi.postMessage({ command: "savefieldvalue", text:  textString });
}

function saveStepFieldValue(event) {
  const stepField = event.target;
  let textString = stepField.getAttribute('indexstep') + '|' + stepField.value;
  vscodeApi.postMessage({ command: "savestepfieldvalue", text:  textString });
}

function saveScenarioFieldValue(event) {
  const scenarioField = event.target;
  let textString = scenarioField.getAttribute('indexscenario') + '|' + scenarioField.value;
  vscodeApi.postMessage({ command: "savescenariofieldvalue", text:  textString });
}

function saveCreateUpdateValue(event) {
  const field = event.target;
  let textString = field.value;
  vscodeApi.postMessage({ command: "savecreateupdatevalue", text:  textString });
}

function saveModularValue(event) {
  const field = event.target;
  let textString = field.checked;
  vscodeApi.postMessage({ command: "savemodularvalue", text:  textString });
}

function updateNofSteps () {
  let nofStepsField = document.getElementById("nofsteps");
  vscodeApi.postMessage({ 
    command: "updatenofsteps", 
    text: nofStepsField.value
  });
}

function updateNofScenarios () {
  let nofScenariosField = document.getElementById("nofscenarios");
  vscodeApi.postMessage({ 
    command: "updatenofscenarios", 
    text: nofScenariosField.value
  });
}