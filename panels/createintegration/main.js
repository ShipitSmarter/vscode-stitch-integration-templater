const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  document.getElementById("createintegration").addEventListener("click", createIntegration);
  document.getElementById("checkintegrationexists").addEventListener("click", checkIntegrationPath);

  // save field entries
  const fields = document.getElementsByClassName("field");
  for (const field of fields) {
    field.addEventListener("keyup",saveFieldValue);
  }

  // save dropdown entries
  const dropDowns = document.getElementsByClassName("dropdown");
  for (const dropDown of dropDowns) {
    dropDown.addEventListener("change",dropdownChange);
  }

  // save modular checkbox entry
  document.getElementById("modular").addEventListener("click",saveModularValue);

   // save step field entries: 
   // fields
   const stepFields = document.getElementsByClassName("stepfield");
   for (const stepField of stepFields) {
    stepField.addEventListener("keyup",saveStepFieldValue);
   }

   // other step fields
   const otherStepFields = document.getElementsByClassName("otherstepfield");
   for (const otherStepField of otherStepFields) {
    otherStepField.addEventListener("keyup",saveOtherStepValue);
   }

   // dropdowns
   const stepDropDowns = document.getElementsByClassName("stepdropdown");
   for (const stepDropDown of stepDropDowns) {
    stepDropDown.addEventListener("change",stepDropdownChange);
   }

   // save scenario field entries
   const scenarioFields = document.getElementsByClassName("scenariofield");
   for (const scenarioField of scenarioFields) {
    scenarioField.addEventListener("keyup",saveScenarioFieldValue);
   }

   // save existing scenario checkbox entries
   for (const esCheckbox of document.getElementsByClassName("existingscenariocheckbox")) {
    esCheckbox.addEventListener("click",saveESCheckboxValue);
   }

   // on panel creation: save all dropdown values
   // fieldValues dropdowns (modulename, nofsteps)
   vscodeApi.postMessage({ command: "savefieldvalue", text:  '2|' + document.getElementById("modulename").value });
   vscodeApi.postMessage({ command: "savefieldvalue", text:  '5|' + document.getElementById("nofsteps").value });
   vscodeApi.postMessage({ command: "savefieldvalue", text:  '6|' + document.getElementById("nofscenarios").value });

   // stepDropdowns
   for (const stepDropDown of document.getElementsByClassName("stepdropdown")) {
    let textString = stepDropDown.getAttribute('indexstep') + '|' + stepDropDown.value;
    vscodeApi.postMessage({ command: "savestepfieldvalue", text:  textString });

    // if 'other': reveal other step field
    if (stepDropDown.value === 'other') {
      let index = stepDropDown.getAttribute('indexstep');
      document.getElementById("otherstepname" + index).style.display = 'inline-table';
    }
   }
}

function checkIntegrationPath () {
  // check if module exists
  vscodeApi.postMessage({ command: "checkintegrationexists", text:  'checkintegrationexists' });
}

function dropdownChange(event) {
  const field = event.target;
  
  // save field value
  let textString = field.getAttribute('index') + '|' + field.value;
  vscodeApi.postMessage({ command: "savefieldvalue", text:  textString });

  // refresh panel
  vscodeApi.postMessage({ command: "refreshpanel", text:  'fromdropdown' });
}

function saveFieldValue(event) {
  const field = event.target;
  let textString = field.getAttribute('index') + '|' + field.value;
  vscodeApi.postMessage({ command: "savefieldvalue", text:  textString });
}

function stepDropdownChange(event) {
  const stepField = event.target;

  // save field
  let index = stepField.getAttribute('indexstep');
  let textString = index + '|' + stepField.value;
  vscodeApi.postMessage({ command: "savestepfieldvalue", text:  textString });

  // if 'other', show other step field
  if (stepField.value === 'other') {
    document.getElementById("otherstepname" + index).style.display = 'inline-table';
  } else {
    // not other: hide other step field and delete value
    document.getElementById("otherstepname" + index).style.display = 'none';
    document.getElementById("otherstepname" + index).value = '';
    let otherTextString = index + '|';
    vscodeApi.postMessage({ command: "saveotherstepvalue", text: otherTextString  });
  }

  // if 'other' refresh panel
  //vscodeApi.postMessage({ command: "refreshpanel", text:  document.getElementById("otherstepname" + index).style.display });
  
}

function saveStepFieldValue(event) {
  const stepField = event.target;
  let textString = stepField.getAttribute('indexstep') + '|' + stepField.value;
  vscodeApi.postMessage({ command: "savestepfieldvalue", text:  textString });
}

function saveOtherStepValue(event) {
  const otherStepField = event.target;
  let textString = otherStepField.getAttribute('indexotherstep') + '|' + otherStepField.value;
  vscodeApi.postMessage({ command: "saveotherstepvalue", text:  textString });
}

function saveScenarioFieldValue(event) {
  const scenarioField = event.target;
  let textString = scenarioField.getAttribute('indexscenario') + '|' + scenarioField.value;
  vscodeApi.postMessage({ command: "savescenariofieldvalue", text:  textString });
}

function saveModularValue(event) {
  const field = event.target;
  let textString = field.checked;
  vscodeApi.postMessage({ command: "savemodularvalue", text:  textString });
}

function saveESCheckboxValue(event) {
  const field = event.target;

  // save value
  let textString = field.getAttribute('indexescheckbox') + '|' + field.checked;
  vscodeApi.postMessage({ command: "saveescheckboxvalue", text:  textString });

  // update associated existing scenario field
  let scenarioId = field.id.slice(3,field.id.length);
  if (field.checked) {
    document.getElementById(scenarioId).readOnly = true;
    document.getElementById(scenarioId).disabled = false;
  } else {
    document.getElementById(scenarioId).disabled = true;
    document.getElementById(scenarioId).readOnly = false;
  }
}

function createIntegration () {
  vscodeApi.postMessage({ 
    command: "createintegration", 
    text: "real fast!"
  });
}