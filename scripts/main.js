const vscodeApi = acquireVsCodeApi();

function startScript() {
    vscodeApi.postMessage({ command: "startScript", text: "Start Selected Script" });
};

const executeCommand = () =>{
    vscodeApi.postMessage({ command: "executeCommand", text: ScriptCommandField = document.getElementById('ScriptCommand').value });
};