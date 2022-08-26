import { isEmpty, nameFromPath } from "../general/general.js";

const vscodeApi = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {

  // button onclick event listeners
  document.getElementById("getparameters").addEventListener("click", getParameters);
  document.getElementById("setparameters").addEventListener("click", setParameters);
  document.getElementById("savetofile").addEventListener("click", saveToFile);

  // new parameter code tile buttons
  for (const newparambutton of document.querySelectorAll(".newparametercode")) {
    newparambutton.addEventListener("click", clickTile);
  }

  // info onclick
  document.getElementById("info").addEventListener("click",infoClick);

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
    field.addEventListener("input", fieldChange);
  }

  // update hover-overs on load
  const allFields = document.querySelectorAll(".field,.parameternamefield,.previousvaluefield,.newvaluefield,.changereasonfield,.currentvaluefield,.currentchangereasonfield");
  for (const field of allFields) {
    field.title = field.value;
  }

  // keydown actions inside grid
  const lineFields = document.querySelectorAll(".codecompanyfield,.codecustomerfield,.codecustomeroptionsfield,.parameternamefield,.parameteroptionsfield,.previousvaluefield,.newvaluefield,.changereasonfield");
  for (const field of lineFields) {
    field.addEventListener("keydown",gridKeydown);
  }

  // parameter search options select
  const parameterOptionsFields = document.querySelectorAll(".parameteroptionsfield");
  for (const field of parameterOptionsFields) {
    // field.addEventListener("keydown", parameterOptionsSelect);
    field.addEventListener("change",updateParameterFromOptions);
  }

  // code customer search options select
  const codeCustomerOptionsFields = document.querySelectorAll(".codecustomeroptionsfield");
  for (const field of codeCustomerOptionsFields) {
    // field.addEventListener("keydown", parameterOptionsSelect);
    field.addEventListener("change",updateCodeCustomerFromOptions);
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


  // set focus on field if not empty
  var focusId = document.getElementById("focusfield").value;
  if (!isEmpty(focusId)) {
    document.getElementById(focusId).focus();
  }
}

function clickTile(event) {
  const field = event.target;

  // update tile appearance and update selected param code array
  if (field.getAttribute('appearance') === 'primary'){
    field.setAttribute('appearance','secondary');
    vscodeApi.postMessage({ command: "removeselectedparametercode", text: field.id });

  } else {
    field.setAttribute('appearance','primary');
    vscodeApi.postMessage({ command: "addselectedparametercode", text: field.id });
  }
};

function fieldChange(event) {
  const field = event.target;
  let className = field.classList[0];
  var fieldType = (['field','dropdown'].includes(className)) ? field.id : className;

  // if the keydown is 'ctrl' or 'enter' or 'delete': skip
  if (!['dropdown','parameteroptionsfield'].includes(className) && ['Enter','Control','Delete'].includes(event.key)) {
    return;
  }

  // save field value
  saveValue(field.id);

  // update hover-over on change
  field.title = field.value;

  // update field outline and tooltip
  if (['codecompanyfield','codecustomerfield','parameternamefield','parameteroptionsfield'].includes(fieldType)) {
    // codecompany, codecustomeror parametername: check all three in all rows
    const rowFields = document.querySelectorAll(".codecompanyfield,.codecustomerfield,.parameternamefield,.parameteroptionsfield");
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
    case 'codecompanyfield':
    case 'codecustomerfield':
    case 'parameternamefield':
      clearGetResponse(field.id);
      clearSetResponse(field.id);
      clearPreviousValue(field.id);
      break;
    case 'previous':
      updateHighlightSet();
    case 'newvaluefield':
      updateCurrentValuesHighlight();
      clearSetResponse(field.id);
      break;

    case 'environment':
      // clear responses, previous values
      const nofLines = parseInt(document.getElementById('noflines').value);

      for (let index = 0; index<nofLines; index++) {
        var fieldId = "codecompany" + index.toString();
        clearGetResponse(fieldId);
        clearSetResponse(fieldId);
        clearPreviousValue(fieldId);
      }

      // update panel coloring
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

function clearValue(id, index) {
  const text = id + '|' + index;
  vscodeApi.postMessage({ command: "clearvalue", text: text });
}

function clearGetResponse(fieldId) {
  const field = document.getElementById(fieldId);
  const index = field.getAttribute("index");

  // clear response
  const getResponse = document.getElementById("getresponsefieldoption" + index);
  getResponse.innerHTML = "";
  getResponse.title = "";
  clearValue('getresponse',index);

  // clear current value/change reason/timestamp
  const curValue = document.getElementById("currentvalue" + index);
  const curCR = document.getElementById("currentchangereason" + index);
  const curTime = document.getElementById("currenttimestamp" + index);

  curValue.value = "";
  curCR.value = "";
  curTime.value = "";

  clearValue('currentvalues',index);
}

function clearSetResponse(fieldId) {
  const field = document.getElementById(fieldId);
  const index = field.getAttribute("index");
  const setResponse = document.getElementById("setresponsefieldoption" + index);

  setResponse.innerHTML = "";
  setResponse.title = "";
  clearValue('setresponse',index);
}

function clearPreviousValue(fieldId) {
  const field = document.getElementById(fieldId);
  const index = field.getAttribute("index");
  const previousField = document.getElementById("previousvalue" + index);

  previousField.value = "";
  previousField.title = "";
  clearValue('previousvalue',index);
}

function gridKeydown(event) {
  const field = event.target;
  const fclass = field.classList[0];

  if (event.ctrlKey) {
    // ctrl combinations

    if (event.key === 'Enter') {
      // on ctrl + enter
  
      if (['newvaluefield','changereasonfield'].includes(fclass)) {
        // in newvalue, changereason: add new line
        addLine(event);
      } else if(fclass === 'parameteroptionsfield') {
        // in parameteroptions: select
        parameterOptionsSelect(event);
      } else if(fclass === 'codecustomeroptionsfield') {
        // in codecustomeroptions: select
        codeCustomerOptionsSelect(event);
      }

    } else if (event.key === 'Delete') {
      // on ctrl + delete (any grid field): delete line
      deleteLine(event);

    } else if (event.key === 'ArrowUp') {
      // ctrl + up: focus on grid field above
      document.getElementById(findNeighbor(field.id,'up')).focus();
    } else if (event.key === 'ArrowDown') {
      // ctrl + down: focus on grid field below
      document.getElementById(findNeighbor(field.id,'down')).focus();
    } else if (event.key === 'ArrowLeft') {
      // ctrl + left: focus on grid field left
      document.getElementById(findNeighbor(field.id,'left')).focus();
    } else if (event.key === 'ArrowRight') {
      // ctrl + right: focus on grid field right
      document.getElementById(findNeighbor(field.id,'right')).focus();
    }

  } else if (event.key === 'Enter') {
    // on just enter

    if (fclass === 'parameternamefield') {
      // pname: search
      parameterOptionsShow(event);
    } else if (fclass === 'codecustomerfield') {
      // pname: search
      codeCustomerOptionsShow(event);
    }
  }
}

function findNeighbor(fieldId,direction) {
  // direction values: 'up','down','left','right'
  const field = document.getElementById(fieldId);
  const index = parseInt(field.getAttribute("index"));
  var idBase = field.id.replace(/\d+/g,'');
  if (idBase === 'parameteroptions') {
    idBase = 'parametername';
  } else if (idBase === 'codecustomeroptions') {
    idBase = 'codecustomer';
  }
  const nofLines = parseInt(document.getElementById('noflines').value);
  const gridOrder = ['codecompany', 'codecustomer','parametername','previousvalue','newvalue','changereason'];
  const orderIndex = gridOrder.indexOf(idBase);

  // find neighbor
  let neighborId = '';
  switch (direction) {
    case 'up':
      neighborId = idBase + Math.max(index -1,0).toString();
      break;
    case 'down':
      neighborId = idBase + Math.min(index+1, nofLines-1).toString();
      break;

    case 'left':
      if (idBase === gridOrder[0]) {
        if (index === 0) {
          neighborId = field.id;
        } else {
          neighborId = gridOrder[gridOrder.length -1] + (index-1).toString();
        }
      } else {
        neighborId = gridOrder[orderIndex -1] + index.toString();
      }
      break;

    case 'right':
      if (idBase === gridOrder[gridOrder.length -1]) {
        if (index === (nofLines-1)) {
          neighborId = field.id;
        } else {
          neighborId = gridOrder[0] + (index + 1).toString();
        }
      } else {
        neighborId = gridOrder[orderIndex +1] + index.toString();
      }
      break;
  }

  const neighborBase = neighborId.replace(/\d+/g,'');
  if (document.getElementById(neighborId).hidden && neighborBase === 'parametername') {
    neighborId = 'parameteroptions' + neighborId.replace(/\D+/g,'');
  } else if (document.getElementById(neighborId).hidden && neighborBase === 'codecustomer') {
    neighborId = 'codecustomeroptions' + neighborId.replace(/\D+/g,'');
  }
  
  return neighborId;
}

function infoClick(event) {
  vscodeApi.postMessage({ command: "infoclick", text: "parameters" });
}

function globalKeys(event) {
  if (event.key === 's' && event.ctrlKey) {
    // Ctrl + S: save input to file
    saveToFile();
  }
}

function addLine(event) {
  const field = event.target;

  let nofLinesField = document.getElementById("noflines");
  let nofLines = parseInt(nofLinesField.value);
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

function codeCustomerOptionsShow(event) {
  const field = event.target;

  // parameter search on enter
  const index = field.id.replace('codecustomer','');
  const codeCompany = document.getElementById("codecompany" + index).value;

  if (!isEmpty(codeCompany) && !isEmpty(field.value)) {
    codeCustomerSearch(field.id);
  } else {
    errorMessage("Company and customer values may not be empty");
  }
}

function parameterOptionsSelect(event) {
  const field = event.target;

  // delete search options
  vscodeApi.postMessage({ command: "deloptions", text: event.target.getAttribute("index") });

  // hide search options
  field.hidden = true;

  // find parameter name field
  const index = field.getAttribute('index');
  const parameterField = document.getElementById('parametername' + index);

  // unhide parameter field and focus
  parameterField.hidden = false;
  parameterField.focus();
}

function codeCustomerOptionsSelect(event) {
  const field = event.target;

  // delete search options
  vscodeApi.postMessage({ command: "delcodecustomeroptions", text: event.target.getAttribute("index") });

  // hide search options
  field.hidden = true;

  // find code customer field
  const index = field.getAttribute('index');
  const codeCustomerField = document.getElementById('codecustomer' + index);

  // unhide parameter field and focus
  codeCustomerField.hidden = false;
  codeCustomerField.focus();
}


function updateParameterFromOptions(event) {
  const field = event.target;

  // find parameter name field
  const value = field.value.replace(/\s\([\s\S]*/g,'');
  const index = field.getAttribute('index');
  const parameterField = document.getElementById('parametername' + index);

  // update parameter value
  parameterField.value = value;
  parameterField.dispatchEvent(new InputEvent('input'));

  // update options hover-over
  field.title = field.value;
}

function updateCodeCustomerFromOptions(event) {
  const field = event.target;

  // find code customer field
  const value = field.value.replace(/[\s\S]*\(/g,'').replace(/\)[\s\S]*/g,'');
  const index = field.getAttribute('index');
  const codeCustomerField = document.getElementById('codecustomer' + index);

  // update parameter value
  codeCustomerField.value = value;
  codeCustomerField.dispatchEvent(new InputEvent('input'));

  // update options hover-over
  field.title = field.value;
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
  // update panel coloring
  const field = document.getElementById("environment");
  const documentBgColor = getComputedStyle(field).getPropertyValue('--vscode-editor-background');
  const fieldBgColor = getComputedStyle(field).getPropertyValue('--vscode-dropdown-background');
  
  document.body.style.backgroundColor = field.value === 'PROD' ? colorify(documentBgColor,'red',50) : '';
  field.style.backgroundColor = field.value === 'PROD' ? colorify(fieldBgColor,'red',100) : '';
}

function colorify(rgbhex, color, intensity) {
  // only colors 'red', 'green', 'blue' are allowed

  // current color elements
  const red = parseInt(rgbhex.substring(1,3),16);
  const green = parseInt(rgbhex.substring(3,5),16);
  const blue = parseInt(rgbhex.substring(5,7),16);

  const rgbArray = [red, green, blue];
  let colorIndex = (color === 'red') ? 0 : ((color === 'green') ? 1 : 2);

  // 'rest' step (amount non-colors need to go down)
  const colorOverStep = 255 - (rgbArray[colorIndex] + intensity);
  const restStep = Math.min(colorOverStep, 0);

  // new color elements
  let colorified = '#';
  for (let index = 0; index < rgbArray.length; index++) {
    if (index === colorIndex) {
      colorified += Math.min(rgbArray[index] + intensity,255).toString(16);
    } else {
      colorified += Math.max(rgbArray[index] + restStep,0).toString(16);
    }
  }

  return colorified;
}

function processingGet(push = false) {
  if (push) {
    document.getElementById("processingget").hidden = false;
  }
  const isProcessing = !document.getElementById("processingget").hidden;

  if (isProcessing) {
    const disableFields = document.querySelectorAll("#environment,#noflines,#previous,#setparameters,#getparameters,#load,.codecompanyfield,.codecustomerfield,.codecustomeroptionsfield,.parameternamefield,.parameteroptionsfield");
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
    const disableFields = document.querySelectorAll("#environment,#noflines,#previous,#allchangereasons,#setparameters,#getparameters,#load,.codecompanyfield,.codecustomerfield,.codecustomeroptionsfield,.parameternamefield,.parameteroptionsfield,.previousvaluefield,.newvaluefield,.changereasonfield");
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
  } else if (['codecompanyfield','codecustomerfield','parameternamefield','parameteroptionsfield'].includes(fieldType) && checkIfDuplicate(+field.getAttribute('index'))) {
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

function codeCustomerSearch(fieldId) {
  const index = document.getElementById(fieldId).getAttribute('index');
  vscodeApi.postMessage({ command: "codecustomersearch", text: index });
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