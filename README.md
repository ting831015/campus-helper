# Campus Life Helper — 開發說明（給接手修改的組員）

這份文件說明目前雛形的結構、資料格式和修改方式。修改程式前請先讀完「修改前必讀」。

---

## 目錄

1. [這個 app 是什麼](#1-這個-app-是什麼)
2. [怎麼在電腦上跑起來](#2-怎麼在電腦上跑起來)
3. [資料夾結構](#3-資料夾結構)
4. [程式怎麼運作](#4-程式怎麼運作)
5. [各模組說明與資料格式](#5-各模組說明與資料格式)
6. [中英文切換（i18n）](#6-中英文切換i18n)
7. [修改前必讀](#7-修改前必讀)
8. [常見修改範例](#8-常見修改範例)
9. [測試清單](#9-測試清單)
10. [上傳到 GitHub Pages](#10-上傳到-github-pages)
11. [已知限制](#11-已知限制)
12. [名詞解釋](#12-名詞解釋)

---

## 1. 這個 app 是什麼

給大學生用的生活小幫手，任何學校都能用。網頁 app，只用 **HTML / CSS / JavaScript**，**沒有後端、沒有資料庫**，資料存在使用者自己的瀏覽器（LocalStorage）。

| 功能 | 說明 |
|---|---|
| 選語言畫面 | 一打開先選「中文版」或「English」 |
| 待辦事項 | 狀態手動選：未完成（黃）／緊急（紅）／已完成（綠）；可選截止日；每筆可加備註文字和照片 |
| 行事曆 | 月曆檢視；行程有日期和時間（時:分） |
| 記帳 | 分類記帳；當月總額、分類長條圖、每日堆疊長條圖、每日明細 |
| 讀書計時 | 番茄鐘（讀書／休息循環）；今日、本週讀書分鐘數；換階段有提示音；可選讀書時播放白噪音（海浪聲）；可自訂科目，顯示今日科目比例圓餅圖 |
| 背景音樂 | 選完語言開始播；標題列 🎵 按鈕可開關 |

不需要安裝任何套件，也不需要網路就能在電腦上跑（圖表是用 HTML/CSS 畫的，沒有用外部圖表套件）。

---

## 2. 怎麼在電腦上跑起來

1. 安裝 [VS Code](https://code.visualstudio.com/)
2. VS Code 左邊「Extensions」（延伸模組）搜尋 **Live Server**（作者 Ritwick Dey），安裝
3. VS Code 選 File → Open Folder，打開 `campus-helper` 資料夾（**要打開資料夾，不是只打開單一檔案**）
4. 在 `index.html` 上按右鍵 → **Open with Live Server**
5. 瀏覽器會自動打開 app。之後改程式、存檔（Ctrl+S），瀏覽器會自動重新整理

除錯：瀏覽器按 **F12** → **Console** 分頁，程式出錯會在這裡顯示紅字。

模擬手機畫面：F12 後按左上角的手機圖示（Toggle device toolbar），可以選 iPhone、Pixel 等尺寸。

---

## 3. 資料夾結構

```
campus-helper/
├─ index.html          所有畫面（選語言、選單、四個功能頁）都在這一個檔案
├─ manifest.json       手機「加到主畫面」用的設定（名稱、圖示、顏色）
├─ sw.js               離線功能（service worker），沒網路也能打開
├─ README.md           本文件
├─ css/
│  └─ style.css        所有樣式
├─ js/
│  ├─ storage.js       存檔／讀檔（LocalStorage）
│  ├─ i18n.js          中英文字典與切換
│  ├─ utils.js         共用小工具（日期轉字串、產生 id 等）
│  ├─ music.js         背景音樂、讀書白噪音、計時提示音
│  ├─ todo.js          待辦事項
│  ├─ expense.js       記帳
│  ├─ calendar.js      行事曆
│  ├─ subjects.js      讀書科目、今日科目圓餅圖
│  ├─ timer.js         讀書計時
│  └─ main.js          畫面切換、按鈕綁定、啟動所有模組（最後載入）
├─ icons/              app 圖示（加到主畫面用）
└─ music/
   ├─ bgm.mp3          背景音樂（原創，無授權問題）
   └─ ocean.mp3        讀書白噪音：海浪聲（elevenlabs.io 生成，需標註來源）
```

### js 檔案的載入順序（很重要）

`index.html` 最下面依序載入：

```
storage → i18n → utils → music → todo → expense → calendar → subjects → timer → main
```

後面的檔案會用到前面檔案的函式（例如每個模組都用 `save()`、`t()`），所以：

- **新增 js 檔要放在 `main.js` 前面**
- **不要調換現有順序**

---

## 4. 程式怎麼運作

### 畫面流程

```
選語言畫面 (#splash)
   │ 點「中文版」或「English」
   ▼
選單 (#menu) ──點按鈕──▶ 功能頁 (#tab-todo / #tab-calendar / #tab-expense / #tab-timer)
   ▲                         │
   └──────── 返回 ◀──────────┘
選單按「返回」→ 回到選語言畫面
```

- 所有畫面都寫在 `index.html`，用 `hidden` 屬性決定顯示哪一個
- 切換畫面的函式是 `main.js` 的 `showTab(tabId)`

### 每個模組的共同寫法

每個模組都用同一個模式，改程式時照這個模式寫：

```
資料陣列（例如 todos）
   │
   ├─ initXxx()     啟動時：從 LocalStorage 讀資料、綁定按鈕
   ├─ addXxx()      使用者新增 → 改陣列 → save() 存檔 → renderXxx()
   ├─ deleteXxx()   使用者刪除 → confirm() 確認 → 改陣列 → save() → renderXxx()
   └─ renderXxx()   清空畫面 → 依照陣列重新畫出全部內容
```

**重點：只改資料，然後呼叫 `renderXxx()` 重畫。不要直接去改畫面上的某一個元素。** 這樣畫面永遠跟資料一致。

---

## 5. 各模組說明與資料格式

### LocalStorage 存檔一覽

所有存檔名稱前面會自動加上 `clh_`（`storage.js` 的 `STORAGE_PREFIX`）。

| 存檔名稱（key） | 實際名稱 | 哪個檔案 | 內容 |
|---|---|---|---|
| `todos` | `clh_todos` | todo.js | 待辦陣列 |
| `events` | `clh_events` | calendar.js | 行程陣列 |
| `expenses` | `clh_expenses` | expense.js | 記帳陣列 |
| `timerSettings` | `clh_timerSettings` | timer.js | `{ studyMin, breakMin }` |
| `studySessions` | `clh_studySessions` | timer.js | 讀書紀錄陣列 |
| `musicOn` | `clh_musicOn` | music.js | `true` / `false` |
| `whiteNoiseOn` | `clh_whiteNoiseOn` | music.js | `true` / `false`（預設 `false`） |
| `studySubjects` | `clh_studySubjects` | subjects.js | 科目名稱陣列，例如 `['ALU', 'OS']` |
| `currentSubject` | `clh_currentSubject` | subjects.js | 目前選的科目，`''` = 未分類 |

查看存檔內容：F12 → **Application** 分頁 → 左邊 Local Storage → 點網址。

### 待辦事項 `todo.js`

```js
{
  id: 1763690400000,         // 由 makeId() 產生，不會重複
  title: '交 AOS HW3',
  deadline: '2026-11-25',    // 'YYYY-MM-DD'；空字串 '' = 沒有截止日
  status: 'urgent',          // 'todo' 未完成 / 'urgent' 緊急 / 'done' 已完成
  note: '備註文字',
  photos: ['data:image/jpeg;base64,...']   // 壓縮後的照片（文字格式）
}
```

- 列表排序：緊急 → 未完成 → 已完成；同狀態再依截止日（沒截止日排最後）
- 照片會壓縮：最長邊 `PHOTO_MAX_SIZE = 1024` 像素、JPEG 品質 `PHOTO_QUALITY = 0.7`
- 存檔失敗（空間滿了）會取消剛加的照片並跳出提示
- `initTodo()` 裡有一段把舊格式 `{ done: true/false }` 轉成 `status` 的程式，不要刪

### 行事曆 `calendar.js`

```js
{ id: ..., title: '小組討論', date: '2026-11-24', time: '14:30' }   // time 是 24 小時制
```

- 月曆從**星期日**開始排
- 點日期格子 → 下方列出當天行程（依時間排序）
- 有行程的日期會有小圓點

### 記帳 `expense.js`

```js
{ id: ..., amount: 125, category: '餐費', date: '2026-11-21', note: '午餐' }
```

- 分類清單：`EXPENSE_CATEGORIES = ['餐費', '交通', '文具', '娛樂', '其他']`
- 分類顏色：`CATEGORY_COLORS`
- **分類一律用中文存檔**，英文版只是顯示時翻譯（`catLabel()`），所以切換語言資料不會亂
- 圖表都是 HTML/CSS 畫的：
  - `renderCategoryChart()` 分類橫條圖
  - `renderDayChart()` 每日直條圖（依分類堆疊，滑鼠移上去顯示金額）
  - `DAY_CHART_HEIGHT = 140` 直條圖最高高度（像素）

### 讀書計時 `timer.js`

用 **FSM（有限狀態機）** 寫：

```
IDLE（準備開始）──開始──▶ STUDY（讀書中）──時間到──▶ BREAK（休息中）──時間到──▶ STUDY ...
                            │ 暫停                     │ 暫停
                            ▼                          ▼
                          PAUSED ────── 開始（回到暫停前的狀態）
任何狀態按「重設」→ IDLE
```

- 剩餘時間用「結束時間點 `endTime` − 現在時間」計算，不是每秒減 1，所以不會越跑越不準
- `tick()` 每秒執行一次；如果手機休眠很久才回來，`while` 迴圈會一次補算經過的階段
- 每完成一段讀書時間，`recordSession()` 記一筆：`{ date, minutes, subject }`
  - `subject` 是「完成那一刻」選的科目；`''` = 未分類
  - 舊紀錄沒有 `subject` 欄位，一律當成未分類（不需要轉換舊資料）
- 一週從**星期一**開始算（`mondayString()`）
- 換階段時響提示音：開始休息響 2 聲、開始讀書響 3 聲（`playBeep()`）

### 讀書科目與圓餅圖 `subjects.js`

- 科目由使用者在計時頁自己新增／刪除（`addSubject()`、`deleteSubject()`），下拉選單選這次讀哪一科
- 刪除科目**不會刪掉已記錄的時間**，圓餅圖仍會顯示該科目
- `renderStudyPie()`：加總**今天**每個科目的分鐘數，用 CSS 的 `conic-gradient` 畫圓餅（不用圖表套件）；右邊列出分鐘與百分比
  - 由 `timer.js` 的 `renderTimer()` 呼叫，所以完成一段讀書時間後會自動更新
  - 只算「完成」的讀書時段；讀到一半按重設不會記錄
- 顏色：`SUBJECT_COLORS`，依今天第一次出現的順序分配
- 版面：螢幕寬度 1300px 以上（電腦），圓餅圖卡片移到計時器左邊並放大；手機維持在頁面最下面（`style.css` 最後的 `@media (min-width: 1300px)`）

### 聲音 `music.js`

- 背景音樂：`BGM_FILE = 'music/bgm.mp3'`、音量 `BGM_VOLUME = 0.3`
- 瀏覽器規定「使用者點過畫面才能出聲音」，所以音樂在**點語言按鈕時**才開始播（`startBgm()`），回到選語言畫面時停止（`stopBgm()`）
- 切到別的 App 時暫停，回來時繼續
- 提示音用 **Web Audio API** 直接產生，不需要音樂檔；聲音引擎在按計時「開始」時啟動（`unlockBeep()`）
- 🎵 按鈕只控制背景音樂，不影響提示音和白噪音
- **讀書白噪音**：計時頁的勾選框「讀書時播放白噪音」，預設不勾
  - 有勾 ＋ 計時器在「讀書中」→ 播白噪音，**背景音樂自動暫停**
  - 休息、暫停、重設、取消勾選 → 白噪音停止，背景音樂恢復（如果 🎵 是開的）
  - 白噪音播放期間按 🎵 打開音樂，不會馬上播，等白噪音停止才播（避免兩個聲音疊在一起）
  - 聲音是**海浪聲**：播放 `music/ocean.mp3`（由 elevenlabs.io 免費方案生成，**依規定要標註來源**，計時頁勾選框下方已標註，報告也要寫）
  - 檔案頭尾已做交叉淡化（crossfade），可以無縫循環；用 Web Audio API 播放（`loadWaveBuffer()` 讀檔、`startWhiteNoise()` 播放）
  - 可調整：檔名 `NOISE_FILE`、音量 `NOISE_VOLUME`
  - 換成別的聲音：把新檔案改名成 `ocean.mp3` 覆蓋即可，但頭尾沒處理過的話，循環時接縫處可能會不順；並記得更新來源標註（`i18n.js` 的 `noiseCredit`）
  - 讀檔用 `fetch()`；直接雙擊 `index.html` 打開時瀏覽器不讓程式讀檔，會自動改用備用方式（`<audio>`，變數 `noiseFallback`）播放，一樣有聲音，但循環接縫可能沒那麼順。正式使用建議用 Live Server 或 GitHub Pages
  - 開關判斷寫在 `updateWhiteNoise()`，由 `timer.js` 的 `renderTimer()` 每次呼叫

### 離線功能 `sw.js`

- **service worker**：瀏覽器在背景執行的小程式，可以攔截 app 對檔案的請求
- 第一次打開時，把 `FILES` 清單裡的檔案全部存到手機（Cache Storage）
- 之後每次要檔案：**先從網路抓最新版並更新備份；沒網路才用備份**，所以重新上傳後大家有網路時就會拿到新版
- 音樂用 `<audio>` 播放時瀏覽器會用 Range 請求（只要檔案的一段），沒網路時由 `rangeResponse()` 從備份切出那一段
- 在 `main.js` 最後註冊；只有 https（GitHub Pages）或 Live Server 有效，直接雙擊 `index.html` 打開時會自動略過
- **新增檔案（js、圖片、音樂）時，要把路徑加進 `sw.js` 的 `FILES`**，不然離線時會少那個檔案
- 想強制大家重新下載全部檔案：把 `CACHE_NAME` 的 `clh-v1` 改成 `clh-v2`

### 共用工具 `utils.js`

| 函式 | 用途 |
|---|---|
| `dateToString(d)` | Date → `'YYYY-MM-DD'`（用本地時間） |
| `makeId(list)` | 產生不會跟 list 裡重複的 id |
| `weekdayName(dateStr)` | 日期 → 星期幾（依目前語言） |
| `shortDateText(dateStr)` | 日期 → `11/21（六）` 或 `11/21 (Sat)` |

---

## 6. 中英文切換（i18n）

所有畫面上的文字都放在 `i18n.js` 的 `I18N` 字典，**中文（`zh`）和英文（`en`）兩邊都要有同一個 key**。

### HTML 裡的固定文字

```html
<h2 data-i18n="todoHeading">待辦事項</h2>
<input data-i18n-placeholder="todoPlaceholder">
```

選語言時 `applyLanguage()` 會自動把這些換成對應語言。

### JS 裡產生的文字

```js
t('todoEmpty')                                  // 一般文字
tf('deadlinePrefix', { date: d, left: text })   // 有變數的文字，字典裡寫成 '截止 {date}（{left}）'
catLabel('餐費')                                 // 記帳分類，英文版顯示 Food
```

### 新增一段文字的步驟

1. `i18n.js` 的 `zh: { ... }` 裡加一行，例如 `myText: '我的文字',`
2. `en: { ... }` 裡**同一個 key** 加英文，例如 `myText: 'My text',`
3. HTML 用 `data-i18n="myText"`，或 JS 用 `t('myText')`

**只加中文沒加英文，英文版會顯示 `undefined`。**

---

## 7. 修改前必讀

### ❌ 不要改（改了使用者的舊資料會「看不到」）

- `storage.js` 的 `STORAGE_PREFIX = 'clh_'`
- 各模組 `save()` / `load()` 用的存檔名稱（`'todos'`、`'events'`、`'expenses'`...）
- 資料欄位名稱（例如把 `status` 改成 `state`）

如果真的要改資料格式，要像 `initTodo()` 那樣**寫一段轉換舊資料的程式**。

### ✅ 寫程式的規則

| 規則 | 原因 |
|---|---|
| 使用者輸入的文字用 `textContent` 顯示，**不要用 `innerHTML`** | 防止使用者輸入 HTML 程式碼搞壞畫面（XSS 攻擊） |
| 新增資料的 id 用 `makeId(陣列)`，不要直接用 `Date.now()` | 同一毫秒新增兩筆會 id 重複，刪一筆會刪到兩筆 |
| 日期用 `dateToString()`，不要用 `toISOString()` | `toISOString()` 是 UTC 時間，台灣早上 8 點前會變成前一天 |
| 刪除前用 `confirm()` 確認 | 避免誤刪 |
| 改完資料要 `save()` 再 `renderXxx()` | 確保存檔和畫面一致 |
| 新文字中英文都要加 | 見第 6 節 |

### 修改流程建議

1. 改之前先備份整個資料夾（或用 Git）
2. 一次只改一個地方，改完立刻在瀏覽器測
3. 打開 F12 Console，確認沒有紅字
4. 中文版、英文版都要測

---

## 8. 常見修改範例

### 範例 1：記帳新增分類「油費」（改 3 個地方）

**① `expense.js` 分類清單**
```js
const EXPENSE_CATEGORIES = ['餐費', '交通', '油費', '文具', '娛樂', '其他'];
```

**② `expense.js` 分類顏色**
```js
const CATEGORY_COLORS = {
  '餐費': '#e8833a',
  '交通': '#3b6ea5',
  '油費': '#f0ad4e',     // 新增
  ...
};
```

**③ `i18n.js` 兩邊的 `categories` 都要加**
```js
// zh
categories: { '餐費': '餐費', '交通': '交通', '油費': '油費', ... }
// en
categories: { '餐費': 'Food', '交通': 'Transport', '油費': 'Gas', ... }
```

### 範例 2：改計時器預設時間

`timer.js` 有**兩個地方**寫 `{ studyMin: 25, breakMin: 5 }`（第一次宣告、`initTimer()` 的 `load` 預設值），兩個都要改。
注意：已經改過設定的使用者會沿用他自己存的值，不受預設值影響。

### 範例 3：換背景音樂

把新的 mp3 改名成 `bgm.mp3`，覆蓋 `music/bgm.mp3`。程式不用改。
建議檔案 3 MB 以內（手機打開才不會等太久），並確認音樂可以合法使用。

### 範例 4：改顏色

| 要改的東西 | 位置 |
|---|---|
| 主色（標題列、按鈕的藍色 `#3b6ea5`） | `style.css` 搜尋 `#3b6ea5`；`manifest.json` 的 `theme_color`；`index.html` 的 `theme-color` |
| 待辦三種狀態顏色 | `style.css` 搜尋 `todo`、`urgent`、`done` |
| 記帳分類顏色 | `expense.js` 的 `CATEGORY_COLORS` |

### 範例 5：新增一個功能模組（例如「課表」）

1. **`index.html` 選單**加一個按鈕：
   ```html
   <button class="menu-btn" data-tab="tab-schedule">
     <span class="menu-title" data-i18n="menuSchedule">課表</span>
     <span class="menu-sub" data-i18n="menuScheduleSub">Schedule</span>
   </button>
   ```
2. **`index.html`** 在其他 `<section class="tab-panel">` 旁邊加功能頁：
   ```html
   <section id="tab-schedule" class="tab-panel" hidden>
     <h2 data-i18n="scheduleHeading">課表</h2>
     <!-- 這個功能的畫面 -->
   </section>
   ```
   `data-tab` 和 `section` 的 `id` 要一樣。
3. **新增 `js/schedule.js`**，照第 4 節的模式寫 `initSchedule()`、`renderSchedule()` 等。存檔名稱取一個新的，例如 `save('schedule', ...)`。
4. **`index.html`** 在 `main.js` **前面**加 `<script src="js/schedule.js"></script>`
5. **`main.js`**：
   - 最下面加 `initSchedule();`
   - 點語言按鈕的程式裡，跟 `renderTodo();` 等放在一起，加 `renderSchedule();`（切換語言時重畫）
6. **`i18n.js`** 中英文都加上用到的文字（`menuSchedule`、`menuScheduleSub`、`scheduleHeading`...）
7. **`sw.js`** 的 `FILES` 加上 `'js/schedule.js'`（離線時才有這個檔案）
8. 需要的話在 `style.css` 加樣式

返回按鈕和畫面切換不用改，`showTab()` 會自動處理。

### 用 AI 協助修改

可以把相關檔案（通常是 `index.html` + 要改的 js + `i18n.js`）和本文件一起給 AI，並說明：

> 這是一個純 HTML/CSS/JS 的網頁 app，沒有後端，資料存在 LocalStorage。請只修改我要求的部分，不要改變其他程式的邏輯和變數名稱，不要改存檔名稱和資料格式。新文字中英文都要加到 i18n.js。請列出修改前和修改後的程式碼。

AI 改完後，照第 9 節測試清單測過再採用。

---

## 9. 測試清單

每次修改後至少跑一次：

- [ ] F12 Console 沒有紅字
- [ ] 選語言畫面 → 中文版、English 都能進入
- [ ] 選單 4 個按鈕都能進入對應功能，「返回」正常
- [ ] 選單按「返回」回到選語言畫面，音樂停止
- [ ] 待辦：新增（有／沒有截止日）、改狀態、刪除（會跳確認）、備註文字、加照片、刪照片
- [ ] 行事曆：新增行程、切換月份、點日期看行程、刪除
- [ ] 記帳：新增、刪除、切換月份、圖表和每日明細正確
- [ ] 計時：開始、暫停、繼續、重設；把讀書／休息設成 1 分鐘，確認換階段和提示音
- [ ] 🎵 按鈕開關音樂；重新整理後設定還在
- [ ] 新增科目（含重複名稱會提示）、刪除科目；讀完一段後圓餅圖和百分比正確；中英文都正常
- [ ] 勾選白噪音 → 開始讀書：白噪音響、背景音樂停；暫停／休息：白噪音停、背景音樂恢復
- [ ] **重新整理頁面，所有資料都還在**
- [ ] 有網路打開一次後，關掉網路（飛航模式）再打開，app 仍正常
- [ ] 中文版、英文版文字都正常（沒有 `undefined`）
- [ ] F12 手機模式看版面，沒有需要左右滑的情況

---

## 10. 上傳到 GitHub Pages

讓手機可以用網址打開，並「加到主畫面」。

1. GitHub 建立 **Public** repo，例如 `campus-helper`
2. Add file → Upload files，把 `campus-helper` **資料夾裡面的東西**拖進去（`index.html` 要在最外層），Commit changes
3. Settings → Pages → Source 選 **Deploy from a branch** → Branch 選 **main**、**/ (root)** → Save
4. 等 1～3 分鐘，網址是 `https://帳號.github.io/campus-helper/`
5. 手機：Android 用 Chrome 選單「加到主畫面」；iPhone 用 Safari「分享 → 加入主畫面」

更新程式：重新上傳改過的檔案（同名會覆蓋）→ Commit → 等 1～3 分鐘。

**網址定下來後不要改 repo 名稱或帳號**，網址變了，使用者手機上的資料會看不到。

---

## 11. 已知限制

| 限制 | 說明 |
|---|---|
| 資料只存在單一裝置 | 換手機、換瀏覽器、清除瀏覽器資料，資料就不見；不同人之間不共用 |
| 存檔空間約 5 MB | 照片已壓縮，但放很多張還是會滿，滿了會跳提示 |
| 備註是明文 | 沒有加密，不要存真的帳號密碼 |
| 第一次打開需要網路 | 第一次打開時才會把檔案存到手機，之後沒網路也能用 |
| iPhone 主畫面版和 Safari 版資料分開 | 加到主畫面後固定從圖示打開 |
| 計時器在背景可能暫停 | 手機鎖螢幕或切 App 時，瀏覽器可能暫停程式；回來後會補算，但提示音可能沒響 |
| 背景音樂要點過畫面才能播 | 瀏覽器規定，無法改 |
| 記帳每日直條圖的日期字很小 | 手機上 1～31 擠在一起，較難閱讀 |

---

## 12. 名詞解釋

| 名詞 | 意思 |
|---|---|
| LocalStorage | 瀏覽器內建的小型存檔空間，只能存文字，關掉瀏覽器資料還在 |
| render | 依照資料把畫面重新畫出來 |
| i18n | internationalization（國際化）的縮寫，指多語言支援 |
| FSM | Finite State Machine，有限狀態機：用「狀態」和「事件」描述程式行為 |
| data URL | 把圖片轉成一長串文字，才能存進 LocalStorage |
| Web Audio API | 瀏覽器內建的聲音功能，可以用程式直接產生聲音 |
| manifest | 給手機看的 app 設定檔（名稱、圖示、顏色） |
| GitHub Pages | GitHub 的免費網頁空間 |
| XSS | 惡意程式碼透過使用者輸入塞進網頁的攻擊方式 |
| Live Server | VS Code 擴充功能，開一個本機網頁伺服器，存檔自動重新整理 |
