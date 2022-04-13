const vscodeApi = acquireVsCodeApi();

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