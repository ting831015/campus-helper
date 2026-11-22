// Module A：待辦事項
// 資料格式：{ id, title, deadline, status, note, photos }
//   deadline：'YYYY-MM-DD'，空字串代表沒有截止日
//   status：'todo'（未完成）、'urgent'（緊急）、'done'（已完成）
//   note：備註文字
//   photos：照片陣列，每張是壓縮後的圖片（data URL 字串）

let todos = [];
let openNotes = [];      // 目前展開備註的待辦 id（只影響畫面，不存檔）

const STATUS_KEY = { todo: 'statusTodo', urgent: 'statusUrgent', done: 'statusDone' };   // 狀態 → 翻譯用的 key
const STATUS_ORDER = { urgent: 0, todo: 1, done: 2 };   // 列表排序：緊急 → 未完成 → 已完成

const PHOTO_MAX_SIZE = 1024;     // 照片最長邊縮到 1024 像素
const PHOTO_QUALITY = 0.7;       // JPEG 壓縮品質（0～1）

// ---------- 初始化 ----------
function initTodo() {
  todos = load('todos', []);

  // 舊版資料轉換：舊格式用 done（true / false）表示完成，沒有 status、note、photos
  todos.forEach(function (todo) {
    if (todo.status === undefined) {
      todo.status = todo.done ? 'done' : 'todo';
    }
    if (todo.note === undefined) {
      todo.note = '';
    }
    if (todo.photos === undefined) {
      todo.photos = [];
    }
    delete todo.done;
  });

  document.getElementById('todo-add').addEventListener('click', addTodo);

  document.getElementById('photo-viewer').addEventListener('click', function () {
    document.getElementById('photo-viewer').hidden = true;
  });

  renderTodo();
}

// ---------- 新增 ----------
function addTodo() {
  const titleInput = document.getElementById('todo-title');
  const deadlineInput = document.getElementById('todo-deadline');
  const statusSelect = document.getElementById('todo-status');
  const title = titleInput.value.trim();

  if (title === '') {
    alert(t('todoNeedTitle'));
    return;
  }

  todos.push({
    id: makeId(todos),
    title: title,
    deadline: deadlineInput.value,
    status: statusSelect.value,
    note: '',
    photos: []
  });
  save('todos', todos);

  titleInput.value = '';
  deadlineInput.value = '';
  statusSelect.value = 'todo';
  renderTodo();
}

// ---------- 找到某一筆 ----------
function findTodo(id) {
  return todos.find(function (todo) {
    return todo.id === id;
  });
}

// ---------- 改狀態 ----------
function setTodoStatus(id, status) {
  findTodo(id).status = status;
  save('todos', todos);
  renderTodo();
}

// ---------- 刪除 ----------
function deleteTodo(id) {
  if (!confirm(t('todoConfirmDelete'))) {
    return;
  }
  todos = todos.filter(function (todo) {
    return todo.id !== id;
  });
  openNotes = openNotes.filter(function (n) {
    return n !== id;
  });
  save('todos', todos);
  renderTodo();
}

// ---------- 展開／收合備註 ----------
function toggleNote(id) {
  if (openNotes.includes(id)) {
    openNotes = openNotes.filter(function (n) {
      return n !== id;
    });
  } else {
    openNotes.push(id);
  }
  renderTodo();
}

// ---------- 備註文字（打字時就存，不重畫畫面，游標才不會跳掉）----------
function updateNoteText(id, text) {
  findTodo(id).note = text;
  save('todos', todos);
}

// ---------- 加入照片 ----------
function addPhotos(id, files) {
  const todo = findTodo(id);
  const fileList = Array.from(files);
  let finished = 0;
  const newPhotos = [];

  fileList.forEach(function (file) {
    compressImage(file, function (dataUrl) {
      if (dataUrl !== null) {
        newPhotos.push(dataUrl);
      }
      finished = finished + 1;

      // 全部照片都處理完，才一起存檔
      if (finished === fileList.length) {
        const before = todo.photos.length;
        newPhotos.forEach(function (p) {
          todo.photos.push(p);
        });
        if (!save('todos', todos)) {
          todo.photos.splice(before);   // 存不進去 → 把剛加的照片拿掉
          alert(t('storageFull'));
        }
        renderTodo();
      }
    });
  });
}

// ---------- 刪除照片 ----------
function deletePhoto(id, index) {
  findTodo(id).photos.splice(index, 1);
  save('todos', todos);
  renderTodo();
}

// ---------- 壓縮照片：縮小尺寸 + 轉成 JPEG ----------
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', PHOTO_QUALITY));
    };
    img.onerror = function () {
      callback(null);   // 不是圖片檔
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ---------- 今天到截止日還有幾天（負數 = 已過期）----------
function daysLeft(deadline) {
  const parts = deadline.split('-');
  const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / (24 * 60 * 60 * 1000));
}

function deadlineText(deadline) {
  if (deadline === '') {
    return t('noDeadline');
  }
  const left = daysLeft(deadline);
  let leftStr = tf('overdue', { n: -left });
  if (left > 0) {
    leftStr = tf('daysLeft', { n: left });
  } else if (left === 0) {
    leftStr = t('dueToday');
  }
  return tf('deadlinePrefix', { date: deadline, left: leftStr });
}

// ---------- 畫面更新 ----------
function renderTodo() {
  const list = document.getElementById('todo-list');
  list.innerHTML = '';

  if (todos.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = t('todoEmpty');
    list.appendChild(empty);
    return;
  }

  // 排序：狀態（緊急 → 未完成 → 已完成）→ 截止日（沒有截止日的排後面）→ 新增順序
  const sorted = todos.slice().sort(function (a, b) {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    const da = (a.deadline === '') ? '9999-99-99' : a.deadline;
    const db = (b.deadline === '') ? '9999-99-99' : b.deadline;
    if (da !== db) {
      return (da < db) ? -1 : 1;
    }
    return a.id - b.id;
  });

  sorted.forEach(function (todo) {
    list.appendChild(buildTodoItem(todo));
  });
}

function buildTodoItem(todo) {
  const li = document.createElement('li');
  li.className = 'list-item todo-item status-' + todo.status;

  // 狀態下拉選單
  const select = document.createElement('select');
  select.className = 'status-select';
  ['todo', 'urgent', 'done'].forEach(function (s) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = t(STATUS_KEY[s]);
    select.appendChild(opt);
  });
  select.value = todo.status;
  select.addEventListener('change', function () {
    setTodoStatus(todo.id, select.value);
  });

  // 標題與截止日
  const info = document.createElement('div');
  info.className = 'item-info';
  const title = document.createElement('span');
  title.className = 'item-title';
  title.textContent = todo.title;
  const sub = document.createElement('span');
  sub.className = 'item-sub';
  sub.textContent = deadlineText(todo.deadline);
  info.appendChild(title);
  info.appendChild(sub);

  // 備註按鈕：有備註或照片時加上「●」
  const noteBtn = document.createElement('button');
  noteBtn.className = 'note-btn';
  const hasNote = (todo.note !== '' || todo.photos.length > 0);
  noteBtn.textContent = (openNotes.includes(todo.id) ? t('noteClose') : t('noteOpen')) + (hasNote ? ' ●' : '');
  noteBtn.addEventListener('click', function () {
    toggleNote(todo.id);
  });

  const del = document.createElement('button');
  del.className = 'del-btn';
  del.textContent = t('del');
  del.addEventListener('click', function () {
    deleteTodo(todo.id);
  });

  li.appendChild(select);
  li.appendChild(info);
  li.appendChild(noteBtn);
  li.appendChild(del);

  if (openNotes.includes(todo.id)) {
    li.appendChild(buildNoteBox(todo));
  }
  return li;
}

function buildNoteBox(todo) {
  const box = document.createElement('div');
  box.className = 'note-box';

  // 文字
  const textarea = document.createElement('textarea');
  textarea.placeholder = t('notePlaceholder2');
  textarea.value = todo.note;
  textarea.addEventListener('input', function () {
    updateNoteText(todo.id, textarea.value);
  });
  box.appendChild(textarea);

  // 照片
  const grid = document.createElement('div');
  grid.className = 'photo-grid';
  todo.photos.forEach(function (src, index) {
    const cell = document.createElement('div');
    cell.className = 'photo-cell';

    const img = document.createElement('img');
    img.src = src;
    img.alt = 'photo';
    img.addEventListener('click', function () {
      document.getElementById('photo-viewer-img').src = src;
      document.getElementById('photo-viewer').hidden = false;
    });

    const delPhoto = document.createElement('button');
    delPhoto.className = 'photo-del';
    delPhoto.textContent = '×';
    delPhoto.addEventListener('click', function () {
      deletePhoto(todo.id, index);
    });

    cell.appendChild(img);
    cell.appendChild(delPhoto);
    grid.appendChild(cell);
  });
  box.appendChild(grid);

  // 加入照片按鈕（點文字就會開啟選擇檔案）
  const addLabel = document.createElement('label');
  addLabel.className = 'photo-add';
  addLabel.textContent = t('addPhoto');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
      addPhotos(todo.id, fileInput.files);
    }
  });
  addLabel.appendChild(fileInput);
  box.appendChild(addLabel);

  return box;
}
