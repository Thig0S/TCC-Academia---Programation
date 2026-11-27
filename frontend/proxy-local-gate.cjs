'use strict';

const API_CONTEXT = '^/api/v1(?:/|\\?|$)';
const API_PATH = /^\/api\/v1(?:\/|\?|$)/;
const REJECTED_PATH = '/__proxy_gate_rejected__';
const HOST = '127.0.0.1:4200';
const ORIGIN = 'http://127.0.0.1:4200';
const DEFAULT_BACKEND_PORT = 5070;
const MIN_BACKEND_PORT = 1024;
const MAX_BACKEND_PORT = 65535;
const FORBIDDEN_RESPONSE = 'Request rejected.';

function readProxySettings(environment) {
  const secret = environment?.Backend__SegredoLocal;
  if (typeof secret !== 'string' || secret.length !== 44 || !secret.endsWith('=')) {
    throw new Error('Backend__SegredoLocal must contain canonical Base64 for exactly 32 bytes.');
  }

  const secretBytes = Buffer.from(secret, 'base64');
  const canonicalSecret = secretBytes.length === 32 && secretBytes.toString('base64') === secret;
  secretBytes.fill(0);
  if (!canonicalSecret) {
    throw new Error('Backend__SegredoLocal must contain canonical Base64 for exactly 32 bytes.');
  }

  const configuredPort = environment.Backend__Porta;
  let port = DEFAULT_BACKEND_PORT;
  if (configuredPort !== undefined) {
    if (typeof configuredPort !== 'string' || !/^\d+$/.test(configuredPort)) {
      throw new Error('Backend__Porta must be an integer from 1024 through 65535.');
    }
    port = Number(configuredPort);
    if (!Number.isSafeInteger(port) || port < MIN_BACKEND_PORT || port > MAX_BACKEND_PORT) {
      throw new Error('Backend__Porta must be an integer from 1024 through 65535.');
    }
  }

  return {
    secret,
    target: `http://127.0.0.1:${port}`,
  };
}

function readRawHeaders(request) {
  if (!Array.isArray(request?.rawHeaders) || request.rawHeaders.length % 2 !== 0) {
    return null;
  }

  const headers = new Map();
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const name = request.rawHeaders[index];
    const value = request.rawHeaders[index + 1];
    if (typeof name !== 'string' || typeof value !== 'string') return null;

    const key = name.toLowerCase();
    const values = headers.get(key) ?? [];
    values.push(value);
    headers.set(key, values);
  }

  return headers;
}

function getSingleHeader(headers, name) {
  const values = headers.get(name) ?? [];
  if (values.length > 1) return { valid: false, present: false, value: undefined };
  return {
    valid: true,
    present: values.length === 1,
    value: values[0],
  };
}

function validateProxyRequest(request) {
  if (!request || typeof request.url !== 'string' || !API_PATH.test(request.url)) {
    return false;
  }

  if (!['GET', 'POST', 'PUT'].includes(request.method)) return false;

  const headers = readRawHeaders(request);
  if (!headers) return false;

  const upgrade = getSingleHeader(headers, 'upgrade');
  if (!upgrade.valid || upgrade.present) return false;
  const expect = getSingleHeader(headers, 'expect');
  if (!expect.valid || expect.present) return false;
  const connections = headers.get('connection') ?? [];
  if (
    connections.some((value) =>
      value.split(',').some((token) => token.trim().toLowerCase() === 'upgrade'),
    )
  ) {
    return false;
  }

  const host = getSingleHeader(headers, 'host');
  const fetchSite = getSingleHeader(headers, 'sec-fetch-site');
  const origin = getSingleHeader(headers, 'origin');
  if (!host.valid || !host.present || host.value !== HOST) return false;
  if (!fetchSite.valid || !fetchSite.present || fetchSite.value !== 'same-origin') return false;
  if (!origin.valid) return false;
  if (origin.present && origin.value !== ORIGIN) return false;
  if ((request.method === 'POST' || request.method === 'PUT') && !origin.present) {
    return false;
  }

  return true;
}

function denyRequest(request, response) {
  if (!response) return false;

  if (request && typeof request === 'object') request.url = REJECTED_PATH;

  if (response && !response.writableEnded) {
    response.writeHead(403, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    });
    response.end(FORBIDDEN_RESPONSE);
  }

  // The installed Vite bypass hook treats a string as a rewrite, then returns
  // immediately when the response is already ended. It does not call next/proxy.web.
  return REJECTED_PATH;
}

function createLocalProxyConfiguration(environment = process.env) {
  const { secret, target } = readProxySettings(environment);

  return {
    [API_CONTEXT]: {
      target,
      changeOrigin: true,
      ws: false,
      bypass(request, response) {
        if (!validateProxyRequest(request)) return denyRequest(request, response);
        return undefined;
      },
      configure(proxyServer) {
        proxyServer.on('proxyReq', (proxyRequest) => {
          proxyRequest.removeHeader('authorization');
          proxyRequest.removeHeader('cookie');
          proxyRequest.setHeader('Authorization', `Bearer ${secret}`);
        });
      },
    },
  };
}

module.exports = {
  API_CONTEXT,
  DEFAULT_BACKEND_PORT,
  HOST,
  ORIGIN,
  REJECTED_PATH,
  createLocalProxyConfiguration,
  validateProxyRequest,
};
