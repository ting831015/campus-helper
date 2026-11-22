// 共用：畫面切換與初始化
// 畫面流程：開始畫面（選語言）→ 選單 → 功能頁
// 返回按鈕：功能頁 → 選單；選單 → 開始畫面（重新選語言）

let currentView = 'menu';   // 目前顯示的畫面：'menu' 或某個功能頁的 id

function showTab(tabId) {
  currentView = tabId;

  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(function (panel) {
    panel.hidden = (panel.id !== tabId);
  });

  document.getElementById('menu').hidden = (tabId !== 'menu');
}

// 開始畫面：選擇語言 → 套用語言、重畫各模組 → 進入選單
document.querySelectorAll('.lang-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    currentLang = btn.dataset.lang;
    applyLanguage();
    renderCategoryOptions();
    renderTodo();
    renderCalendar();
    renderExpense();
    renderSubjects();   // 「未分類」要跟著換語言
    renderTimer();
    startBgm();   // 開始播背景音樂（這次點擊讓瀏覽器允許播放）

    document.getElementById('splash').hidden = true;
    document.getElementById('app-header').hidden = false;
    showTab('menu');
  });
});

// 選單的三個按鈕：點了進入對應的功能
document.querySelectorAll('.menu-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    showTab(btn.dataset.tab);
  });
});

// 返回按鈕：在功能頁 → 回選單；在選單 → 回開始畫面重新選語言
document.getElementById('back-btn').addEventListener('click', function () {
  if (currentView === 'menu') {
    document.getElementById('menu').hidden = true;
    document.getElementById('app-header').hidden = true;
    document.getElementById('splash').hidden = false;
    stopBgm();    // 回到選語言畫面：停止背景音樂
  } else {
    showTab('menu');
  }
});

initTodo();
initCalendar();
initExpense();
initSubjects();
initTimer();
initMusic();
