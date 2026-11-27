'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const {
  API_CONTEXT,
  DEFAULT_BACKEND_PORT,
  HOST,
  ORIGIN,
  REJECTED_PATH,
  createLocalProxyConfiguration,
  validateProxyRequest,
} = require('./proxy-local-gate.cjs');

const SECRET = Buffer.alloc(32, 0x37).toString('base64');
const VALID_ENVIRONMENT = { Backend__SegredoLocal: SECRET };

function makeRequest({
  method = 'GET',
  url = '/api/v1/vendas?pagina=1',
  host = HOST,
  fetchSite = 'same-origin',
  origin = ORIGIN,
  extraHeaders = [],
} = {}) {
  const rawHeaders = [];
  if (host !== null) rawHeaders.push('Host', host);
  if (fetchSite !== null) rawHeaders.push('Sec-Fetch-Site', fetchSite);
  if (origin !== null) rawHeaders.push('Origin', origin);
  rawHeaders.push(...extraHeaders);

  return {
    method,
    url,
    rawHeaders,
    headers: Object.fromEntries(
      Array.from({ length: rawHeaders.length / 2 }, (_, index) => [
        rawHeaders[index * 2].toLowerCase(),
        rawHeaders[index * 2 + 1],
      ]),
    ),
  };
}

function makeResponse() {
  return {
    statusCode: 200,
    headersSent: false,
    writableEnded: false,
    headers: {},
    body: undefined,
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headersSent = true;
      Object.assign(this.headers, headers);
      return this;
    },
    end(body) {
      this.body = body;
      this.writableEnded = true;
      return this;
    },
  };
}

function getProxyOptions(environment = VALID_ENVIRONMENT) {
  const configuration = createLocalProxyConfiguration(environment);
  return { context: Object.keys(configuration)[0], options: Object.values(configuration)[0] };
}

function makeOutgoingRequest(initialHeaders = {}) {
  const headers = new Map(
    Object.entries(initialHeaders).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    headers,
    removeHeader(name) {
      headers.delete(name.toLowerCase());
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
  };
}

test('configuration validates the secret and fixes the loopback target and default port', () => {
  const { options } = getProxyOptions();

  assert.equal(options.target, `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`);
  assert.equal(options.ws, false);
  assert.equal(new RegExp(API_CONTEXT).test('/api/v1'), true);
  assert.equal(new RegExp(API_CONTEXT).test('/api/v1?x=1'), true);
  assert.equal(new RegExp(API_CONTEXT).test('/api/v1/vendas?x=1'), true);
  assert.equal(new RegExp(API_CONTEXT).test('/api/v10/vendas'), false);
  assert.equal(new RegExp(API_CONTEXT).test('/api/v1beta'), false);
  assert.equal(JSON.stringify(options).includes(SECRET), false);
});

test('configuration accepts only canonical 32-byte Base64 and a valid backend port', () => {
  const invalidSecrets = [undefined, '', 'not-base64', Buffer.alloc(31).toString('base64')];
  for (const secret of invalidSecrets) {
    assert.throws(
      () => createLocalProxyConfiguration({ Backend__SegredoLocal: secret }),
      /Backend__SegredoLocal/,
    );
  }

  const nonCanonicalSecret = `${SECRET.slice(0, -2)}B=`;
  assert.throws(
    () => createLocalProxyConfiguration({ Backend__SegredoLocal: nonCanonicalSecret }),
    /Backend__SegredoLocal/,
  );

  assert.equal(
    getProxyOptions({ ...VALID_ENVIRONMENT, Backend__Porta: '6123' }).options.target,
    'http://127.0.0.1:6123',
  );
  assert.equal(
    getProxyOptions({
      ...VALID_ENVIRONMENT,
      Backend__Porta: '5070',
      Backend__Target: 'http://example.com',
    }).options.target,
    'http://127.0.0.1:5070',
  );

  for (const port of ['', '80', '1023', '65536', '+5070', '5070x', ' 5070']) {
    assert.throws(
      () => createLocalProxyConfiguration({ ...VALID_ENVIRONMENT, Backend__Porta: port }),
      /Backend__Porta/,
    );
  }
});

test('same-origin GET may omit Origin; POST and PUT require the exact Origin', () => {
  assert.equal(validateProxyRequest(makeRequest({ method: 'GET', origin: null })), true);
  assert.equal(validateProxyRequest(makeRequest({ method: 'POST' })), true);
  assert.equal(validateProxyRequest(makeRequest({ method: 'PUT' })), true);
  assert.equal(validateProxyRequest(makeRequest({ method: 'POST', origin: null })), false);
  assert.equal(validateProxyRequest(makeRequest({ method: 'PUT', origin: 'null' })), false);
  assert.equal(
    validateProxyRequest(makeRequest({ method: 'GET', origin: 'https://evil.example' })),
    false,
  );
});

test('the gate rejects missing, duplicated, or non-exact Host, Origin, and Fetch Metadata', () => {
  const invalidRequests = [
    makeRequest({ host: null }),
    makeRequest({ host: 'localhost:4200' }),
    makeRequest({ host: '127.0.0.1:4200', extraHeaders: ['host', HOST] }),
    makeRequest({ fetchSite: null }),
    makeRequest({ fetchSite: 'same-site' }),
    makeRequest({ fetchSite: 'cross-site' }),
    makeRequest({ fetchSite: 'none' }),
    makeRequest({ fetchSite: 'same-origin', extraHeaders: ['sec-fetch-site', 'same-origin'] }),
    makeRequest({ origin: ORIGIN, extraHeaders: ['origin', ORIGIN] }),
  ];

  for (const request of invalidRequests) assert.equal(validateProxyRequest(request), false);
});

test('the gate rejects methods, upgrades, malformed raw headers, and paths outside the API prefix', () => {
  const invalidRequests = [
    makeRequest({ method: 'OPTIONS' }),
    makeRequest({ method: 'PATCH' }),
    makeRequest({ method: 'DELETE' }),
    makeRequest({ extraHeaders: ['Upgrade', 'websocket'] }),
    makeRequest({ extraHeaders: ['Expect', '100-continue'] }),
    makeRequest({ extraHeaders: ['Connection', 'keep-alive, Upgrade'] }),
    makeRequest({ url: '/api/v10/vendas' }),
    makeRequest({ url: '/api/v1beta' }),
    { ...makeRequest(), rawHeaders: ['Host'] },
    { ...makeRequest(), rawHeaders: undefined },
  ];

  for (const request of invalidRequests) assert.equal(validateProxyRequest(request), false);
});

test('denials end with a generic 403/no-store response and cannot reach proxy.web', async () => {
  const { options } = getProxyOptions();
  const invalidRequests = [
    makeRequest({ origin: 'null' }),
    makeRequest({ fetchSite: 'cross-site' }),
    makeRequest({ method: 'OPTIONS' }),
    makeRequest({ extraHeaders: ['Host', HOST] }),
    makeRequest({ extraHeaders: ['Upgrade', 'websocket'] }),
    makeRequest({ extraHeaders: ['Expect', '100-continue'] }),
  ];

  for (const request of invalidRequests) {
    const response = makeResponse();
    let upstreamCalls = 0;
    const result = await options.bypass(request, response, options);

    // Mirrors the installed Vite hook contract: a rewrite result returns early
    // when bypass already ended the response, before next() or proxy.web().
    if (typeof result === 'string' && !response.writableEnded) upstreamCalls += 1;
    else if (result === undefined && !response.writableEnded) upstreamCalls += 1;

    assert.equal(result, REJECTED_PATH);
    assert.equal(request.url, REJECTED_PATH);
    assert.equal(response.statusCode, 403);
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.equal(response.body, 'Request rejected.');
    assert.equal(upstreamCalls, 0);
    assert.equal(response.body.includes(SECRET), false);
  }
});

test('admitted requests inject the server Bearer and remove browser auth and cookies', async () => {
  const { options } = getProxyOptions();
  const request = makeRequest({ method: 'POST' });
  const response = makeResponse();
  const bypassResult = await options.bypass(request, response, options);
  assert.equal(bypassResult, undefined);
  assert.equal(response.writableEnded, false);

  const proxyServer = new EventEmitter();
  options.configure(proxyServer);
  const outgoing = makeOutgoingRequest({
    authorization: 'Bearer browser-controlled',
    cookie: 'session=browser-controlled',
    'content-type': 'application/json',
  });
  proxyServer.emit('proxyReq', outgoing);

  assert.equal(outgoing.headers.get('authorization'), `Bearer ${SECRET}`);
  assert.equal(outgoing.headers.has('cookie'), false);
  assert.equal(outgoing.headers.get('content-type'), 'application/json');
});
