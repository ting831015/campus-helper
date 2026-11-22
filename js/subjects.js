// 讀書科目 + 今日科目圓餅圖
// 科目清單由使用者自己新增（例如 ALU、OS），開始讀書前選這次讀哪一科
// 每完成一段讀書時間，timer.js 的 recordSession() 會把「當時選的科目」一起記下來
// 科目格式：字串陣列，例如 ['ALU', 'OS']；'' 代表「未分類」

let studySubjects = [];   // 使用者新增的科目（存在 LocalStorage）
let currentSubject = '';  // 目前選的科目，'' = 未分類（存在 LocalStorage，下次打開自動選回來）

// 圓餅圖的顏色，依序使用，科目超過 8 個就從頭重複
const SUBJECT_COLORS = ['#3b6ea5', '#e8833a', '#5cb85c', '#9b59b6', '#d9534f', '#f0ad4e', '#5bc0de', '#95a5a6'];

// ---------- 初始化 ----------
function initSubjects() {
  studySubjects = load('studySubjects', []);
  currentSubject = load('currentSubject', '');
  if (currentSubject !== '' && studySubjects.indexOf(currentSubject) === -1) {
    currentSubject = '';   // 選的科目已經被刪掉了 → 改回未分類
  }

  document.getElementById('subject-add').addEventListener('click', addSubject);
  document.getElementById('subject-new').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      addSubject();   // 輸入框按 Enter 也能新增
    }
  });
  document.getElementById('timer-subject').addEventListener('change', function (e) {
    currentSubject = e.target.value;
    save('currentSubject', currentSubject);
  });

  renderSubjects();
}

// ---------- 新增／刪除科目 ----------
function addSubject() {
  const input = document.getElementById('subject-new');
  const name = input.value.trim();

  if (name === '') {
    alert(t('subjectNeedName'));
    return;
  }
  if (studySubjects.indexOf(name) !== -1) {
    alert(t('subjectExists'));
    return;
  }

  studySubjects.push(name);
  save('studySubjects', studySubjects);

  currentSubject = name;   // 新增後直接選這一科，比較方便
  save('currentSubject', currentSubject);

  input.value = '';
  renderSubjects();
}

function deleteSubject(name) {
  if (!confirm(tf('subjectConfirmDelete', { name: name }))) {
    return;
  }
  studySubjects = studySubjects.filter(function (s) {
    return s !== name;
  });
  save('studySubjects', studySubjects);

  if (currentSubject === name) {
    currentSubject = '';
    save('currentSubject', currentSubject);
  }
  renderSubjects();
  // 已經記錄的讀書時間不刪，圓餅圖仍會顯示這個科目
}

// 顯示用的科目名稱：'' 顯示成「未分類」
function subjectLabel(name) {
  return (name === '') ? t('subjectNone') : name;
}

// ---------- 畫面：科目選單 + 科目清單 ----------
function renderSubjects() {
  // 下拉選單：未分類 + 使用者的科目
  const select = document.getElementById('timer-subject');
  select.innerHTML = '';
  [''].concat(studySubjects).forEach(function (name) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = subjectLabel(name);   // 用 textContent，使用者輸入的文字不會被當成 HTML
    select.appendChild(option);
  });
  select.value = currentSubject;

  // 科目清單：每個科目一個小標籤，右邊有 × 可以刪除
  const list = document.getElementById('subject-list');
  list.innerHTML = '';
  studySubjects.forEach(function (name) {
    const li = document.createElement('li');
    li.className = 'subject-chip';

    const text = document.createElement('span');
    text.textContent = name;

    const del = document.createElement('button');
    del.textContent = '×';
    del.title = t('del');
    del.addEventListener('click', function () {
      deleteSubject(name);
    });

    li.appendChild(text);
    li.appendChild(del);
    list.appendChild(li);
  });
}

// ---------- 畫面：今日科目圓餅圖 ----------
// timer.js 的 renderTimer() 每次都會呼叫，所以完成一段讀書時間後會自動更新
function renderStudyPie() {
  const today = dateToString(new Date());

  // 1. 加總今天每個科目的分鐘數（照第一次出現的順序排顏色）
  const totals = {};    // { 科目: 分鐘 }
  const order = [];     // 科目出現的順序
  let sum = 0;
  studySessions.forEach(function (s) {   // studySessions 定義在 timer.js
    if (s.date !== today) {
      return;
    }
    const name = s.subject || '';   // 舊紀錄沒有 subject 欄位 → 當成未分類
    if (totals[name] === undefined) {
      totals[name] = 0;
      order.push(name);
    }
    totals[name] = totals[name] + s.minutes;
    sum = sum + s.minutes;
  });

  const pie = document.getElementById('study-pie');
  const legend = document.getElementById('study-pie-legend');
  legend.innerHTML = '';

  if (sum === 0) {
    pie.style.background = '#e5e7eb';   // 灰色空圓
    const li = document.createElement('li');
    li.className = 'pie-empty';
    li.textContent = t('noStudyToday');
    legend.appendChild(li);
    return;
  }

  // 2. 畫圓餅：用 CSS 的 conic-gradient（從 12 點鐘方向順時針，每個科目佔一段角度）
  //    例：ALU 60%、OS 40% → conic-gradient(藍 0% 60%, 橘 60% 100%)
  const parts = [];
  let start = 0;   // 這一段從幾 % 開始
  order.forEach(function (name, i) {
    const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
    const end = start + totals[name] / sum * 100;
    parts.push(color + ' ' + start + '% ' + end + '%');
    start = end;
  });
  pie.style.background = 'conic-gradient(' + parts.join(', ') + ')';

  // 3. 右邊的說明：顏色、科目、分鐘、百分比
  order.forEach(function (name, i) {
    const li = document.createElement('li');

    const dot = document.createElement('span');
    dot.className = 'pie-dot';
    dot.style.background = SUBJECT_COLORS[i % SUBJECT_COLORS.length];

    const label = document.createElement('span');
    label.className = 'pie-name';
    label.textContent = subjectLabel(name);

    const value = document.createElement('span');
    value.className = 'pie-value';
    value.textContent = tf('pieValue', { min: totals[name], pct: Math.round(totals[name] / sum * 100) });

    li.appendChild(dot);
    li.appendChild(label);
    li.appendChild(value);
    legend.appendChild(li);
  });
}
