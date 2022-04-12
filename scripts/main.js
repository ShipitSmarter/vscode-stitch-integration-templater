const vscodeApi = acquireVsCodeApi();

// listeners
// document.getElementById('ScriptCommand').addEventListener("keydown", function (e) {
// 	if (e.key === "Enter") {  
// 		executeCommand();
// 	}
// });

//addEnterListener('ScriptCommand', executeCommand);

// functions
// function addEnterListener(elementId, command) {
//     document.getElementById(elementId).addEventListener("keydown", function (e) {
//         if (e.key === "Enter") {  
//             command;
//         }
//     });
// };

// function keydownFindAndExecuteScript(event) {
//     if (event.key === 'Enter') {
//         findAndExecuteScript;
//     }
// }

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