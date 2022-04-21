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
}

function saveFieldValue(index, value) {
  let textString = index + '|' + value;
  vscodeApi.postMessage({ 
    command: "savefieldvalue", 
    text:  textString
  });
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
  vscodeApi.postMessage({ 
    command: "executescript", 
    text:  document.getElementById('scriptarguments').value 
  });
}

function executeWithFunctions () {
  vscodeApi.postMessage({ 
    command: "executewithfunctions", 
    text: document.getElementById('functionsarguments').value 
  });
}