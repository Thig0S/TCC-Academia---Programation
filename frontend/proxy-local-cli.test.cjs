'use strict';

const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const { createServer, request } = require('node:http');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('@playwright/test');

const FRONTEND_DIRECTORY = __dirname;
const UI_HOST = '127.0.0.1';
const UI_PORT = 4200;
const UI_ORIGIN = `http://${UI_HOST}:${UI_PORT}`;

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, UI_HOST, () => resolve(server.address().port));
  });
}

function closeServer(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function assertUiPortAvailable() {
  const probe = createServer();
  try {
    await listen(probe, UI_PORT);
  } catch {
    throw new Error('A porta local 4200 já está ocupada; o teste não reutiliza processo alheio.');
  }
  await closeServer(probe);
}

function httpRequest({ port = UI_PORT, path: requestPath, method = 'GET', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const outgoing = request(
      { host: UI_HOST, port, path: requestPath, method, headers },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    outgoing.once('error', reject);
    if (body !== undefined) outgoing.write(body);
    outgoing.end();
  });
}

function upgradeRequest(requestPath) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: UI_HOST, port: UI_PORT });
    let response = '';
    let settled = false;
    const timeout = setTimeout(
      () => finish(new Error('Upgrade não foi encerrado pelo servidor.')),
      5000,
    );

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      if (error) reject(error);
      else resolve(response);
    }

    socket.once('error', finish);
    socket.once('connect', () => {
      socket.write(
        [
          `GET ${requestPath} HTTP/1.1`,
          `Host: ${UI_HOST}:${UI_PORT}`,
          'Connection: Upgrade',
          'Upgrade: websocket',
          `Origin: ${UI_ORIGIN}`,
          'Sec-Fetch-Site: same-origin',
          '',
          '',
        ].join('\r\n'),
      );
    });
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\r\n\r\n')) finish();
    });
    socket.once('end', () => finish());
  });
}

function waitForCli(child, getLogs) {
  const deadline = Date.now() + 90_000;

  return new Promise((resolve, reject) => {
    const attempt = async () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        reject(new Error('Angular CLI encerrou antes de abrir a origem local.'));
        return;
      }

      try {
        const response = await fetch(UI_ORIGIN);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // The dev server is still starting.
      }

      if (Date.now() >= deadline) {
        reject(
          new Error(
            `Angular CLI não ficou pronto. Logs capturados: ${getLogs().length} caracteres.`,
          ),
        );
        return;
      }

      setTimeout(attempt, 200);
    };

    attempt();
  });
}

function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (process.platform === 'win32') child.kill();
      else child.kill('SIGKILL');
      resolve();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

test(
  'Angular CLI local admite same-origin, bloqueia proveniência/upgrade e sanitiza upstream 502',
  { timeout: 180_000 },
  async () => {
    await assertUiPortAvailable();

    const received = [];
    const upstream = createServer((incoming, outgoing) => {
      const chunks = [];
      incoming.on('data', (chunk) => chunks.push(chunk));
      incoming.on('end', () => {
        const entry = {
          method: incoming.method,
          url: incoming.url,
          headers: incoming.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        };
        received.push(entry);

        if (incoming.url.startsWith('/api/v1/fail')) {
          incoming.socket.destroy();
          return;
        }

        outgoing.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        outgoing.end(JSON.stringify({ ok: true, method: entry.method, url: entry.url }));
      });
    });

    const backendPort = await listen(upstream);
    const secret = Buffer.alloc(32, 0x5b).toString('base64');
    const stdout = [];
    const stderr = [];
    const localProcess = spawn(
      process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm',
      process.platform === 'win32'
        ? ['/d', '/s', '/c', 'npm.cmd run start:local']
        : ['run', 'start:local'],
      {
        cwd: FRONTEND_DIRECTORY,
        env: {
          ...process.env,
          Backend__SegredoLocal: secret,
          Backend__Porta: String(backendPort),
          DEBUG: 'vite:proxy',
          PORT: '4300',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );

    stdout.push('');
    stderr.push('');
    localProcess.stdout.on('data', (chunk) => {
      stdout[0] = `${stdout[0]}${chunk.toString('utf8')}`.slice(-40_000);
    });
    localProcess.stderr.on('data', (chunk) => {
      stderr[0] = `${stderr[0]}${chunk.toString('utf8')}`.slice(-40_000);
    });

    let browser;
    try {
      await waitForCli(localProcess, () => stdout[0].length + stderr[0].length);
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      const assetBodies = [];
      const assetReads = [];
      const browserRequests = [];
      page.on('request', (browserRequest) => browserRequests.push(browserRequest.url()));
      page.on('response', (browserResponse) => {
        const assetRead = (async () => {
          if (!browserResponse.url().startsWith(UI_ORIGIN)) return;
          const type = browserResponse.headers()['content-type'] ?? '';
          if (!/(html|javascript|css|json)/i.test(type)) return;
          try {
            assetBodies.push((await browserResponse.body()).toString('utf8'));
          } catch {
            // Ignore browser responses that are intentionally aborted during teardown.
          }
        })();
        assetReads.push(assetRead);
      });

      await page.goto(`${UI_ORIGIN}/configuracoes`);
      const reservedId = 'cliente /+?#ção';
      const browserQuery = new URLSearchParams([
        ['id', reservedId],
        ['marker', 'browser-query-marker'],
      ]).toString();
      const browserPath = `/api/v1/vendas/detalhe?${browserQuery}`;
      const browserResult = await page.evaluate(async (url) => {
        const response = await fetch(url);
        return { status: response.status, body: await response.json() };
      }, browserPath);

      assert.equal(browserResult.status, 200);
      assert.equal(browserResult.body.url, browserPath);
      assert.equal(received.length, 1);
      assert.equal(received[0].url, browserPath);
      assert.equal(received[0].headers.authorization, `Bearer ${secret}`);
      assert.equal(received[0].headers['sec-fetch-site'], 'same-origin');

      const credentialsPath = '/api/v1/vendas?marker=credential-replacement';
      const credentialsResponse = await httpRequest({
        path: credentialsPath,
        headers: {
          Host: `${UI_HOST}:${UI_PORT}`,
          'Sec-Fetch-Site': 'same-origin',
          Origin: UI_ORIGIN,
          Authorization: 'Bearer caller-controlled-marker',
          Cookie: 'session=caller-controlled-marker',
        },
      });
      assert.equal(credentialsResponse.statusCode, 200);
      assert.equal(received.length, 2);
      assert.equal(received[1].headers.authorization, `Bearer ${secret}`);
      assert.equal(received[1].headers.cookie, undefined);
      assert.equal(credentialsResponse.body.includes(secret), false);

      const countBeforeDenial = received.length;
      const deniedResponse = await httpRequest({
        path: '/api/v1/vendas?marker=denied-query-marker',
        headers: {
          Host: `${UI_HOST}:${UI_PORT}`,
          'Sec-Fetch-Site': 'cross-site',
          Origin: 'https://external.example',
        },
      });
      assert.equal(deniedResponse.statusCode, 403);
      assert.equal(deniedResponse.headers['cache-control'], 'no-store');
      assert.equal(deniedResponse.body, 'Request rejected.');
      assert.equal(deniedResponse.body.includes(secret), false);
      assert.equal(received.length, countBeforeDenial);

      const countBeforeUpgrade = received.length;
      const upgradeResponse = await upgradeRequest('/api/v1/vendas?marker=upgrade-query-marker');
      assert.match(upgradeResponse, /^HTTP\/1\.1 404 /);
      assert.doesNotMatch(upgradeResponse, /101 Switching Protocols/i);
      assert.equal(received.length, countBeforeUpgrade);

      const errorQueryMarker = 'proxy-error-query-marker';
      const errorBodyMarker = 'proxy-error-body-marker';
      const failedResponse = await httpRequest({
        path: `/api/v1/fail?marker=${errorQueryMarker}`,
        method: 'POST',
        headers: {
          Host: `${UI_HOST}:${UI_PORT}`,
          'Sec-Fetch-Site': 'same-origin',
          Origin: UI_ORIGIN,
          'Content-Type': 'application/json',
          Authorization: 'Bearer caller-controlled-marker',
          Cookie: 'session=caller-controlled-marker',
        },
        body: JSON.stringify({ marker: errorBodyMarker }),
      });
      assert.equal(failedResponse.statusCode, 502);
      assert.equal(failedResponse.headers['cache-control'], 'no-store');
      assert.deepEqual(JSON.parse(failedResponse.body), { code: 'local-api-unavailable' });
      assert.equal(received.at(-1).headers.authorization, `Bearer ${secret}`);
      assert.equal(received.at(-1).headers.cookie, undefined);
      assert.equal(received.at(-1).body, JSON.stringify({ marker: errorBodyMarker }));
      assert.equal(JSON.stringify(browserResult.body).includes(secret), false);

      await Promise.all(assetReads);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const logs = `${stdout[0]}${stderr[0]}`;
      assert.ok(
        logs.includes('http proxy error'),
        `esperado diagnóstico genérico do proxy; logs capturados: ${logs
          .replaceAll(secret, '[segredo]')
          .replaceAll(errorQueryMarker, '[query]')
          .replaceAll(errorBodyMarker, '[body]')
          .replaceAll('caller-controlled-marker', '[credencial]')}`,
      );
      assert.ok(
        logs.includes('Local API upstream unavailable.'),
        'erro do upstream não deve expor detalhe técnico',
      );
      for (const marker of [
        secret,
        'browser-query-marker',
        'credential-replacement',
        'denied-query-marker',
        'upgrade-query-marker',
        errorQueryMarker,
        errorBodyMarker,
        'caller-controlled-marker',
      ]) {
        assert.equal(
          logs.includes(marker),
          false,
          'logs do CLI não podem expor segredo, query, body ou credencial recebida',
        );
        assert.equal(
          failedResponse.body.includes(marker),
          false,
          'resposta 502 deve permanecer genérica',
        );
      }
      for (const body of assetBodies) {
        assert.equal(
          body.includes(secret),
          false,
          'assets/respostas do browser não podem conter o segredo do Node',
        );
      }
      for (const url of browserRequests) {
        assert.equal(url.includes(secret), false, 'URL do browser não pode conter o segredo');
      }
    } finally {
      await browser?.close();
      await stopChild(localProcess);
      await closeServer(upstream);
    }
  },
);

test(
  'a real API rejects a different but well-formed proxy credential without exposing either secret',
  { timeout: 180_000 },
  async () => {
    const temporaryRoot = path.join(process.env.LOCALAPPDATA ?? '', 'Temp', 'opencode');
    assert.ok(fs.existsSync(temporaryRoot), 'o diretório temporário aprovado deve existir');
    const dataDirectory = fs.mkdtempSync(path.join(temporaryRoot, 'fase006-proxy-api-'));
    const apiSecret = randomBytes(32).toString('base64');
    const proxySecret = randomBytes(32).toString('base64');
    assert.notEqual(apiSecret, proxySecret);

    const portProbe = createServer();
    const apiPort = await listen(portProbe);
    await closeServer(portProbe);
    assert.ok(apiPort >= 1024 && apiPort <= 65535);

    const backendDirectory = path.resolve(FRONTEND_DIRECTORY, '..', 'backend');
    const apiProject = path.join(
      backendDirectory,
      'src',
      'VendasEmAberto.Api',
      'VendasEmAberto.Api.csproj',
    );
    const apiEnvironment = {
      ...process.env,
      Backend__Porta: String(apiPort),
      Backend__CaminhoBanco: path.join(dataDirectory, 'synthetic.db'),
      Backend__SegredoLocal: apiSecret,
    };
    for (const name of Object.keys(apiEnvironment)) {
      const normalized = name.toUpperCase();
      if (
        [
          'ASPNETCORE_URLS',
          'DOTNET_URLS',
          'ASPNETCORE_HTTP_PORTS',
          'ASPNETCORE_HTTPS_PORTS',
          'DOTNET_HTTP_PORTS',
          'DOTNET_HTTPS_PORTS',
        ].includes(normalized) ||
        normalized.startsWith('KESTREL__ENDPOINTS__')
      ) {
        delete apiEnvironment[name];
      }
    }

    const apiProcess = spawn(
      'dotnet',
      ['run', '--no-restore', '--project', apiProject, '-c', 'Release', '--no-launch-profile'],
      {
        cwd: backendDirectory,
        env: apiEnvironment,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    const output = [];
    output.push('');
    apiProcess.stdout.on('data', (chunk) => {
      output[0] = `${output[0]}${chunk.toString('utf8')}`.slice(-40_000);
    });
    apiProcess.stderr.on('data', (chunk) => {
      output[0] = `${output[0]}${chunk.toString('utf8')}`.slice(-40_000);
    });

    try {
      const healthUrl = `http://${UI_HOST}:${apiPort}/health`;
      const deadline = Date.now() + 90_000;
      let healthy = false;
      while (!healthy && Date.now() < deadline) {
        if (apiProcess.exitCode !== null || apiProcess.signalCode !== null) {
          throw new Error('A API local encerrou antes de responder health.');
        }
        try {
          const health = await fetch(healthUrl);
          healthy = health.status === 200;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      assert.equal(healthy, true, 'API sintética deve ficar pronta em loopback');

      const response = await fetch(`http://${UI_HOST}:${apiPort}/api/v1/vendas`, {
        headers: { Authorization: `Bearer ${proxySecret}` },
      });
      const body = await response.text();
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(body.includes(apiSecret), false);
      assert.equal(body.includes(proxySecret), false);
      assert.equal(output[0].includes(apiSecret), false);
      assert.equal(output[0].includes(proxySecret), false);
    } finally {
      await stopChild(apiProcess);
      fs.rmSync(dataDirectory, { recursive: true, force: true });
    }
  },
);
