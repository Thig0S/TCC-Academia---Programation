import { existsSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { expect, test } from './local-stack';

const frontendRoot = path.resolve(process.cwd());
const repositoryRoot = path.resolve(frontendRoot, '..');
const backendRoot = path.join(repositoryRoot, 'backend');
const apiAssembly = path.join(
  backendRoot,
  'src',
  'VendasEmAberto.Api',
  'bin',
  'Debug',
  'net10.0',
  'VendasEmAberto.Api.dll',
);

test('fixture inicia SQLite próprio vazio, sem seed nem criação de negócio na consulta', async ({
  localStack,
}) => {
  expect(existsSync(localStack.databasePath)).toBe(true);

  const resposta = await localStack.apiRequest(
    `/api/v1/vendas?colecao=Abertas&referencia=${localStack.reference}`,
  );
  expect(resposta.status).toBe(200);
  const corpo = (await resposta.json()) as { readonly vendas?: unknown };
  expect(corpo.vendas).toEqual([]);

  const consultaSeguinte = await localStack.apiRequest(
    `/api/v1/vendas?colecao=Abertas&referencia=${localStack.reference}`,
  );
  expect(consultaSeguinte.status).toBe(200);
  await expect(consultaSeguinte.json()).resolves.toMatchObject({ vendas: [] });
});

test('API local recusa inicialização sem segredo e não cria o banco', async ({ localStack }) => {
  const port = await obterPortaLivre();
  const databasePath = path.join(path.dirname(localStack.databasePath), 'sem-segredo.sqlite');
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    Backend__Porta: String(port),
    Backend__CaminhoBanco: databasePath,
  };
  for (const chave of Object.keys(environment)) {
    if (chave.toUpperCase() === 'BACKEND__SEGREDOLOCAL') delete environment[chave];
  }

  const child = spawn('dotnet', [apiAssembly], {
    cwd: backendRoot,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString('utf8')));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString('utf8')));
  const fechamento = new Promise<{ readonly code: number | null }>((resolve) =>
    child.once('close', (code) => resolve({ code })),
  );

  const result = await Promise.race([
    fechamento,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
  ]);
  if (result === null) {
    if (process.platform === 'win32' && child.pid) {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else if (child.pid) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
    await fechamento;
    throw new Error('A API sem segredo não encerrou no limite esperado.');
  }

  expect(result.code).not.toBe(0);
  expect(existsSync(databasePath)).toBe(false);
  await garantirPortaLivre(port);
  expect(output).not.toContain('Bearer ');
  expect(output).not.toContain('Backend__SegredoLocal=');
});

test('proxy local admite same-origin, nega origem externa e não expõe a credencial ao browser', async ({
  page,
  localStack,
}) => {
  const urls: string[] = [];
  const browserBodies: string[] = [];
  const browserHeaders: string[] = [];
  const inspections: Promise<void>[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(localStack.baseURL)) return;
    urls.push(request.url());
    inspections.push(
      request.allHeaders().then((headers) => {
        browserHeaders.push(JSON.stringify(headers));
      }),
    );
  });
  page.on('response', (response) => {
    if (!response.url().startsWith(localStack.baseURL)) return;
    inspections.push(
      response
        .body()
        .then((body) => browserBodies.push(body.toString('utf8')))
        .catch(() => undefined),
    );
  });

  await page.goto('/configuracoes');
  const url = `/api/v1/vendas?colecao=Abertas&referencia=${localStack.reference}`;
  const admitted = await page.evaluate(async (requestPath) => {
    const response = await fetch(requestPath);
    return { status: response.status, body: await response.json() };
  }, url);
  expect(admitted.status).toBe(200);
  expect(admitted.body).toMatchObject({ vendas: [] });

  const denied = await page.request.get(`${localStack.baseURL}${url}`, {
    headers: {
      Origin: 'https://origem-invalida.example',
      'Sec-Fetch-Site': 'cross-site',
    },
  });
  expect(denied.status()).toBe(403);
  await Promise.all(inspections);

  expect(urls.some((requestUrl) => requestUrl.includes('/api/v1/vendas?'))).toBe(true);
  expect(browserHeaders.join('\n')).not.toContain('authorization');
  expect(browserHeaders.join('\n')).not.toContain('cookie');
  expect(browserHeaders.join('\n')).not.toContain('Bearer ');
  expect(browserBodies.join('\n')).not.toContain('Bearer ');
  expect(localStack.dadosSemSegredo(`${urls}\n${browserHeaders}\n${browserBodies}`)).toBe(true);
  expect(browserBodies.join('\n')).not.toContain(localStack.apiURL);
  expect(localStack.logsSemSegredo()).toBe(true);
  expect(localStack.lerLogs()).not.toContain('Bearer ');
  expect(await page.context().cookies()).toEqual([]);
  expect(readFileSync(localStack.logFiles[0]!, 'utf8')).not.toContain('Backend__SegredoLocal=');
});

test('fixture cria venda sintética por chamada autenticada direta à API', async ({
  localStack,
}) => {
  const cadastro = await localStack.apiRequest('/api/v1/vendas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Venda sintética da fixture',
      cpf: '52998224725',
      telefone: '11987654321',
      descricao: 'Criada pelo cliente Node de teste',
      dataVenda: localStack.reference,
      valorTotalCentavos: 10000,
      quantidadeParcelas: 1,
      referencia: localStack.reference,
      revisaoEsperada: '0',
      entrada: null,
    }),
  });
  expect(cadastro.status).toBe(201);
  const criada = (await cadastro.json()) as {
    readonly resumo?: { readonly id?: string; readonly revisao?: string };
  };
  expect(criada.resumo?.id).toBeTruthy();
  expect(criada.resumo?.revisao).toBe('1');

  const consulta = await localStack.apiRequest(
    `/api/v1/vendas?colecao=Abertas&referencia=${localStack.reference}`,
  );
  expect(consulta.status).toBe(200);
  const colecao = (await consulta.json()) as {
    readonly vendas?: readonly { readonly id?: string }[];
  };
  expect(colecao.vendas?.map((venda) => venda.id)).toContain(criada.resumo?.id);
});

async function obterPortaLivre(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => resolve());
  });
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('Porta temporária indisponível.');
  const port = address.port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

async function garantirPortaLivre(port: number): Promise<void> {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => resolve());
  });
  await new Promise<void>((resolve) => probe.close(() => resolve()));
}
