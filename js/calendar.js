// Module D：行事曆
// 資料格式：{ id, title, date, time }
//   date：'YYYY-MM-DD'
//   time：'HH:MM'（24 小時制）

let events = [];

let calYear = 0;         // 月曆目前顯示的年
let calMonth = 0;        // 月曆目前顯示的月（0 = 1 月, 11 = 12 月）
let selectedDate = '';   // 目前選取的日期（下方列出這天的行程）

// ---------- 初始化 ----------
function initCalendar() {
  events = load('events', []);

  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  selectedDate = dateToString(now);
  document.getElementById('ev-date').value = selectedDate;

  document.getElementById('ev-add').addEventListener('click', addEvent);
  document.getElementById('cal-prev').addEventListener('click', function () {
    changeMonth(-1);
  });
  document.getElementById('cal-next').addEventListener('click', function () {
    changeMonth(1);
  });

  renderCalendar();
}

// ---------- 新增行程 ----------
function addEvent() {
  const titleInput = document.getElementById('ev-title');
  const dateInput = document.getElementById('ev-date');
  const timeInput = document.getElementById('ev-time');
  const title = titleInput.value.trim();

  if (title === '' || dateInput.value === '' || timeInput.value === '') {
    alert(t('evNeedAll'));
    return;
  }

  events.push({ id: makeId(events), title: title, date: dateInput.value, time: timeInput.value });
  save('events', events);

  // 跳到新增的那一天，讓使用者馬上看到
  selectDate(dateInput.value);
  titleInput.value = '';
  timeInput.value = '';
}

// ---------- 刪除行程 ----------
function deleteEvent(id) {
  events = events.filter(function (e) {
    return e.id !== id;
  });
  save('events', events);
  renderCalendar();
}

// ---------- 選取日期（月曆跟著切到那個月）----------
function selectDate(dateStr) {
  selectedDate = dateStr;
  const parts = dateStr.split('-');
  calYear = Number(parts[0]);
  calMonth = Number(parts[1]) - 1;
  document.getElementById('ev-date').value = dateStr;
  renderCalendar();
}

// ---------- 換月 ----------
function changeMonth(step) {
  calMonth = calMonth + step;
  if (calMonth < 0) {
    calMonth = 11;
    calYear = calYear - 1;
  } else if (calMonth > 11) {
    calMonth = 0;
    calYear = calYear + 1;
  }
  renderCalendar();
}

// ---------- 畫面更新 ----------
function renderCalendar() {
  renderMonthGrid();
  renderDayEvents();
}

function renderMonthGrid() {
  document.getElementById('cal-title').textContent = tf('calTitle', {
    y: calYear,
    m: calMonth + 1,
    monthName: (currentLang === 'en') ? t('monthNames')[calMonth] : ''
  });

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  t('weekdays').forEach(function (w) {
    const head = document.createElement('div');
    head.className = 'cal-head';
    head.textContent = w;
    grid.appendChild(head);
  });

  const firstWeekday = new Date(calYear, calMonth, 1).getDay();      // 1 號是星期幾
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();  // 這個月有幾天
  const todayStr = dateToString(new Date());

  for (let i = 0; i < firstWeekday; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-cell blank';
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = dateToString(new Date(calYear, calMonth, day));

    const cell = document.createElement('div');
    cell.className = 'cal-cell clickable';
    cell.textContent = day;
    if (dateStr === todayStr) {
      cell.classList.add('today');
    }
    if (dateStr === selectedDate) {
      cell.classList.add('selected');
    }
    const hasEvent = events.some(function (e) {
      return e.date === dateStr;
    });
    if (hasEvent) {
      cell.classList.add('has-task');
    }
    cell.addEventListener('click', function () {
      selectDate(dateStr);
    });

    grid.appendChild(cell);
  }
}

function renderDayEvents() {
  document.getElementById('ev-day-title').textContent = tf('dayEvents', { date: shortDateText(selectedDate) });

  const list = document.getElementById('ev-list');
  list.innerHTML = '';

  const dayEvents = events.filter(function (e) {
    return e.date === selectedDate;
  });
  dayEvents.sort(function (a, b) {
    if (a.time < b.time) {
      return -1;
    }
    if (a.time > b.time) {
      return 1;
    }
    return 0;
  });

  if (dayEvents.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = t('noEvents');
    list.appendChild(empty);
    return;
  }

  dayEvents.forEach(function (e) {
    const li = document.createElement('li');
    li.className = 'list-item';

    const time = document.createElement('span');
    time.className = 'ev-time';
    time.textContent = e.time;

    const info = document.createElement('div');
    info.className = 'item-info';
    const title = document.createElement('span');
    title.className = 'item-title';
    title.textContent = e.title;
    info.appendChild(title);

    const del = document.createElement('button');
    del.className = 'del-btn';
    del.textContent = t('del');
    del.addEventListener('click', function () {
      deleteEvent(e.id);
    });

    li.appendChild(time);
    li.appendChild(info);
    li.appendChild(del);
    list.appendChild(li);
  });
}
