// 共用：LocalStorage 存取
// 所有模組都透過 save / load 存取資料，不直接操作 localStorage

const STORAGE_PREFIX = 'clh_';

function save(key, data) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('save failed:', key, err);
    return false;
  }
}

function load(key, defaultValue) {
  try {
    const text = localStorage.getItem(STORAGE_PREFIX + key);
    if (text === null) {
      return defaultValue;
    }
    return JSON.parse(text);
  } catch (err) {
    console.error('load failed:', key, err);
    return defaultValue;
  }
}
