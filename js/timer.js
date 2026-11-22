// Module C：讀書計時器
// 設定格式：{ studyMin, breakMin }
// 讀書紀錄格式：{ date, minutes, subject }（subject：科目名稱，'' = 未分類；舊紀錄沒有 subject 欄位，也當成未分類）

let timerSettings = { studyMin: 25, breakMin: 5 };
let studySessions = [];

// ---------- FSM 狀態 ----------
const IDLE = 'IDLE';
const STUDY = 'STUDY';
const BREAK = 'BREAK';
const PAUSED = 'PAUSED';

let timerState = IDLE;   // 目前狀態
let pausedFrom = null;   // 從哪個狀態暫停（STUDY 或 BREAK）
let endTime = 0;         // 目前這段結束的時間點（毫秒）
let remainingMs = 0;     // 剩餘時間（毫秒）
let tickId = null;       // setInterval 的編號，停止計時要用

// ---------- 初始化 ----------
function initTimer() {
  timerSettings = load('timerSettings', { studyMin: 25, breakMin: 5 });
  studySessions = load('studySessions', []);

  document.getElementById('timer-study-min').value = timerSettings.studyMin;
  document.getElementById('timer-break-min').value = timerSettings.breakMin;

  document.getElementById('timer-start').addEventListener('click', timerStart);
  document.getElementById('timer-pause').addEventListener('click', timerPause);
  document.getElementById('timer-reset').addEventListener('click', timerReset);
  document.getElementById('timer-study-min').addEventListener('change', timerSaveSettings);
  document.getElementById('timer-break-min').addEventListener('change', timerSaveSettings);

  remainingMs = timerSettings.studyMin * 60 * 1000;
  renderTimer();
}

// ---------- 1 Hz clock ----------
function startTicking() {
  if (tickId === null) {
    tickId = setInterval(tick, 1000);
  }
}

function stopTicking() {
  if (tickId !== null) {
    clearInterval(tickId);
    tickId = null;
  }
}

// ---------- 按鈕：開始 ----------
function timerStart() {
  unlockBeep();   // 啟動提示音的聲音引擎（手機規定要在使用者點擊時啟動）
  if (timerState === IDLE) {
    timerState = STUDY;
    endTime = Date.now() + timerSettings.studyMin * 60 * 1000;
    remainingMs = endTime - Date.now();
    startTicking();
  } else if (timerState === PAUSED) {
    timerState = pausedFrom;
    pausedFrom = null;
    endTime = Date.now() + remainingMs;
    startTicking();
  }
  renderTimer();
}

// ---------- 按鈕：暫停 ----------
function timerPause() {
  if (timerState === STUDY || timerState === BREAK) {
    remainingMs = endTime - Date.now();
    pausedFrom = timerState;
    timerState = PAUSED;
    stopTicking();
  }
  renderTimer();
}

// ---------- 按鈕：重設 ----------
function timerReset() {
  stopTicking();
  timerState = IDLE;
  pausedFrom = null;
  remainingMs = timerSettings.studyMin * 60 * 1000;
  renderTimer();
}

// ---------- 每秒執行一次 ----------
function tick() {
  remainingMs = endTime - Date.now();
  const stateBefore = timerState;   // 記下這次檢查前的狀態，用來判斷有沒有換階段

  while (remainingMs <= 0 && (timerState === STUDY || timerState === BREAK)) {
    if (timerState === STUDY) {
      recordSession(timerSettings.studyMin);
      timerState = BREAK;
      endTime = endTime + timerSettings.breakMin * 60 * 1000;
    } else {
      timerState = STUDY;
      endTime = endTime + timerSettings.studyMin * 60 * 1000;
    }
    remainingMs = endTime - Date.now();
  }

  // 換階段時響提示音：讀書結束（開始休息）響 2 聲，休息結束（開始讀書）響 3 聲
  if (timerState !== stateBefore) {
    playBeep(timerState === BREAK ? 2 : 3);
  }

  renderTimer();
}

// ---------- 設定讀書／休息時間 ----------
function timerSaveSettings() {
  const studyInput = document.getElementById('timer-study-min');
  const breakInput = document.getElementById('timer-break-min');
  const studyMin = parseInt(studyInput.value, 10);
  const breakMin = parseInt(breakInput.value, 10);

  if (!(studyMin >= 1 && studyMin <= 120) || !(breakMin >= 1 && breakMin <= 60)) {
    studyInput.value = timerSettings.studyMin;
    breakInput.value = timerSettings.breakMin;
    return;
  }

  timerSettings = { studyMin: studyMin, breakMin: breakMin };
  save('timerSettings', timerSettings);

  if (timerState === IDLE) {
    remainingMs = studyMin * 60 * 1000;
  }
  renderTimer();
}

// ---------- 讀書紀錄 ----------
function recordSession(minutes) {
  studySessions.push({ date: dateToString(new Date()), minutes: minutes, subject: currentSubject });   // currentSubject 定義在 subjects.js
  save('studySessions', studySessions);
}

// 本週一的日期（一週從星期一開始）
function mondayString() {
  const d = new Date();
  const weekday = d.getDay();               // 0 = 星期日, 1 = 星期一, ..., 6 = 星期六
  const diff = (weekday === 0) ? 6 : weekday - 1;
  d.setDate(d.getDate() - diff);
  return dateToString(d);
}

// 加總 fromDate ~ toDate（含）之間的讀書分鐘數
function sumMinutes(fromDate, toDate) {
  let total = 0;
  studySessions.forEach(function (s) {
    if (s.date >= fromDate && s.date <= toDate) {
      total = total + s.minutes;
    }
  });
  return total;
}

// ---------- 畫面更新 ----------
function renderTimer() {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = mm + ':' + ss;

  let phaseText = t('phaseIdle');
  if (timerState === STUDY) {
    phaseText = t('phaseStudy');
  } else if (timerState === BREAK) {
    phaseText = t('phaseBreak');
  } else if (timerState === PAUSED) {
    phaseText = (pausedFrom === STUDY) ? t('phaseStudyPaused') : t('phaseBreakPaused');
  }
  document.getElementById('timer-phase').textContent = phaseText;

  const running = (timerState === STUDY || timerState === BREAK);
  document.getElementById('timer-start').disabled = running;
  document.getElementById('timer-pause').disabled = !running;
  document.getElementById('timer-study-min').disabled = (timerState !== IDLE);
  document.getElementById('timer-break-min').disabled = (timerState !== IDLE);

  updateWhiteNoise();   // 讀書中 → 播白噪音（如果使用者有開）；其他狀態 → 停止

  const today = dateToString(new Date());
  document.getElementById('timer-today').textContent = sumMinutes(today, today);
  document.getElementById('timer-week').textContent = sumMinutes(mondayString(), today);

  renderStudyPie();   // 今日科目圓餅圖（subjects.js）
}
