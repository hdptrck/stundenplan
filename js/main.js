const createOption = (value, text) => {
  let opt = document.createElement('option');
  opt.value = value;
  opt.text = text;
  return opt;
}

// Method from https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = twoDigits(Math.ceil((((d - yearStart) / 86400000) + 1) / 7));
  console.log('getWeekNumber: ' + weekNo);
  return [d.getUTCFullYear(), weekNo];
}

const selectBeruf = document.getElementById('select-beruf');
selectBeruf.appendChild(createOption('0', 'Beruf wählen'));

const selectKlasse = document.getElementById('select-klasse');
selectKlasse.appendChild(createOption('0', 'Klasse wählen'));

// Kalender Einstellungen
// Höhe/5min
let intervalHeight = 5;
// Nach n Minuten nach 00:00 starten
let calendarStart = 435;

// Datum
var weekDate = new Date();
var selectedYearWeek = getWeekNumber(weekDate);

// Buttons
const btnSelectedWeek = document.getElementById('weekNumber');
const btnWeekBefore = document.getElementById('weekBefore');
const btnWeekAfter = document.getElementById('weekAfter');


updateWeekNumber(btnSelectedWeek, selectedYearWeek);

const updateBeruf = () => {
  fetch('http://sandbox.gibm.ch/berufe.php')
    .then((response) => {
      return response.json();
    })
    .then((myJson) => {
      myJson.forEach(beruf => {
        selectBeruf.appendChild(createOption(beruf.beruf_id, beruf.beruf_name));
      });
      updateKlasse();
    })
    .catch(function (error) {
      console.error('Fetch error (Beruf): ' + error);
    });
}


const updateKlasse = () => {
  let val = parseInt(selectBeruf.options[selectBeruf.selectedIndex].value);
  if (val) {
    fetch('http://sandbox.gibm.ch/klassen.php?beruf_id=' + val)
      .then((response) => {
        return response.json();
      })
      .then((myJson) => {
        // Klassenliste in Dropdown leeren
        removeOptions(selectKlasse);
        clearCalendar();
        // Elemente hinzufügen
        myJson.forEach(klasse => {
          selectKlasse.appendChild(createOption(klasse.klasse_id, klasse.klasse_name));
        });
        // TODO: disableSelect
      })
      .catch((error) => {
        console.error('Fetch error (Klasse): ' + error);
      });
  }
}

function updateCalendar() {
  if (selectBeruf.options[selectBeruf.selectedIndex].value != 0 && selectKlasse.options[selectKlasse.selectedIndex].value != 0) {
    saveLastSetting();
    fetch('http://sandbox.gibm.ch/tafel.php?klasse_id=' + selectKlasse.options[selectKlasse.selectedIndex].value + '&woche=' + selectedYearWeek[1] + '-' + selectedYearWeek[0])
      .then(
        function (response) {
          if (response.status !== 200) {
            console.warn('Problem: Status Code: ' + response.status);
            return;
          }
          response.json().then(function (data) {
            // Childs löschen
            clearCalendar();

            console.log(data);
            let div;

            for (let i = 0; i < data.length; i++) {
              div = document.createElement('div');
              let from = data[i].tafel_von;
              let to = data[i].tafel_bis;
              div.innerHTML = from.slice(0, -3) + '-' + to.slice(0, -3) + '<br>' + data[i].tafel_longfach + '<br>' + data[i].tafel_lehrer + '<br>' + data[i].tafel_raum;
              div.classList.add('position-absolute', 'bg-primary', 'appointment-prop', 'event', 'text-white');

              let fromMin = toMinutes(from);
              let toMin = toMinutes(to);

              div.style.top = (fromMin - calendarStart) / 5 * intervalHeight + 'px';
              div.style.height = (toMin - fromMin) / 5 * intervalHeight + 'px';
              document.getElementById('weekday-' + data[i].tafel_wochentag).appendChild(div);
            }
          });
        }
      )
      .catch(function (error) {
        console.error('Fetch error (Tafel): ' + error);
      });
  }
}

// Eventlistener
selectBeruf.addEventListener('change', () => { updateKlasse() });
selectKlasse.addEventListener('change', () => { updateCalendar() });

btnWeekBefore.addEventListener('click', () => { changeWeek(false) });
btnWeekAfter.addEventListener('click', () => { changeWeek() });

function changeWeek(after = true) {
  let tempDate;
  if (after) {
    tempDate = weekDate.getDate() + 7;
  } else {
    tempDate = weekDate.getDate() - 7;
  }
  weekDate.setDate(tempDate);
  selectedYearWeek = getWeekNumber(weekDate);
  updateWeekNumber();
  updateCalendar();
}

function removeOptions(select) {
  let i;
  for (i = select.options.length - 1; i > 0; i--) {
    select.remove(i);
  }
}



function twoDigits(n) {
  return (n < 10 ? '0' : '') + n;
}

function disableSelectKlasse() {
  if (selectBeruf.options[selectBeruf.selectedIndex].value == '0') {
    selectKlasse.disabled = true;
  } else {
    selectKlasse.disabled = false;
  }
}

function updateWeekNumber() {
  btnSelectedWeek.innerHTML = 'KW ' + selectedYearWeek[1] + ', ' + selectedYearWeek[0];
}

function toMinutes(t) {
  var hms = t;
  var a = hms.split(':');
  var min = (+a[0]) * 60 + (+a[1]);
  return min;
}

function clearCalendar() {
  document.querySelectorAll('.event').forEach(element => {
    element.parentElement.removeChild(element);
  });
}

function saveLastSetting() {
  // Set ID of last selected Beruf and Klasse
  let lastSelected = { 'beruf_id': selectBeruf.options[selectBeruf.selectedIndex].value, 'klasse_id': selectKlasse.options[selectKlasse.selectedIndex].value };
  // Put the object into storage
  localStorage.setItem('lastSelected', JSON.stringify(lastSelected));
}

function selectSetting(selectObj, keyLocalStorage, keyJSON) {
  let lastSelected = readFromLocalStorage(keyLocalStorage);
  console.log(lastSelected[keyJSON]);
  selectObj.querySelector("option[value='" + lastSelected[keyJSON] + "']").selected = true;
}

function readFromLocalStorage(s) {
  return JSON.parse(localStorage.getItem(s));
}

updateBeruf();