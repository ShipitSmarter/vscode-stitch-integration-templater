const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // button onclick event listeners
  const howdyButton = document.getElementById("howdy");
  howdyButton.addEventListener("click", handleHowdyClick);

  const stepsButton = document.getElementById("oldsteps");
  stepsButton.addEventListener("click", updateNofSteps);

  const startScriptButton = document.getElementById("startscript");
  startScriptButton.addEventListener("click",startScript);
}

function handleHowdyClick() {
  vscodeApi.postMessage({
    command: "hello",
    text: "Hey there partner! 🤠",
  });
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
