const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadService({ verifyFailure = false, processResult = 'PROCESSED: success', cancel = false, nativeMissing = false } = {}) {
  const calls = [], pending = [], cleared = [];
  const source = ts.transpileModule(fs.readFileSync('src/services/RazorpayService.js', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = { exports: {}, console, require: (name) => {
    if (name === 'react-native') return { NativeModules: {}, TurboModuleRegistry: {
      get: () => nativeMissing ? null : { open: () => {} },
    } };
    if (name.includes('PaymentLogger')) {
      const logger = { exports: {}, console };
      vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/PaymentLogger.js', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      }).outputText, logger);
      return logger.exports;
    }
    if (name === 'react-native-razorpay') return { default: { open: async (options) => {
      assert.equal(options.amount, 10000);
      assert.equal(options.order_id, 'order_1');
      if (cancel) throw { code: 0, description: JSON.stringify({ error: { code: 'BAD_REQUEST_ERROR', description: 'undefined', reason: 'payment_error' } }) };
      return { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' };
    } } };
    if (name.includes('async-storage')) return { default: { setItem: async () => {} } };
    if (name.includes('Config/API')) return { API_BASE_URL: 'https://backend/api/v1' };
    if (name.includes('PaymentUtils')) return {
      savePendingPayment: async (record) => pending.push(record),
      clearPendingPayment: async (id) => cleared.push(id),
      fetchWithTimeout: async (url, options) => {
        calls.push({ url, ...options });
        assert.equal(options.headers.Authorization, 'Bearer token');
        if (url.includes('verify-payment') && verifyFailure) throw Error('Offline');
        return { ok: true, status: 200, text: async () => JSON.stringify(url.includes('create-order')
          ? { success: true, data: { key: 'public_key', order_id: 'order_1', amount: 10000 } }
          : { success: true, code: 'PAYMENT_SUCCESS', data: { processResult } }) };
      },
    };
    throw Error(name);
  } };
  vm.runInNewContext(source, context);
  return { service: context.exports, calls, pending, cleared };
}

(async () => {
  for (const newJoin of [false, true]) {
    const test = loadService();
    const result = await test.service.payWithRazorpay({ token: 'Bearer token', newJoin,
      body: { REGNO: 1, GROUPCODE: 'BMA', AMOUNT: 100 }, orderDetails: { amount: 100 } });
    assert.equal(result.creditPending, false);
    assert.ok(test.calls[0].url.endsWith(`NEWJOIN=${newJoin}`));
    assert.equal(test.calls.length, 2);
    assert.equal(JSON.parse(test.calls[1].body).razorpay_signature, 'sig');
    assert.equal(test.pending[1].payment.razorpay_payment_id, 'pay_1');
    assert.deepEqual(test.cleared, ['order_1']);
  }
  for (const options of [{ verifyFailure: true }, { processResult: 'PROCESS_FAILED: database offline' }, { processResult: 'TEMP_NOT_FOUND' }, { processResult: null }]) {
    const test = loadService(options);
    const result = await test.service.payWithRazorpay({ token: 'token', body: {}, orderDetails: {} });
    assert.equal(result.creditPending, true);
    assert.equal(test.cleared.length, 0);
  }
  const cancelled = loadService({ cancel: true });
  await assert.rejects(cancelled.service.payWithRazorpay({ token: 'token', body: {}, orderDetails: {} }), error => error.cancelled);
  assert.equal(cancelled.calls.length, 1);
  assert.equal(cancelled.cleared.length, 0);
  const normalize = cancelled.service.normalizeRazorpayError;
  assert.equal(normalize({ code: 2, description: 'undefined' }).cancelled, false);
  assert.match(normalize({ code: 2, description: 'undefined' }).message, /network error/);
  assert.equal(normalize({ description: JSON.stringify({ error: { reason: 'payment_cancelled' } }) }).cancelled, true);
  assert.equal(normalize({ description: JSON.stringify({ error: { reason: 'payment_error', description: 'undefined' } }) }).cancelled, false);
  assert.equal(normalize({ code: 3, description: 'Invalid currency' }).message, 'Invalid currency');
  assert.equal(normalize({ code: '0', description: 'undefined' }).cancelled, true);
  const missing = loadService({ nativeMissing: true });
  await assert.rejects(missing.service.payWithRazorpay({ token: 'token', body: {}, orderDetails: {} }), /native module is missing/);
  assert.equal(missing.calls.length, 0, 'Missing native module must stop before creating an order');
  console.log('Passed: join/installment, signature verification, deferred credit, network failure and cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
