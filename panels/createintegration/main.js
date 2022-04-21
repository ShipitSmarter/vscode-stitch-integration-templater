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
  document.getElementById("nofsteps").addEventListener("change",saveFieldValue);
  document.getElementById("scriptcommand").addEventListener("keyup",saveFieldValue);
  document.getElementById("scriptarguments").addEventListener("keyup",saveFieldValue);
  document.getElementById("functionsarguments").addEventListener("keyup",saveFieldValue);

   // save flexfield entries
  const flexFields = document.getElementsByClassName("flexfield");
  for (const flexField of flexFields) {
    flexField.addEventListener("keyup",saveFlexFieldValue);
  }
}

function saveFieldValue(event) {
  const field = event.target;
  let textString = field.getAttribute('index') + '|' + field.value;
  vscodeApi.postMessage({ command: "savefieldvalue", text:  textString });
}

function saveFlexFieldValue(event) {
  const flexField = event.target;
  let textString = flexField.getAttribute('indexflex') + '|' + flexField.value;
  vscodeApi.postMessage({ command: "saveflexfieldvalue", text:  textString });
}

function updateNofSteps () {
  let nofStepsField = document.getElementById("nofsteps");
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
  vscodeApi.postMessage({ 
    command: "executecommand", 
    text:  executeCommandField.value 
  });
}

function executeScript () {
  let executeScriptField = document.getElementById('scriptarguments');
  vscodeApi.postMessage({ 
    command: "executescript", 
    text:  executeScriptField.value 
  });
}

function executeWithFunctions () {
  let executeWithFunctionsField = document.getElementById('functionsarguments');
  vscodeApi.postMessage({ 
    command: "executewithfunctions", 
    text: executeWithFunctionsField.value 
  });
}