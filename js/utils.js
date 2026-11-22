// 共用：日期工具

// 把日期轉成 'YYYY-MM-DD'（用本地時間）
function dateToString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// 產生一個不會跟 list 裡重複的 id
function makeId(list) {
  let id = Date.now();
  while (list.some(function (item) { return item.id === id; })) {
    id = id + 1;
  }
  return id;
}

// 'YYYY-MM-DD' 是星期幾（中文回傳 '日'…'六'，英文回傳 'Sun'…'Sat'）
function weekdayName(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return t('weekdays')[d.getDay()];
}

// 'YYYY-MM-DD' → 中文 '11/21（六）'、英文 '11/21 (Sat)'
function shortDateText(dateStr) {
  const parts = dateStr.split('-');
  return tf('shortDate', { m: Number(parts[1]), d: Number(parts[2]), w: weekdayName(dateStr) });
}
