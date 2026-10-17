const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

function load({ os = 'android', status = 0, grant = false, storage = new Map(), failDisplay = false } = {}) {
  const calls = { requests: 0, alerts: 0, settings: 0, notifications: 0 };
  const notifee = {
    createChannel: async () => {},
    getNotificationSettings: async () => ({ authorizationStatus: status }),
    requestPermission: async () => { calls.requests++; if (grant) status = 1; },
    openNotificationSettings: async () => { calls.settings++; },
    displayNotification: async () => {
      if (failDisplay) throw Error('Display failed');
      calls.notifications++;
    },
  };
  const context = { exports: {}, console, require(name) {
    if (name === 'react-native') return {
      Platform: { OS: os, Version: 33 },
      PermissionsAndroid: {
        PERMISSIONS: { POST_NOTIFICATIONS: 'post_notifications' },
        request: async () => { calls.requests++; if (grant) status = 1; },
      },
      Alert: { alert: (title, body, buttons) => { calls.alerts++; buttons[0].onPress(); } },
    };
    if (name === '@notifee/react-native') return {
      default: notifee, AndroidImportance: { HIGH: 4 }, AndroidVisibility: { PUBLIC: 1 },
      AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0, NOT_DETERMINED: -1 },
    };
    if (name.includes('firebase/messaging')) return { getMessaging: () => ({}) };
    if (name.includes('async-storage')) return { default: {
      getItem: async key => storage.get(key) || null,
      setItem: async (key, value) => storage.set(key, value),
    } };
    if (name.includes('Config/API')) return {};
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/Notification.js', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return { check: context.exports.ensureNotificationPermission, welcome: context.exports.sendWelcomeNotificationOnce, calls };
}

(async () => {
  for (const status of [1, 2]) {
    const test = load({ status });
    assert.equal(await test.check(), true);
    assert.equal(test.calls.requests + test.calls.alerts, 0);
  }
  const granted = load({ grant: true });
  assert.equal(await granted.check(), true);
  assert.equal(granted.calls.requests, 1);
  assert.equal(granted.calls.alerts, 0);
  assert.equal(granted.calls.notifications, 1);
  await granted.check();
  assert.equal(granted.calls.notifications, 1, 'Welcome does not repeat on reopen');
  const denied = load();
  await Promise.all([denied.check(), denied.check()]);
  assert.equal(denied.calls.alerts, 1, 'Concurrent checks share one prompt');
  await denied.check();
  assert.equal(denied.calls.alerts, 2, 'A later app open prompts again after denial');
  assert.equal(denied.calls.notifications, 0, 'Denied users receive no welcome');
  const storage = new Map();
  const firstOpen = load({ status: 1, storage });
  await Promise.all([firstOpen.welcome(), firstOpen.welcome()]);
  assert.equal(firstOpen.calls.notifications, 1, 'Concurrent calls send one welcome');
  const nextLaunch = load({ status: 1, storage });
  await nextLaunch.check();
  assert.equal(nextLaunch.calls.notifications, 0, 'Welcome flag survives app restarts');
  const failedStorage = new Map();
  await load({ status: 1, storage: failedStorage, failDisplay: true }).check();
  assert.equal(failedStorage.size, 0, 'Failed display does not mark welcome sent');
  const retry = load({ status: 1, storage: failedStorage });
  await retry.check();
  assert.equal(retry.calls.notifications, 1, 'Failed welcome retries on next open');
  const iosDenied = load({ os: 'ios' });
  assert.equal(await iosDenied.check(), false);
  assert.equal(iosDenied.calls.requests, 0, 'Denied iOS permissions require Settings');
  assert.equal(iosDenied.calls.alerts, 1);
  const iosNew = load({ os: 'ios', status: -1, grant: true });
  assert.equal(await iosNew.check(), true);
  assert.equal(iosNew.calls.requests, 1);
  console.log('Passed: permissions, welcome after grant, no duplicates across restarts, and failed-display retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
