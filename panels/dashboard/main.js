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

function updateNofSteps () {
  vscodeApi.postMessage({ 
    command: "updateNofSteps", 
    text: document.getElementById("nofsteps").value
  });
}

function startScript () {
  vscodeApi.postMessage({ 
    command: "startScript", 
    text: "Start Selected Script" 
  });
}

function executeCommand () {
  vscodeApi.postMessage({ 
    command: "executecommand", 
    text:  document.getElementById('scriptcommand').value 
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
    text:  document.getElementById('functionsarguments').value 
  });
}