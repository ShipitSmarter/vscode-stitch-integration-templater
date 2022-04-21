const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  const stepsButton = document.getElementById("oldsteps");
  stepsButton.addEventListener("click", updateNofSteps);

  const startScriptButton = document.getElementById("startscript");
  startScriptButton.addEventListener("click",startScript);

  const executeCommandButton = document.getElementById("executecommand");
  executeCommandButton.addEventListener("click",executeCommand);

  const executeScriptButton = document.getElementById("executescript");
  executeScriptButton.addEventListener("click",executeScript);

  const executeWithFunctionsButton = document.getElementById("executewithfunctions");
  executeWithFunctionsButton.addEventListener("click",executeWithFunctions);

  // save field entries

   // save flexfield entries
  const flexFields = document.getElementsByClassName("flexfield");
  for (const flexField of flexFields) {
    flexField.addEventListener("keyup",saveFlexFieldValues);
  }
}

function saveFieldValue(index, value) {
  let textString = index + '|' + value;
  vscodeApi.postMessage({ 
    command: "savefieldvalue", 
    text:  textString
  });
}

function saveFlexFieldValues () {
  const flexFields = document.getElementsByClassName("flexfield");
  for (const flexField of flexFields) {
    let textString = flexField.getAttribute('indexflex') + '|' + flexField.value;
    vscodeApi.postMessage({ 
      command: "saveflexfieldvalue", 
      text:  textString
    });
  }
}

function updateNofSteps () {
  let nofStepsField = document.getElementById("nofsteps");
  saveFieldValue(nofStepsField.getAttribute('index'),nofStepsField.value);
  vscodeApi.postMessage({ 
    command: "updateNofSteps", 
    text: nofStepsField.value
  });
}

function startScript () {
  vscodeApi.postMessage({ 
    command: "startScript", 
    text: "Start Selected Script" 
  });
}

function executeCommand () {
  let executeCommandField = document.getElementById("scriptcommand");
  saveFieldValue(executeCommandField.getAttribute('index'),executeCommandField.value);
  vscodeApi.postMessage({ 
    command: "executecommand", 
    text:  executeCommandField.value 
  });
}

function executeScript () {
  let executeScriptField = document.getElementById('scriptarguments');
  saveFieldValue(executeScriptField.getAttribute('index'),executeScriptField.value);
  vscodeApi.postMessage({ 
    command: "executescript", 
    text:  executeScriptField.value 
  });
}

function executeWithFunctions () {
  let executeWithFunctionsField = document.getElementById('functionsarguments');
  saveFieldValue(executeWithFunctionsField.getAttribute('index'),executeWithFunctionsField.value);
  vscodeApi.postMessage({ 
    command: "executewithfunctions", 
    text: executeWithFunctionsField.value 
  });
}