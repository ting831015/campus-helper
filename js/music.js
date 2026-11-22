// 聲音：背景音樂 + 計時器提示音
// 背景音樂：點語言按鈕後開始播，回到選語言畫面時停止，標題列 🎵 按鈕可開關（會記住）
// 提示音：用 Web Audio API 直接產生「嗶」聲，不需要音樂檔

// ---------- 背景音樂 ----------
const BGM_FILE = 'music/bgm.mp3';   // 要換音樂，把檔案換掉或改這裡的檔名
const BGM_VOLUME = 0.3;             // 音量 0 ~ 1，0.3 = 30%

const bgm = new Audio(BGM_FILE);
bgm.loop = true;                    // 播完自動從頭再播
bgm.volume = BGM_VOLUME;

let musicOn = true;      // 使用者有沒有開音樂（存在 LocalStorage）
let bgmActive = false;   // 目前是不是在 app 裡面（選完語言後 = true，回到選語言畫面 = false）
let noiseOn = false;     // 使用者有沒有勾「讀書時播放白噪音」（存在 LocalStorage）
let noisePlaying = false;   // 白噪音現在是不是正在播
let noiseSource = null;  // 正在播的白噪音（停止時要用）

function initMusic() {
  musicOn = load('musicOn', true);
  document.getElementById('music-btn').addEventListener('click', toggleMusic);

  noiseOn = load('whiteNoiseOn', false);   // 白噪音預設關閉
  const noiseBox = document.getElementById('timer-noise');
  noiseBox.checked = noiseOn;
  noiseBox.addEventListener('change', toggleWhiteNoise);

  // 切到別的 App 或關螢幕時暫停，回來時再繼續
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      bgm.pause();
    } else if (bgmActive && musicOn) {
      playBgm();
    }
  });

  renderMusicBtn();
}

// 播放。play() 被瀏覽器擋住時不讓程式出錯（例如還沒點過畫面）
// 白噪音正在播的時候不播背景音樂，避免兩個聲音疊在一起
function playBgm() {
  if (noisePlaying) {
    return;
  }
  bgm.play().catch(function () {});
}

// 選完語言、進入 app 時呼叫（點按鈕 = 使用者點擊，瀏覽器才允許播放）
function startBgm() {
  bgmActive = true;
  if (musicOn) {
    playBgm();
  }
  renderMusicBtn();
}

// 回到選語言畫面時呼叫：停止並回到開頭
function stopBgm() {
  bgmActive = false;
  bgm.pause();
  bgm.currentTime = 0;
}

// 🎵 按鈕：開 ↔ 關
function toggleMusic() {
  musicOn = !musicOn;
  save('musicOn', musicOn);
  if (musicOn) {
    playBgm();
  } else {
    bgm.pause();
  }
  renderMusicBtn();
}

function renderMusicBtn() {
  const btn = document.getElementById('music-btn');
  btn.textContent = musicOn ? '🎵' : '🔇';
  btn.title = musicOn ? t('musicOn') : t('musicOff');
  btn.classList.toggle('off', !musicOn);
}

// ---------- 讀書白噪音（海浪聲） ----------
// 播放 music/ocean.mp3（由 elevenlabs.io 生成，頭尾已處理成可以無縫循環）
// 用 Web Audio API 播放，不用 <audio>：循環時不會有空白，而且休息結束自動回到讀書時也能播（手機的限制）
// 規則：使用者有勾 + 計時器在「讀書中」→ 播白噪音、背景音樂暫停
//       其他情況（休息、暫停、重設、取消勾選）→ 停止白噪音、背景音樂恢復（如果有開）

const NOISE_FILE = 'music/ocean.mp3';   // 要換聲音，把檔案換掉或改這裡的檔名
const NOISE_VOLUME = 0.6;               // 海浪聲音量 0 ~ 1
const NOISE_TRIM = 0.05;                // 循環時頭尾各略過 0.05 秒（mp3 檔頭尾可能有一小段空白，略過才不會斷一下）

let waveBuffer = null;     // 讀進來的海浪聲，第一次播放時讀取，之後重複使用
let waveLoading = false;   // 是不是正在讀取檔案（避免重複讀）
let noiseFallback = null;  // 備用播放器：讀不到檔案時（例如直接雙擊 index.html 打開）改用 <audio> 播放

// 勾選框：開 ↔ 關
function toggleWhiteNoise() {
  noiseOn = document.getElementById('timer-noise').checked;
  save('whiteNoiseOn', noiseOn);
  unlockBeep();          // 勾選也是使用者點擊，順便啟動聲音引擎
  updateWhiteNoise();
}

// 依照「有沒有勾」和「計時器狀態」決定播或停（timer.js 的 renderTimer() 每次都會呼叫）
function updateWhiteNoise() {
  if (noiseOn && timerState === STUDY) {   // timerState、STUDY 定義在 timer.js
    startWhiteNoise();
  } else {
    stopWhiteNoise();
  }
}

function startWhiteNoise() {
  if (noisePlaying) {
    return;   // 已經在播
  }

  // 備用方式：用 <audio> 播放（循環接縫可能沒那麼順，但一定有聲音）
  if (noiseFallback !== null) {
    noiseFallback.play().catch(function () {});
    noisePlaying = true;
    bgm.pause();   // 白噪音開始 → 背景音樂暫停
    return;
  }

  if (audioCtx === null) {
    return;   // 聲音引擎還沒啟動（還沒按過「開始」）
  }

  if (waveBuffer === null) {
    loadWaveBuffer();   // 還沒讀過檔案：先讀，讀完會再呼叫 updateWhiteNoise() 開始播
    return;
  }

  noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = waveBuffer;
  noiseSource.loop = true;   // 播完從頭再播
  noiseSource.loopStart = NOISE_TRIM;
  noiseSource.loopEnd = waveBuffer.duration - NOISE_TRIM;

  const gain = audioCtx.createGain();
  gain.gain.value = NOISE_VOLUME;

  noiseSource.connect(gain);
  gain.connect(audioCtx.destination);
  noiseSource.start(0, NOISE_TRIM);

  noisePlaying = true;
  bgm.pause();   // 白噪音開始 → 背景音樂暫停
}

// 讀取海浪聲檔案（只讀一次）
// 注意：要用 Live Server 或放上網路才讀得到；直接雙擊 index.html 打開會讀取失敗（瀏覽器的安全限制）
function loadWaveBuffer() {
  if (waveLoading) {
    return;
  }
  waveLoading = true;

  fetch(NOISE_FILE)
    .then(function (response) {
      return response.arrayBuffer();
    })
    .then(function (data) {
      // decodeAudioData：把 mp3 解碼成可以播放的聲音資料
      // 用「callback」寫法，舊版 iPhone Safari 也支援
      return new Promise(function (resolve, reject) {
        audioCtx.decodeAudioData(data, resolve, reject);
      });
    })
    .then(function (buffer) {
      waveBuffer = buffer;
      waveLoading = false;
      updateWhiteNoise();   // 讀完了，如果還在讀書中就開始播
    })
    .catch(function () {
      // 讀取失敗（通常是直接雙擊 index.html 打開，瀏覽器不讓程式讀檔）→ 改用備用播放器
      waveLoading = false;
      noiseFallback = new Audio(NOISE_FILE);
      noiseFallback.loop = true;
      noiseFallback.volume = NOISE_VOLUME;
      updateWhiteNoise();   // 如果還在讀書中就用備用方式開始播
    });
}

function stopWhiteNoise() {
  if (!noisePlaying) {
    return;
  }
  if (noiseFallback !== null) {
    noiseFallback.pause();
  } else {
    noiseSource.stop();
    noiseSource = null;
  }
  noisePlaying = false;

  // 白噪音停止 → 背景音樂恢復（使用者有開音樂、在 app 裡面、畫面沒被切走）
  if (bgmActive && musicOn && !document.hidden) {
    playBgm();
  }
}

// ---------- 計時器提示音 ----------
let audioCtx = null;   // Web Audio 的「聲音引擎」，第一次按「開始」時建立

// 在按「開始」時呼叫：手機規定聲音引擎要在使用者點擊時啟動，之後計時結束才能自己發聲
function unlockBeep() {
  const AC = window.AudioContext || window.webkitAudioContext;   // 舊版 Safari 用 webkit 開頭的名字
  if (!AC) {
    return;   // 瀏覽器不支援就不響，不影響計時
  }
  if (audioCtx === null) {
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 響 times 聲「嗶」
function playBeep(times) {
  if (audioCtx === null) {
    return;
  }
  const now = audioCtx.currentTime;
  for (let i = 0; i < times; i++) {
    const start = now + i * 0.35;          // 每聲間隔 0.35 秒
    const osc = audioCtx.createOscillator();   // 產生固定音高的聲音
    const gain = audioCtx.createGain();        // 控制音量
    osc.type = 'sine';
    osc.frequency.value = 880;             // 880 Hz，清楚但不刺耳
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);   // 很快變大聲
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25); // 再慢慢變小，避免「啪」聲
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  }
}
