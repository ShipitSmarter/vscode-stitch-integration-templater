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
  const allFields = document.querySelectorAll(".field,.parameternamefield,.previousvaluefield,.newvaluefield,.changereasonfield,.currentvaluefield,.currentchangereasonfield");
  for (const field of allFields) {
    field.title = field.value;
  }

  // parameter search options select
  const parameterOptionsFields = document.querySelectorAll(".parameteroptionsfield");
  for (const field of parameterOptionsFields) {
    field.addEventListener("keydown", parameterOptionsSelect);

      // focus on parameter search if unhidden
      if (field.hidden === false) {
        field.focus();
      }
  }

  // actions on panel load
  updateHighlightSet();
  updateCurrentValuesHighlight();
  showProd();
  // on panel creation: update field outlines and tooltips
  checkFields();
  // disable certain fields when processing requests
  processingSet();
  processingGet();

}

function fieldChange(event) {
  const field = event.target;
  let className = field.classList[0];
  var fieldType = (['field','dropdown'].includes(className)) ? field.id : className;

  // save field value
  saveValue(field.id);

  // update hover-over on change
  field.title = field.value;

  // parameter search on enter
  if (fieldType === 'parameternamefield' && event.key === 'Enter') {
    parameterSearch(field.id);
  }
  // update field outline and tooltip
  else if (['codecompanyfield','codecustomerfield','parameternamefield'].includes(fieldType)) {
    // codecompany, codecustomeror parametername: check all three in all rows
    const rowFields = document.querySelectorAll(".codecompanyfield,.codecustomerfield,.parameternamefield");
    for (const rowField of rowFields) {
      updateFieldOutlineAndTooltip(rowField.id);
    }
   
    if (checkIfDuplicate(+row)) {
      checkFields();
    } else {
      updateFieldOutlineAndTooltip(field.id);
    }

  } else  if (['save','changereasonfield'].includes(fieldType)) {
    updateFieldOutlineAndTooltip(field.id);
  }

  // additional actions
  switch (fieldType) {
    case 'previous':
      updateHighlightSet();
      updateCurrentValuesHighlight();
      break;
    case 'environment':
      showProd();
      break;

    case 'allchangereasons':
      const changeReasons = document.querySelectorAll(".changereasonfield");
      for (const cr of changeReasons) {
        cr.value = field.value;
        saveValue(cr.id);
        updateFieldOutlineAndTooltip(cr.id);
      }

      break;
  }
}

function parameterOptionsSelect(event) {
  if (event.key === 'Enter' && event.ctrlKey) {
    const field = event.target;
    const value = field.value.replace(/\s\([\s\S]*/g,'');
    const index = field.getAttribute('index');
    const parameterField = document.getElementById('parametername' + index);
    
    // update parameter value
    parameterField.value = value;
    parameterField.dispatchEvent(new Event('keyup'));
    
    // hide/unhide
    parameterField.hidden = false;
    field.hidden = true;
  }
}

function checkIfDuplicate(row) {
  let isDuplicate = false;

  let nofLines = +document.getElementById('noflines').value;
  let cocos = document.querySelectorAll(".codecompanyfield");
  let cocus = document.querySelectorAll(".codecustomerfield");
  let pnames = document.querySelectorAll(".parameternamefield");

  for (let index = 0; index < nofLines; index++) {
    if ((index !== row) && (!isEmpty(cocos[index].value)) && (!isEmpty(cocus[index].value)) && (!isEmpty(pnames[index].value))) {

      if ((cocos[index].value === cocos[row].value) && (cocus[index].value === cocus[row].value) && (pnames[index].value === pnames[row].value)) {
        isDuplicate = true;
        break;
      }
    }
  }

  return isDuplicate;
}

function getCompanyName(codeCompany) {
  let companyName = '';
  if (!isEmpty(codeCompany)) {
    try {
      companyName = document.getElementById(codeCompany).value;
    } catch (err) {
      companyName = '';
    }
  }

  return companyName;
}

function showProd() {
  const field = document.getElementById("environment");

  document.body.style.backgroundColor = field.value === 'PROD' ? '#350000' : '';
  field.style.backgroundColor = field.value === 'PROD' ? '#800000' : '';
}

function processingGet(push = false) {
  if (push) {
    document.getElementById("processingget").hidden = false;
  }
  const isProcessing = !document.getElementById("processingget").hidden;

  if (isProcessing) {
    const disableFields = document.querySelectorAll("#environment,#noflines,#previous,#setparameters,#getparameters,#load,.codecompanyfield,.codecustomerfield,.parameternamefield");
    for (const dField of disableFields) {
      dField.disabled = true;
    }
  }
}

function processingSet(push = false) {
  if (push) {
    document.getElementById("processingset").hidden = false;
  }
  const isProcessing = !document.getElementById("processingset").hidden;

  if (isProcessing) {
    const disableFields = document.querySelectorAll("#environment,#noflines,#previous,#allchangereasons,#setparameters,#getparameters,#load,.codecompanyfield,.codecustomerfield,.parameternamefield,.previousvaluefield,.newvaluefield,.changereasonfield");
    for (const dField of disableFields) {
      dField.disabled = true;
    }
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

  // check input field
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
  } else if (check !== '' && check !== null) {
    updateWrong(field.id, getContentHint(fieldType));
  } else if (['codecompanyfield','codecustomerfield','parameternamefield'].includes(fieldType) && checkIfDuplicate(+field.getAttribute('index'))) {
    updateWrong(field.id, 'Company/customer/parameter combination is duplicate');
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

function updateRight(fieldId) {
    let field = document.getElementById(fieldId);
    field.style.outline = "none";

    let className = field.classList[0];
    var fieldType = (className === 'field') ? field.id : className;
    if (['save','parameternamefield','changereasonfield'].includes(fieldType)) {
      field.title = field.value;
    } else if (fieldType === 'codecompanyfield') {
      field.title = getCompanyName(field.value);
    } else {
      field.title = '';
    }
}

function invalidForm() {
  vscodeApi.postMessage({ command: "showerrormessage", text: "Form contains invalid content. Hover over fields for content hints." });
}

function parameterSearch(fieldId) {
  // const button = event.target;
  // const index = +button.id.replace('parametersearch','');
  const index = document.getElementById(fieldId).getAttribute('index');

  vscodeApi.postMessage({ command: "parametersearch", text: index });
}

function getParameters() {
  // check field content
  if (checkFields()) {
    processingGet(true);
    vscodeApi.postMessage({ command: "getparameters", text: "real fast!" });
  } else {
    invalidForm();
  }
}

function setParameters() {
  // check field content
  if (checkFields()) {
    processingSet(true);
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