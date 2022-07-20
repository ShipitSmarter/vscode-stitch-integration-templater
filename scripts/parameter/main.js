import { isEmpty } from "../general/general.js";

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {

  // button onclick event listeners
  document.getElementById("getparameters").addEventListener("click", getParameters);
  document.getElementById("setparameters").addEventListener("click", setParameters);
  document.getElementById("savetofile").addEventListener("click", saveToFile);
  // document.getElementById("refresh").addEventListener("click", refreshContent);
  document.getElementById("load").addEventListener("click",loadFile);

  // previous checkbox
  document.getElementById("previous").addEventListener("change", fieldChange);

  // load file checkbox
  document.getElementById("showload").addEventListener("change", fieldChange);


  // save dropdowns
  const dropdowns = document.querySelectorAll(".dropdown");
  for (const field of dropdowns) {
    field.addEventListener("change", fieldChange);
  }

  // save input fields
  const fields = document.querySelectorAll(".field,.codecompanyfield,.codecustomerfield,.parameternamefield,.newvaluefield,.changereasonfield");
  for (const field of fields) {
    field.addEventListener("keyup", fieldChange);
  }

  // update hover-overs on load
  const allFields = document.querySelectorAll(".field,.parameternamefield,.previousvaluefield,.newvaluefield,.changereasonfield,.currentvaluefield");
  for (const field of allFields) {
    field.title = field.value;
  }

  // actions on panel load
  updateHighlightSet();
  updateCurrentValuesHighlight();
  // on panel creation: update field outlines and tooltips
  checkFields();
}

function fieldChange(event) {
  const field = event.target;
  let className = field.classList[0];
  var fieldType = (['field','dropdown'].includes(className)) ? field.id : className;

  // save field value
  saveValue(field.id);

  // update hover-over on change
  field.title = field.value;

  // update field outline and tooltip
  if (['save','codecompanyfield','codecustomerfield','parameternamefield','changereasonfield'].includes(fieldType)){
    updateFieldOutlineAndTooltip(field.id);
  }

  // additional actions
  switch (fieldType) {
    case 'previous':
      updateHighlightSet();
      updateCurrentValuesHighlight();
      break;
    case 'showload':
      if (field.checked) {
        document.getElementById("files").hidden = false;
        document.getElementById("load").hidden = false;
      } else {
        document.getElementById("files").hidden = true;
        document.getElementById("load").hidden = true;
      }
      break;
    case 'environment':
      document.body.style.backgroundColor = field.value === 'PROD' ? '#350000' : '';
      field.style.backgroundColor = field.value === 'PROD' ? '#800000' : '';
      break;

    case 'allchangereasons':
      const changeReasons = document.querySelectorAll(".changereasonfield");
      for (const cr of changeReasons) {
        cr.value = field.value;
        saveValue(cr.id);
      }
      break;
  }
}

function updateHighlightSet() {
  const prevs = document.querySelectorAll(".previousvaluefield");
  const news = document.querySelectorAll(".newvaluefield");

  if (document.getElementById("previous").checked) {
    for (const prev of prevs) {
      highlightSet(prev.id);
    }
    for (const neww of news) {
      unHighlight(neww.id);
    }
  } else {
    for (const neww of news) {
      highlightSet(neww.id);
    }
    for (const prev of prevs) {
      unHighlight(prev.id);
    }
  }
}

function updateCurrentValuesHighlight() {
  const prevs = document.querySelectorAll(".previousvaluefield");
  const news = document.querySelectorAll(".newvaluefield");
  const curs = document.querySelectorAll(".currentvaluefield");
  const isPrevious = document.getElementById("previous").checked;

  const compares = isPrevious ? prevs : news;

  for (let index=0; index<curs.length; index++) {
    if (curs[index].value === compares[index].value){
      unHighlight(curs[index].id);
    } else {
      unequalHighlight(curs[index].id);
    }
  }

}

function highlightSet(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid cyan";
}

function unHighlight(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "none";
}

function unequalHighlight(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px dashed orange";
}

function infoMessage(info) {
  vscodeApi.postMessage({ command: "showinformationmessage", text: info });
}

function saveValue(fieldId) {
  var field = document.getElementById(fieldId);
  var attr = 'index';
  var value = field.checked ?? field.value;
  var textString = field.classList[0] + '|' + (field.getAttribute(attr) ?? '') + '|' + value;
  vscodeApi.postMessage({ command: "savevalue", text: textString });
}

function refreshContent() {
  vscodeApi.postMessage({ command: "refreshcontent", text: "" });
}

function loadFile() {
  var path = document.getElementById("files").value;
  vscodeApi.postMessage({ command: "loadfile", text: path });
}

function updateFieldOutlineAndTooltip(fieldId) {
  let isCorrect = false;
  let field = document.getElementById(fieldId);
  let className = field.classList[0];
  var fieldType = (className === 'field') ? field.id : className;

  // check any non-scenario input field
  let check = '';
  if (['save','codecompanyfield','codecustomerfield','changereasonfield','parameternamefield'].includes(fieldType) && isEmpty(field.value)) {
    check = 'empty';
  } else {
    switch(fieldType) {
      case 'codecompanyfield': 
      case 'codecustomerfield': 
        check = field.value.match(/[^0-9]/);
        break;
      case 'parameternamefield': 
        check = field.value.match(/[^A-Z0-9_-]/);
        break;
    }
  }

  // update and return output
  if (check === 'empty') {
    updateEmpty(field.id);
  }else if (check !== '' && check !== null) {
    updateWrong(field.id, getContentHint(fieldType));
  } else {
    updateRight(field.id);
    isCorrect= true;
  }
  
  return isCorrect;
}

function getContentHint(fieldType) {
  let hint = '';
  switch(fieldType) {
    case 'codecompanyfield': 
    case 'codecustomerfield': 
      hint ='only numbers (0-9)';
      break;
    case 'parameternamefield': 
      hint = 'A-Z, 0-9, _-';
      break;
  }

  return hint;
}

function checkFields() {
  // check if any incorrect field contents and update fields outlining and tooltip in the process
  var check = true;
  const fields = document.querySelectorAll("#save,.codecompanyfield,.codecustomerfield,.parameternamefield,.changereasonfield");
  for (const field of fields) {
    check = updateFieldOutlineAndTooltip(field.id) ? check : false;
  }

  return check;
}

function updateWrong(fieldId,title="Wrong") {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid red";
  field.title = title;
}

function updateEmpty(fieldId) {
  let field = document.getElementById(fieldId);
  field.style.outline = "1px solid coral";
  field.title = 'Field is mandatory';
}

export function updateRight(fieldId) {
    let field = document.getElementById(fieldId);
    field.style.outline = "none";

    let className = field.classList[0];
    var fieldType = (className === 'field') ? field.id : className;
    if (['save','parameternamefield','changereasonfield'].includes(fieldType)) {
      field.title = field.value;
    } else {
      field.title = '';
    }
}

function invalidForm() {
  vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
}

function getParameters() {
  // check field content
  if (checkFields()) {
    vscodeApi.postMessage({ command: "getparameters", text: "real fast!" });
  } else {
    invalidForm();
  }
}

function setParameters() {
  // check field content
  if (checkFields()) {
    vscodeApi.postMessage({ command: "setparameters", text: "real fast!" });
  } else {
    invalidForm();
  }
}

function saveToFile() {
  // check field content
  if (checkFields()) {
    vscodeApi.postMessage({ command: "savetofile", text: "real fast!" });
  } else {
    invalidForm();
  }
}