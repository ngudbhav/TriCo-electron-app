const $ = document.querySelectorAll.bind(document);

$('.header a').forEach(el => {
  const containerActiveClass = 'container--active';
  el.addEventListener('click', () => {
    const target = el.getAttribute('data-target');
    $('.container').forEach(container => {
      container.classList.remove(containerActiveClass);
    });
    $(`#${target}`)[0].classList.add(containerActiveClass);
  });
});

$('#mysql-custom')[0].addEventListener('click', event => {
  const el = event.target;
  const customClass = 'mysql-container__form-custom-options';
  const activeClass = `${customClass}--active`;
  if (el.checked) {
    $(`.${customClass}`)[0].classList.add(activeClass);
  } else {
    $(`.${customClass}`)[0].classList.remove(activeClass);
  }
});

$('#mongo-custom')[0].addEventListener('click', event => {
  const el = event.target;
  const customClass = 'mongo-container__form-custom-options';
  const activeClass = `${customClass}--active`;
  if (el.checked) {
    $(`.${customClass}`)[0].classList.add(activeClass);
  } else {
    $(`.${customClass}`)[0].classList.remove(activeClass);
  }
});

$('#update')[0].addEventListener('click', event => {
  const el = event.target;
  el.innerHTML = 'Connecting...';
  window.api.send('update');
  window.api.receive('updateCheckup', () => {
    el.innerHTML = 'Check for updates';
  });
});

window.api.receive('progress', data => {
  $('.progress-container')[0].classList.remove('hide');
  const percentage = data * 100.0;
  const progressEl = $('#progress-bar')[0];
  progressEl.setAttribute('value', percentage);
  progressEl.innerHTML = `${percentage}%`;
});

window.api.receive('startup-mysql', data => {
  if (data) {
    populateData('mysql', data[0]);
  }
});

window.api.receive('startup-mongo', data => {
  if (data) {
    populateData('mongo', data[0]);
  }
});

window.api.receive('startup-history', data => {
  if (data) {
    populateHistory(data);
    if (data[0]) {
      setWindow(data[0]);
    }
  }
});

$('#name')[0].addEventListener('click', () => {
  window.api.buyMeACoffee();
});

$('#history-list')[0].addEventListener('click', e => {
  const el = e.target;
  let targetElement;
  if (el.classList.contains('list-group__item')) {
    targetElement = el.querySelector('.list-group__item-content');
  } else if (el.nodeName === 'H4') {
    targetElement = el.parentElement.nextElementSibling;
  } else if (el.classList.contains('list-group__item-header')) {
    targetElement = el.nextElementSibling;
  }

  if (targetElement) {
    if (targetElement.classList.contains('hide')) {
      targetElement.classList.remove('hide');
    } else {
      targetElement.classList.add('hide');
    }
  }
});

$('input[type="file"]').forEach(el => {
  el.addEventListener('change', () => {
    const elId = el.getAttribute('id');
    $(`label[for='${elId}'].file-preview-label`)[0].innerHTML = `
      ${el.files.length} file(s) selected
    `;
  });
});

$('#mysql-form-submit')[0].addEventListener('click', () => {
  const validated = validateForm('mysql');
  if (validated[0]) {
    window.api.send('readXls', validated[2]);
  } else {
    window.api.showError(validated[1]);
  }
});

$('#mysql-form-file-submit')[0].addEventListener('click', () => {
  const validated = validateForm('mysql');
  if (validated[0]) {
    const data = { ...validated[2], fileConvert: true };
    window.api.send('readXls', data);
  } else {
    window.api.showError(validated[1]);
  }
});

$('#mongo-form-submit')[0].addEventListener('click', () => {
  const validated = validateForm('mongo');
  if (validated[0]) {
    window.api.send('readXlsForMongo', validated[2]);
  } else {
    window.api.showError(validated[1]);
  }
});

$('#history-form-submit')[0].addEventListener('click', () => {
  window.api.send('clearHistory', null)
});

/* Utils */
const collectFormData = type => {
  const fileEl = $(`#${type}-file`)[0];
  const pathArray = []
  for(let i = 0; i < fileEl.files.length; i++) {
    pathArray.push(fileEl.files[i].path);
  }
  return {
    safeMode: $(`#${type}-safe`)[0]?.checked,
    customPoints: $(`#${type}-custom`)[0]?.checked,
    autoId: $(`#${type}-auto-id`)[0]?.checked,
    custom: {
      rowStart: $(`#${type}-row-start`)[0]?.value,
      rowEnd: $(`#${type}-row-end`)[0]?.value,
      columnStart: $(`#${type}-column-start`)[0]?.value,
      columnEnd: $(`#${type}-column-end`)[0]?.value,
    },
    host: $(`#${type}-host`)[0]?.value,
    db: $(`#${type}-db`)[0]?.value,
    port: $(`#${type}-port`)[0]?.value,
    username: $(`#${type}-user`)[0]?.value,
    password: $(`#${type}-password`)[0]?.value,
    table: $(`#${type}-table`)[0]?.value,
    files: pathArray,
  }
};

const validateForm = type => {
  $('.progress-container')[0].classList.add('hide');
  const data = collectFormData(type);
  let success = true;
  let message = '';
  // let mysql = type === 'mysql';
  let mongo = type === 'mongo';
  if (data.customPoints) {
    let { custom: customData } = data;
    if (
      !isNumber(customData.rowStart) || !isNumber(customData.rowEnd)
      || !isNumber(customData.columnStart) || !isNumber(customData.columnEnd)
    ) {
      success = false;
      message = 'Please specify All 4 points when using custom start-end';
      return [success, message];
    }
  }
  if (!data.host) {
    data.host = 'localhost';
  }
  if (!data.port) {
    data.port = mongo ? 27017 : 3306;
  }
  if (!data.db) {
    success = false;
    message = 'No Database Name!';
    return [success, message];
  }
  if (!data.table) {
    success = false;
    message = `No ${mongo ? 'Collection' : 'Table'} Name!`;
    return [success, message];
  }
  if (!data.files.length) {
    success = false;
    message = 'No File Selected!';
    return [success, message];
  }

  return [success, message, data];
};

const populateData = (type, data) => {
  if (data) {
    $(`#${type}-host`)[0].value = data.host || '';
    $(`#${type}-db`)[0].value = data.db || '';
    $(`#${type}-port`)[0].value = data.port || '';
    $(`#${type}-user`)[0].value = data.user || '';
    $(`#${type}-table`)[0].value = data.table || '';
  }
};

const populateHistory = data => {
  const historyEl = $('#history-list')[0];
  let fullHistory = '';
  data.forEach(history => {
    fullHistory += `
      <div class="list-group__item">
        <div class="list-group__item-header">
          <h4>${new Date(history.time).toDateString()}</h4>
          <h4>Type: ${history.destination}</h4>
        </div>
        <div class="list-group__item-content hide">
          <h5>
            DB: ${history.db}<br />
            Port: ${history.port}<br />
            Table: ${history.table}<br />
            Files: ${history.files}
          </h5>
        </div>
      </div>
      <br /><br />
    `;
  });
  historyEl.innerHTML = fullHistory;
};

const setWindow = lastRecord => {
  const mysql = lastRecord.destination === 'SQL';
  if (mysql) {
    $('.header a[data-target="mysql"]')[0].click();
  } else {
    $('.header a[data-target="mongo"]')[0].click();
  }
};

const isNumber = test => {
  return typeof test === 'number';
};
