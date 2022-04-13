const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  const howdyButton = document.getElementById("howdy");
  howdyButton.addEventListener("click", handleHowdyClick);
}

function handleHowdyClick() {
  vscodeApi.postMessage({
    command: "hello",
    text: "Hey there partner! 🤠",
  });
}

const startScript = () => {
    vscodeApi.postMessage({ command: "startScript", text: "Start Selected Script" });
};

const executeCommand = () =>{
    vscodeApi.postMessage({ command: "executeCommand", text: document.getElementById('ScriptCommand').value });
};

const executeScript = () =>{
    vscodeApi.postMessage({ command: "executeScript", text: document.getElementById('ScriptArguments').value });
};

const findAndExecuteScript = () => {
    vscodeApi.postMessage({ command: "findAndExecuteScript", text: document.getElementById('FindScriptArguments').value });
};

const updateNofSteps = () => {
    vscodeApi.postMessage({ command: "updateNofSteps", text: document.getElementById('nofSteps').value });
};