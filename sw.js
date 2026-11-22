// 離線功能：service worker
// service worker = 瀏覽器在背景執行的小程式，可以攔截 app 對檔案的請求
// 做法：
//   1. 第一次打開 app 時，把所有檔案存一份到手機裡（Cache Storage，瀏覽器的檔案快取空間）
//   2. 之後每次要檔案：先從網路抓最新版（順便更新手機裡的備份）
//      → 網路抓不到（沒網路）才用手機裡的備份
//   這樣有網路時永遠是最新版，沒網路時也打得開

// 改了檔案清單或想強制大家重新下載全部檔案時，把 v1 改成 v2、v3...
const CACHE_NAME = 'clh-v1';

// 要存到手機裡的檔案（新增 js 檔、圖片、音樂時，這裡也要加上去）
const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/storage.js',
  'js/i18n.js',
  'js/utils.js',
  'js/music.js',
  'js/todo.js',
  'js/expense.js',
  'js/calendar.js',
  'js/subjects.js',
  'js/timer.js',
  'js/main.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'music/bgm.mp3',
  'music/ocean.mp3'
];

// ---------- 安裝：第一次打開 app 時，把檔案全部存起來 ----------
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // 一個一個存：某個檔案下載失敗，其他檔案還是會存起來
      return Promise.all(FILES.map(function (file) {
        return cache.add(file).catch(function () {});
      }));
    })
  );
  self.skipWaiting();   // 新版 service worker 裝好就立刻使用，不用等使用者關掉 app
});

// ---------- 啟用：刪掉舊版本的備份 ----------
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name !== CACHE_NAME) {
          return caches.delete(name);
        }
      }));
    }).then(function () {
      return self.clients.claim();   // 已經打開的頁面也立刻交給這個 service worker 管
    })
  );
});

// ---------- 攔截檔案請求：先網路、後備份 ----------
self.addEventListener('fetch', function (event) {
  const request = event.request;

  // 只處理「讀取」和「自己網站的檔案」，其他（例如外部網站）不管
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // 音樂用 <audio> 播放時，瀏覽器會用 Range（只要檔案的某一段）來要檔案，要另外處理
  if (request.headers.has('range')) {
    event.respondWith(rangeResponse(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(function (response) {
        // 網路抓到了：存一份到手機裡，再交給 app
        if (response.ok) {
          const copy = response.clone();   // response 只能讀一次，所以複製一份存起來
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        // 網路抓不到（沒網路）：用手機裡的備份
        return caches.match(request, { ignoreSearch: true }).then(function (cached) {
          if (cached) {
            return cached;
          }
          // 開啟頁面但找不到備份：改給首頁
          if (request.mode === 'navigate') {
            return caches.match('index.html');
          }
          return Response.error();
        });
      })
  );
});

// 處理 Range 請求（音樂檔）：先試網路；沒網路時，從手機裡的完整檔案切出要的那一段
function rangeResponse(request) {
  return fetch(request).catch(function () {
    return caches.match(request.url, { ignoreSearch: true }).then(function (cached) {
      if (!cached) {
        return Response.error();
      }
      return cached.arrayBuffer().then(function (data) {
        // Range 的格式：bytes=開始-結束，例如 bytes=0-1023；結束可以省略（代表到檔案最後）
        const match = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range'));
        const start = match && match[1] ? Number(match[1]) : 0;
        const end = match && match[2] ? Number(match[2]) : data.byteLength - 1;
        const part = data.slice(start, end + 1);
        return new Response(part, {
          status: 206,   // 206 = 只回傳檔案的一部分
          headers: {
            'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
            'Content-Range': 'bytes ' + start + '-' + end + '/' + data.byteLength,
            'Content-Length': String(part.byteLength)
          }
        });
      });
    });
  });
}
