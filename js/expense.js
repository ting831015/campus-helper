// Module B：記帳
// 資料格式：{ id, amount, category, date, note }

let expenses = [];

const EXPENSE_CATEGORIES = ['餐費', '交通', '文具', '娛樂', '其他'];

// 長條圖每個分類的顏色
const CATEGORY_COLORS = {
  '餐費': '#e8833a',
  '交通': '#3b6ea5',
  '文具': '#5cb85c',
  '娛樂': '#9b59b6',
  '其他': '#95a5a6'
};

const DAY_CHART_HEIGHT = 140;   // 每日花費長條圖的最高高度（像素）

// ---------- 初始化 ----------
function initExpense() {
  expenses = load('expenses', []);

  renderCategoryOptions();

  const today = dateToString(new Date());
  document.getElementById('exp-date').value = today;
  document.getElementById('exp-month').value = today.slice(0, 7);   // 'YYYY-MM'

  document.getElementById('exp-add').addEventListener('click', addExpense);
  document.getElementById('exp-month').addEventListener('change', renderExpense);

  renderExpense();
}

// ---------- 分類下拉選單（切換語言時也要重做，顯示名稱才會換）----------
function renderCategoryOptions() {
  const select = document.getElementById('exp-category');
  const selected = select.value;
  select.innerHTML = '';
  EXPENSE_CATEGORIES.forEach(function (c) {
    const opt = document.createElement('option');
    opt.value = c;                 // 存進資料的值：固定用中文名稱
    opt.textContent = catLabel(c); // 畫面上顯示的名稱：依語言
    select.appendChild(opt);
  });
  if (selected !== '') {
    select.value = selected;
  }
}

// ---------- 新增 ----------
function addExpense() {
  const amountInput = document.getElementById('exp-amount');
  const dateInput = document.getElementById('exp-date');
  const noteInput = document.getElementById('exp-note');
  const amount = Number(amountInput.value);

  if (!(amount > 0) || dateInput.value === '') {
    alert(t('expNeedAmount'));
    return;
  }

  expenses.push({
    id: makeId(expenses),
    amount: amount,
    category: document.getElementById('exp-category').value,
    date: dateInput.value,
    note: noteInput.value.trim()
  });
  save('expenses', expenses);

  amountInput.value = '';
  noteInput.value = '';
  renderExpense();
}

// ---------- 刪除 ----------
function deleteExpense(id) {
  expenses = expenses.filter(function (e) {
    return e.id !== id;
  });
  save('expenses', expenses);
  renderExpense();
}

// ---------- 畫面更新 ----------
function renderExpense() {
  const monthInput = document.getElementById('exp-month');
  if (monthInput.value === '') {
    monthInput.value = dateToString(new Date()).slice(0, 7);
  }
  const month = monthInput.value;

  // 1. 挑出選擇月份的資料
  const monthItems = expenses.filter(function (e) {
    return e.date.slice(0, 7) === month;
  });

  // 2. 加總：總額、分類小計、每天（每天再分分類）
  let total = 0;
  const catTotals = {};
  EXPENSE_CATEGORIES.forEach(function (c) {
    catTotals[c] = 0;
  });
  const days = {};   // days['2026-11-21'] = { total, cats: { 餐費: 125, … }, items: [ … ] }

  monthItems.forEach(function (e) {
    total = total + e.amount;
    catTotals[e.category] = catTotals[e.category] + e.amount;

    if (days[e.date] === undefined) {
      days[e.date] = { total: 0, cats: {}, items: [] };
    }
    const d = days[e.date];
    d.total = d.total + e.amount;
    d.cats[e.category] = (d.cats[e.category] || 0) + e.amount;
    d.items.push(e);
  });

  document.getElementById('exp-total').textContent = 'NT$ ' + total.toLocaleString();
  renderHighlight(catTotals, days);
  renderCategoryChart(catTotals);
  renderDayChart(month, days);
  renderDaily(days);
}

// 花費最高的分類與日期
function renderHighlight(catTotals, days) {
  const box = document.getElementById('exp-highlight');

  let topCat = '';
  EXPENSE_CATEGORIES.forEach(function (c) {
    if (catTotals[c] > 0 && (topCat === '' || catTotals[c] > catTotals[topCat])) {
      topCat = c;
    }
  });

  let topDay = '';
  Object.keys(days).forEach(function (date) {
    if (topDay === '' || days[date].total > days[topDay].total) {
      topDay = date;
    }
  });

  if (topCat === '') {
    box.textContent = '';
    return;
  }
  box.textContent = tf('highlight', {
    cat: catLabel(topCat),
    catAmt: catTotals[topCat].toLocaleString(),
    day: shortDateText(topDay),
    dayAmt: days[topDay].total.toLocaleString()
  });
}

// 分類花費：橫向長條圖
function renderCategoryChart(catTotals) {
  const chart = document.getElementById('exp-cat-chart');
  chart.innerHTML = '';

  let max = 0;
  EXPENSE_CATEGORIES.forEach(function (c) {
    max = Math.max(max, catTotals[c]);
  });
  if (max === 0) {
    chart.textContent = t('noData');
    chart.classList.add('empty');
    return;
  }
  chart.classList.remove('empty');

  EXPENSE_CATEGORIES.forEach(function (c) {
    const row = document.createElement('div');
    row.className = 'hbar-row';

    const label = document.createElement('span');
    label.className = 'hbar-label';
    label.textContent = catLabel(c);

    const track = document.createElement('div');
    track.className = 'hbar-track';
    const fill = document.createElement('div');
    fill.className = 'hbar-fill';
    fill.style.width = (catTotals[c] / max * 100) + '%';
    fill.style.background = CATEGORY_COLORS[c];
    track.appendChild(fill);

    const value = document.createElement('span');
    value.className = 'hbar-value';
    value.textContent = 'NT$ ' + catTotals[c].toLocaleString();

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    chart.appendChild(row);
  });
}

// 每日花費：直向長條圖，每天的長條依分類分色疊起來
function renderDayChart(month, days) {
  const chart = document.getElementById('exp-day-chart');
  chart.innerHTML = '';

  const parts = month.split('-');
  const daysInMonth = new Date(Number(parts[0]), Number(parts[1]), 0).getDate();

  let max = 0;
  Object.keys(days).forEach(function (date) {
    max = Math.max(max, days[date].total);
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = month + '-' + String(day).padStart(2, '0');
    const d = days[dateStr];

    const col = document.createElement('div');
    col.className = 'vbar-col';

    const stack = document.createElement('div');
    stack.className = 'vbar-stack';
    stack.style.height = DAY_CHART_HEIGHT + 'px';

    if (d !== undefined) {
      // 由下往上疊：每個分類的高度 = 金額 / 最高的一天 × 圖的高度
      EXPENSE_CATEGORIES.forEach(function (c) {
        if (d.cats[c] > 0) {
          const seg = document.createElement('div');
          seg.className = 'vbar-seg';
          seg.style.height = (d.cats[c] / max * DAY_CHART_HEIGHT) + 'px';
          seg.style.background = CATEGORY_COLORS[c];
          stack.appendChild(seg);
        }
      });

      // 滑鼠移上去顯示當天明細
      let tip = shortDateText(dateStr) + '  ' + tf('dayTotal', { amt: d.total.toLocaleString() });
      EXPENSE_CATEGORIES.forEach(function (c) {
        if (d.cats[c] > 0) {
          tip = tip + '\n' + catLabel(c) + ': NT$ ' + d.cats[c].toLocaleString();
        }
      });
      col.title = tip;
    }

    const label = document.createElement('span');
    label.className = 'vbar-label';
    label.textContent = day;

    col.appendChild(stack);
    col.appendChild(label);
    chart.appendChild(col);
  }

  // 圖例
  const legend = document.getElementById('exp-legend');
  legend.innerHTML = '';
  EXPENSE_CATEGORIES.forEach(function (c) {
    const item = document.createElement('span');
    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = CATEGORY_COLORS[c];
    item.appendChild(dot);
    item.appendChild(document.createTextNode(catLabel(c)));
    legend.appendChild(item);
  });
}

// 每日明細：一天一張卡片（日期新的在前）
function renderDaily(days) {
  const box = document.getElementById('exp-daily');
  box.innerHTML = '';

  const dates = Object.keys(days).sort().reverse();
  if (dates.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = t('noRecords');
    box.appendChild(empty);
    return;
  }

  dates.forEach(function (date) {
    const d = days[date];

    const card = document.createElement('div');
    card.className = 'card day-card';

    // 標題列：日期 + 當天總額
    const head = document.createElement('div');
    head.className = 'day-head';
    const dateSpan = document.createElement('span');
    dateSpan.textContent = shortDateText(date);
    const totalSpan = document.createElement('span');
    totalSpan.className = 'day-total';
    totalSpan.textContent = tf('dayTotal', { amt: d.total.toLocaleString() });
    head.appendChild(dateSpan);
    head.appendChild(totalSpan);

    // 當天各分類小計
    const cats = document.createElement('div');
    cats.className = 'day-cats';
    EXPENSE_CATEGORIES.forEach(function (c) {
      if (d.cats[c] > 0) {
        const chip = document.createElement('span');
        chip.className = 'cat-chip';
        chip.style.borderColor = CATEGORY_COLORS[c];
        chip.textContent = catLabel(c) + ' ' + d.cats[c].toLocaleString();
        cats.appendChild(chip);
      }
    });

    // 當天每一筆（可刪除）
    const ul = document.createElement('ul');
    ul.className = 'day-items';
    d.items.forEach(function (e) {
      const li = document.createElement('li');

      const text = document.createElement('span');
      text.className = 'item-info';
      text.textContent = catLabel(e.category) + (e.note !== '' ? '｜' + e.note : '');

      const amount = document.createElement('span');
      amount.className = 'exp-amount';
      amount.textContent = 'NT$ ' + e.amount.toLocaleString();

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = t('del');
      del.addEventListener('click', function () {
        deleteExpense(e.id);
      });

      li.appendChild(text);
      li.appendChild(amount);
      li.appendChild(del);
      ul.appendChild(li);
    });

    card.appendChild(head);
    card.appendChild(cats);
    card.appendChild(ul);
    box.appendChild(card);
  });
}
