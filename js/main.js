/**
 * Creates an option element
 * @param  {String} value Value of the option element
 * @param  {String} text Text of the option element
 * @return {Object}      opton element
 */
const createOption = (value, text) => {
  let opt = document.createElement('option');
  opt.value = value;
  opt.text = text;
  return opt;
}

/**
 * Returns the dates of a calendar week of a year
 * @param  {Number} week calendar week
 * @param  {String} year year
 * @return {Array}       All dates of a week
 */
const getDatesOfWeek = (week, year) => {
  // Get the first date of a week
  let simple = new Date(year, 0, 1 + (week - 1) * 7);
  let dow = simple.getDay();
  let weekStartDate = simple;
  if (dow <= 4) {
    weekStartDate.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    weekStartDate.setDate(simple.getDate() + 8 - simple.getDay());
  }

  // Filling array with all dates of a week
  let weekDates = [];

  for (let i = 0; i < 7; i++) {
    let tempDate = new Date(weekStartDate);
    tempDate.setDate(tempDate.getDate() + i);
    weekDates.push(twoDigits(tempDate.getDate()) + '.' + twoDigits(tempDate.getMonth() + 1));
  }

  return weekDates;
}

// Method from https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
/**
 * Returns the year, the calendar week from a date and all dates from the week
 * @param  {Object} d Date
 * @return {Array}    Year, calendar week, dates from week
 */
const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = twoDigits(Math.ceil((((d - yearStart) / 86400000) + 1) / 7));
  return [d.getUTCFullYear(), weekNo, getDatesOfWeek(weekNo, d.getUTCFullYear())];
}

// Only true if page new loaded
let firstLoad = true;

// Select elements and set the default option
const selectBeruf = document.getElementById('select-beruf');
selectBeruf.appendChild(createOption('0', 'Beruf wählen'));

const selectKlasse = document.getElementById('select-klasse');
selectKlasse.appendChild(createOption('0', 'Klasse wählen'));

// Calendar Settings
const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const weekdayTitle = [];
for (let i = 0; i < 7; i++) {
  weekdayTitle.push(document.getElementById('weekday-title-' + i));
}

// height/5min
let intervalHeight = 5;
// Start n minutes after 00:00 AM
let calendarStart = 435;

// Date
let weekDate = new Date();
let selectedYearWeek = getWeekNumber(weekDate);

// Buttons
const btnSelectedWeek = document.getElementById('weekNumber');
const btnWeekBefore = document.getElementById('weekBefore');
const btnWeekAfter = document.getElementById('weekAfter');

// Info
const calendarInfo = document.getElementById('calendar-info');

/**
 * Fetching the data for Beruf (jobs) and fill in the select element
 */
const updateBeruf = () => {
  fetch('http://sandbox.gibm.ch/berufe.php')
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      // Add options
      data.forEach(beruf => {
        selectBeruf.appendChild(createOption(beruf.beruf_id, beruf.beruf_name));
      });
    })
    .then(() => {
      setSelectedBeruf();
    })
    .catch(function (error) {
      alert('API reagiert nicht, versuchen Sie es bitte erneut.')
      console.error('Fetch error (Beruf): ' + error);
    });
}

/**
 * Fetching the data for Klasse (class) and fill in the select element
 */
const updateKlasse = () => {
  selectKlasse.selectedIndex = 0;
  disableSelectKlasse();
  clearCalendar();
  // Get selected value from jobs select
  let val = parseInt(selectBeruf.options[selectBeruf.selectedIndex].value);
  if (val) {
    fetch('http://sandbox.gibm.ch/klassen.php?beruf_id=' + val)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        removeOptions(selectKlasse);
        // Add Options
        data.forEach(klasse => {
          selectKlasse.appendChild(createOption(klasse.klasse_id, klasse.klasse_name));
        });
      })
      .then(() => {
        setSelectedKlasse();
        disableSelectKlasse();
      })
      .catch((error) => {
        alert('API reagiert nicht, versuchen Sie es bitte erneut.')
        console.error('Fetch error (Klasse): ' + error);
      });
  }
}

/**
 * Fetching the data for the calendar and fill in the appointments
 */
function updateCalendar() {
  if (selectBeruf.options[selectBeruf.selectedIndex].value != 0 && selectKlasse.options[selectKlasse.selectedIndex].value != 0) {
    saveLastSetting();
    // Childs löschen
    clearCalendar();
    fetch('http://sandbox.gibm.ch/tafel.php?klasse_id=' + selectKlasse.options[selectKlasse.selectedIndex].value + '&woche=' + selectedYearWeek[1] + '-' + selectedYearWeek[0])
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data == false) {
          calendarInfo.innerText = 'Keine Daten vorhanden';
          return;
        }

        data.forEach((element, index) => {
          let div = document.createElement('div');
          let from = element.tafel_von;
          let to = element.tafel_bis;
          div.innerHTML = from.slice(0, -3) + '-' + to.slice(0, -3) + '<br>' + element.tafel_longfach + '<br>' + element.tafel_lehrer + '<br>' + element.tafel_raum;

          div.classList.add('bg-primary', 'appointment-prop', 'event', 'text-white');

          // If screen < 768px remove margin on top of appointment 
          if (window.innerWidth >= 768) {
            div.classList.add('position-absolute');
            let fromMin = toMinutes(from);
            let toMin = toMinutes(to);
            div.style.top = (fromMin - calendarStart) / 5 * intervalHeight + 'px';
            div.style.height = (toMin - fromMin) / 5 * intervalHeight + 'px';
          } else {
            // Add margin on bottom of appointment
            div.classList.add('mb-1');
          }
          document.getElementById('weekday-' + (element.tafel_wochentag - (element.tafel_wochentag == 0 ? (-6) : 1))).appendChild(div);
        });
      })
      .catch(function (error) {
        alert('API reagiert nicht, versuchen Sie es bitte erneut.')
        console.error('Fetch error (Tafel): ' + error);
      });
  }
}

// Eventlistener
selectBeruf.addEventListener('change', () => { updateKlasse() });
selectKlasse.addEventListener('change', () => { updateCalendar() });

btnWeekBefore.addEventListener('click', () => { changeWeek(false) });
btnWeekAfter.addEventListener('click', () => { changeWeek() });

/**
 * Changes calender week
 * @param  {boolean} after true = week in future, false = week in past
 */
function changeWeek(after = true) {
  let tempDate;
  if (after) {
    tempDate = weekDate.getDate() + 7;
  } else {
    tempDate = weekDate.getDate() - 7;
  }
  // Set the new date
  weekDate.setDate(tempDate);
  selectedYearWeek = getWeekNumber(weekDate);
  // Update Data
  updateWeekNumber();
  updateCalendar();
}

/**
 * Removes all options from a select
 * @param  {Object} select Select element to clear
 */
function removeOptions(select) {
  let i;
  for (i = select.options.length - 1; i > 0; i--) {
    select.remove(i);
  }
}

/**
 * Makes single digit numbers to numbers with two digits
 * @param  {Number} n Number to convert
 * @return {String}   String with the number with two digits
 */
function twoDigits(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Disables the selectKlasse element if no Beruf (job) is selected
 */
function disableSelectKlasse() {
  if (selectBeruf.options[selectBeruf.selectedIndex].value == '0') {
    selectKlasse.disabled = true;
  } else {
    selectKlasse.disabled = false;
  }
}

/**
 * Updates the week number and week dates
 */
function updateWeekNumber() {
  btnSelectedWeek.innerHTML = 'KW ' + selectedYearWeek[1] + ', ' + selectedYearWeek[0];
  // Set dates in calendar header
  let screenWidth = window.innerWidth;
  weekdayTitle.forEach((element, index) => {
    element.innerHTML = weekdays[index] + (screenWidth <= 1000 ? '<br>' : ', ') + selectedYearWeek[2][index];
  });
}

/**
 * Converts a time to minutes
 * @param  {String} t Time to convert (hh:mm)
 * @return {Number}   number of minutes
 */
function toMinutes(t) {
  let hms = t;
  let a = hms.split(':');
  let min = (+a[0]) * 60 + (+a[1]);
  return min;
}

/**
 * Removes all events in the calendar
 */
function clearCalendar() {
  calendarInfo.innerText = '';
  let arr = document.querySelectorAll('.event');
  arr.forEach(element => {
    element.style.opacity = '0';
  });
  btnWeekAfter.disabled = true;
  btnWeekBefore.disabled = true;
  // Timeout for transition
  window.setTimeout(() => {
    arr.forEach(element => {
      element.parentElement.removeChild(element);
    })
    btnWeekAfter.disabled = false;
    btnWeekBefore.disabled = false;
  }, 500);
}

/**
 * Saves the selected Beruf (job) and the selected Klass (class) in localStorage
 */
function saveLastSetting() {
  // Set ID of last selected Beruf (Job) and Klasse (class) and put them into storage
  localStorage.setItem('beruf_id', selectBeruf.options[selectBeruf.selectedIndex].value);
  localStorage.setItem('klasse_id', selectKlasse.options[selectKlasse.selectedIndex].value);
}

/**
 * Sets (if saved) the last selected Beruf (job)
 */
function setSelectedBeruf() {
  if (localStorage.getItem('beruf_id') && firstLoad) {
    setSelectedIndex(selectBeruf, localStorage.getItem('beruf_id'));
    updateKlasse();
  } else {
    disableSelectKlasse();
  }
}

/**
 * Sets (if saved) the last selected Klasse (class)
 */
function setSelectedKlasse() {
  if (localStorage.getItem('klasse_id') && firstLoad) {
    setSelectedIndex(selectKlasse, localStorage.getItem('klasse_id'));
    updateCalendar();
    firstLoad = false;
  }
}

/**
 * Sets option as selected depending on the value
 * @param  {Object} object Select element
 * @param  {String} valSearch Value of the option
 */
function setSelectedIndex(object, valSearch) {
  // Get htmlCollection of Options and convert to array
  const opt = [].slice.call(object.options)
  // Find option with matching value and set to selected
  opt.find(element => element.value == valSearch).selected = true;
}

// Start
updateWeekNumber(btnSelectedWeek, selectedYearWeek);
updateBeruf();