import { isEmpty, nameFromPath } from "../general/general.js";

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {

  // button onclick event listeners
  document.getElementById("getparameters").addEventListener("click", getParameters);
  document.getElementById("setparameters").addEventListener("click", setParameters);
  document.getElementById("savetofile").addEventListener("click", saveToFile);

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

  // show parameter search options
  // const paramFields = document.querySelectorAll(".parameternamefield");
  // for (const field of paramFields) {
  //   field.addEventListener("keydown",parameterOptionsShow);
  // }

  // keydown actions inside grid
  const lineFields = document.querySelectorAll(".codecompanyfield,.codecustomerfield,.parameternamefield,.parameteroptionsfield,.previousvaluefield,.newvaluefield,.changereasonfield");
  for (const field of lineFields) {
    field.addEventListener("keydown",gridKeydown);
  }

  // parameter search options select
  const parameterOptionsFields = document.querySelectorAll(".parameteroptionsfield");
  for (const field of parameterOptionsFields) {
    // field.addEventListener("keydown", parameterOptionsSelect);
    field.addEventListener("change",updateParameterFromOptions);
  }

  // global keyboard shortcuts
  document.addEventListener("keydown",globalKeys);

  // actions on panel load
  updateHighlightSet();
  updateCurrentValuesHighlight();
  showProd();
  // on panel creation: update field outlines and tooltips
  checkFields();
  // disable certain fields when processing requests
  processingSet();
  processingGet();

  // set focus if line number present
  focusNewLine();

  // set focus if parameter name index present
  var pIndex = document.getElementById("focuspoptions").value;
  if (!isEmpty(pIndex)) {
    document.getElementById("parameteroptions" + pIndex).focus();
  }
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
  if (['codecompanyfield','codecustomerfield','parameternamefield'].includes(fieldType)) {
    // codecompany, codecustomeror parametername: check all three in all rows
    const rowFields = document.querySelectorAll(".codecompanyfield,.codecustomerfield,.parameternamefield");
    for (const rowField of rowFields) {
      updateFieldOutlineAndTooltip(rowField.id);
    }
   
    const row = field.getAttribute('index');
    if (checkIfDuplicate(parseInt(row))) {
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

    case 'save':
      // update name value
      document.getElementById("savename").innerHTML = nameFromPath(field.value);
      break;
  }
}

function gridKeydown(event) {
  const field = event.target;
  const fclass = field.classList[0];

  if (event.key === 'Enter' && event.ctrlKey) {
    // on ctrl + enter

    if (['newvaluefield','changereasonfield'].includes(fclass)) {
      // in newvalue, changereason: add new line
      addLine(event);
    } else if(fclass === 'parameteroptionsfield') {
      // in parameteroptions: select
      parameterOptionsSelect(event);
    }
  } else if (event.key === 'Delete' && event.ctrlKey) {
    // on ctrl + delete: any grid field

    deleteLine(event);

  } else if (event.key === 'Enter') {
    // on just enter

    if (fclass === 'parameternamefield') {
      // pname: search
      parameterOptionsShow(event);
    }
  }
}

function globalKeys(event) {
  if (event.key === 's' && event.ctrlKey) {
    // Ctrl + S: save input to file
    saveToFile();
  }
}

function focusNewLine() {
  let focusLine = document.getElementById("focusline").value;

  if(focusLine.length > 0){
    const focusCompany = document.getElementById("codecompany"+focusLine);
    const focusCustomer = document.getElementById("codecustomer" + focusLine);
    const focusParameter = document.getElementById("parametername"+focusLine);
    focusParameter.focus();

    if (isEmpty(focusCompany.value)) {
      focusCompany.focus();
    } else if (isEmpty(focusCustomer.value)) {
      focusCustomer.focus();
    } else {
      focusParameter.focus();
    }
  }
}

function addLine(event) {
  const field = event.target;

  let nofLinesField = document.getElementById("noflines");
  let nofLines = pasreInt(nofLinesField.value);
  let index = parseInt(field.getAttribute("index"));

  if (index === (nofLines-1)) {
    nofLinesField.value = (nofLines + 1).toString();
    nofLinesField.dispatchEvent(new Event('change'));
  }
}

function deleteLine(event) {
  const field = event.target;

  let nofLinesField = document.getElementById("noflines");
  let nofLines = parseInt(nofLinesField.value);
  let index = field.getAttribute("index");

  if (parseInt(nofLines) > 1) {
    vscodeApi.postMessage({ command: "deleteline", text: index });
  } 
}

function parameterOptionsShow(event) {
  const field = event.target;

  // parameter search on enter
  const index = field.id.replace('parametername','');
  const codeCompany = document.getElementById("codecompany" + index).value;
  const codeCustomer = document.getElementById("codecustomer" + index).value;

  if (!isEmpty(codeCompany) && !isEmpty(codeCustomer) && !isEmpty(field.value)) {
    parameterSearch(field.id);
  } else {
    errorMessage("Company, customer and parameter name values may not be empty");
  }
}

function parameterOptionsSelect(event) {
  const field = event.target;

  // delete search options
  vscodeApi.postMessage({ command: "deloptions", text: event.target.getAttribute("index") });

  // hide search options
  field.hidden = true;

  // find parameter name field
  const value = field.value.replace(/\s\([\s\S]*/g,'');
  const index = field.getAttribute('index');
  const parameterField = document.getElementById('parametername' + index);

  // unhide parameter field and focus
  parameterField.hidden = false;
  parameterField.focus();
}

function updateParameterFromOptions(event) {
  const field = event.target;

  // update options hover-over
  field.title = field.value;

  // find parameter name field
  const value = field.value.replace(/\s\([\s\S]*/g,'');
  const index = field.getAttribute('index');
  const parameterField = document.getElementById('parametername' + index);

  // update parameter value
  parameterField.value = value;
  parameterField.dispatchEvent(new Event('keyup'));
}

function checkIfDuplicate(row) {
  let isDuplicate = false;

  let nofLines = parseInt(document.getElementById('noflines').value);
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

function errorMessage(info) {
  vscodeApi.postMessage({ command: "showerrormessage", text: info });
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