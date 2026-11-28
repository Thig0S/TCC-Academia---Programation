import { test as base, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const frontendRoot = path.resolve(process.cwd());
const repositoryRoot = path.resolve(frontendRoot, '..');
const backendRoot = path.join(repositoryRoot, 'backend');
const apiProject = path.join(backendRoot, 'src', 'VendasEmAberto.Api', 'VendasEmAberto.Api.csproj');
const uiHost = '127.0.0.1';
const uiPort = 4200;
const startupTimeoutMs = 120_000;

interface ChildOutput {
  readonly child: ChildProcess;
  readonly exitou: Promise<{ readonly code: number | null; readonly sinal: NodeJS.Signals | null }>;
}

export interface LocalStack {
  readonly baseURL: string;
  readonly apiURL: string;
  readonly databasePath: string;
  readonly reference: string;
  readonly logFiles: readonly string[];
  apiRequest(path: string, init?: RequestInit): Promise<Response>;
  logsSemSegredo(): boolean;
  dadosSemSegredo(valor: string): boolean;
  lerLogs(): string;
}

export { expect };

export const test = base.extend<{}, { localStack: LocalStack }>({
  localStack: [
    async ({}, use) => {
      const runDirectory = mkdtempSync(path.join(os.tmpdir(), 'vendas-em-aberto-e2e-'));
      const secret = randomBytes(32).toString('base64');
      const databasePath = path.join(runDirectory, 'local.sqlite');
      const logFiles = [
        path.join(runDirectory, 'api.stdout.log'),
        path.join(runDirectory, 'api.stderr.log'),
        path.join(runDirectory, 'cli.stdout.log'),
        path.join(runDirectory, 'cli.stderr.log'),
      ];
      const leakMarkerPath = path.join(runDirectory, 'credential-check.txt');
      let encontrouSegredoNosLogs = false;
      const caudasDeLog = new Map<string, string>();
      const processos: ChildOutput[] = [];
      let apiPort: number | null = null;
      let apiIniciada = false;
      let cliIniciado = false;
      const marcadorRedacao = '[credencial removida]'
        .padEnd(secret.length, '*')
        .slice(0, secret.length);

      for (const arquivo of logFiles) writeFileSync(arquivo, '', { flag: 'wx' });
      writeFileSync(leakMarkerPath, 'clean', { flag: 'wx' });

      function registrarSaida(arquivo: string, texto: string): void {
        const combinado = `${caudasDeLog.get(arquivo) ?? ''}${texto}`;
        if (combinado.includes(secret)) {
          encontrouSegredoNosLogs = true;
          writeFileSync(leakMarkerPath, 'credential-detected');
        }
        const redigido = combinado.split(secret).join(marcadorRedacao);
        const limite = Math.max(0, combinado.length - secret.length + 1);
        appendFileSync(arquivo, redigido.slice(0, limite));
        caudasDeLog.set(arquivo, redigido.slice(limite));
      }

      function finalizarLogs(): void {
        for (const [arquivo, cauda] of caudasDeLog) {
          if (cauda.includes(secret)) {
            encontrouSegredoNosLogs = true;
            writeFileSync(leakMarkerPath, 'credential-detected');
          }
          appendFileSync(arquivo, cauda.split(secret).join(marcadorRedacao));
        }
        caudasDeLog.clear();
      }

      function iniciarProcesso(
        comando: string,
        argumentos: readonly string[],
        diretorio: string,
        ambiente: NodeJS.ProcessEnv,
        saidas: readonly [string, string],
      ): ChildOutput {
        const child = spawn(comando, [...argumentos], {
          cwd: diretorio,
          env: ambiente,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          detached: process.platform !== 'win32',
        });
        child.stdout?.on('data', (chunk: Buffer) =>
          registrarSaida(saidas[0], chunk.toString('utf8')),
        );
        child.stderr?.on('data', (chunk: Buffer) =>
          registrarSaida(saidas[1], chunk.toString('utf8')),
        );
        const exitou = new Promise<{
          readonly code: number | null;
          readonly sinal: NodeJS.Signals | null;
        }>((resolve) => {
          child.once('exit', (code, sinal) => resolve({ code, sinal }));
          child.once('error', () => resolve({ code: null, sinal: null }));
        });
        const iniciado = { child, exitou };
        processos.push(iniciado);
        return iniciado;
      }

      try {
        await garantirPortaLivre(uiHost, uiPort);
        apiPort = await obterPortaLivre();
        const referencia = dataCivilLocal();
        const ambienteServidor: NodeJS.ProcessEnv = {
          ...process.env,
          Backend__SegredoLocal: secret,
          Backend__CaminhoBanco: databasePath,
          Backend__Porta: String(apiPort),
        };
        delete ambienteServidor.ASPNETCORE_URLS;
        delete ambienteServidor.DOTNET_URLS;

        const api = iniciarProcesso(
          'dotnet',
          ['run', '--project', apiProject, '--no-launch-profile'],
          backendRoot,
          ambienteServidor,
          [logFiles[0]!, logFiles[1]!],
        );
        apiIniciada = true;
        await aguardarHttp(`http://${uiHost}:${apiPort}/health`, api, 'API .NET');

        const cli = iniciarProcesso(
          process.execPath,
          [
            '-r',
            './start-local.cjs',
            './node_modules/@angular/cli/bin/ng.js',
            'serve',
            '--configuration',
            'local',
            '--host',
            uiHost,
            '--port',
            String(uiPort),
          ],
          frontendRoot,
          ambienteServidor,
          [logFiles[2]!, logFiles[3]!],
        );
        cliIniciado = true;
        await aguardarHttp(`http://${uiHost}:${uiPort}/`, cli, 'Angular CLI local');

        const stack: LocalStack = {
          baseURL: `http://${uiHost}:${uiPort}`,
          apiURL: `http://${uiHost}:${apiPort}`,
          databasePath,
          reference: referencia,
          logFiles,
          apiRequest: (requestPath, init = {}) => {
            const headers = new Headers(init.headers);
            headers.set('Authorization', `Bearer ${secret}`);
            return fetch(new URL(requestPath, `http://${uiHost}:${apiPort}`), {
              ...init,
              headers,
            });
          },
          logsSemSegredo: () => {
            if (encontrouSegredoNosLogs || readFileSync(leakMarkerPath, 'utf8') !== 'clean') {
              return false;
            }
            if ([...caudasDeLog.values()].some((cauda) => cauda.includes(secret))) return false;
            return logFiles.every((arquivo) => !readFileSync(arquivo, 'utf8').includes(secret));
          },
          dadosSemSegredo: (valor) => !valor.includes(secret),
          lerLogs: () => logFiles.map((arquivo) => readFileSync(arquivo, 'utf8')).join('\n'),
        };

        await use(stack);
      } finally {
        let falhaLimpeza: unknown;
        try {
          await encerrarProcessos(processos);
          const falhasPortas: string[] = [];
          if (cliIniciado) {
            try {
              await aguardarPortaLivre(uiHost, uiPort, 'Angular CLI local');
            } catch (erro) {
              falhasPortas.push(erro instanceof Error ? erro.message : 'Porta da UI ocupada.');
            }
          }
          if (apiIniciada && apiPort !== null) {
            try {
              await aguardarPortaLivre(uiHost, apiPort, 'API .NET');
            } catch (erro) {
              falhasPortas.push(erro instanceof Error ? erro.message : 'Porta da API ocupada.');
            }
          }
          if (falhasPortas.length) throw new Error(falhasPortas.join(' '));
        } catch (erro) {
          falhaLimpeza = erro;
        } finally {
          finalizarLogs();
          if (encontrouSegredoNosLogs) writeFileSync(leakMarkerPath, 'credential-detected');
          if (existsSync(runDirectory)) rmSync(runDirectory, { recursive: true, force: true });
        }
        if (falhaLimpeza) throw falhaLimpeza;
        if (encontrouSegredoNosLogs) {
          throw new Error('A saída de processo local continha o marcador de credencial.');
        }
      }
    },
    { scope: 'worker', timeout: 240_000 },
  ],
});

async function garantirPortaLivre(host: string, port: number): Promise<void> {
  const probe = net.createServer();
  try {
    await new Promise<void>((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(port, host, () => resolve());
    });
  } catch {
    throw new Error(
      `A porta local ${port} já está ocupada; o E2E não reutiliza servidores de terceiros.`,
    );
  } finally {
    if (probe.listening) await new Promise<void>((resolve) => probe.close(() => resolve()));
  }
}

async function obterPortaLivre(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, uiHost, () => resolve());
  });
  const address = probe.address();
  if (!address || typeof address === 'string') {
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    throw new Error('Não foi possível alocar uma porta temporária para a API local.');
  }
  const port = address.port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

function dataCivilLocal(): string {
  const agora = new Date();
  const ano = String(agora.getFullYear()).padStart(4, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

async function aguardarHttp(url: string, processo: ChildOutput, nome: string): Promise<void> {
  const limite = Date.now() + startupTimeoutMs;
  while (Date.now() < limite) {
    const encerrou = await Promise.race([
      processo.exitou.then((resultado) => ({ resultado })),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 200)),
    ]);
    if (encerrou) throw new Error(`${nome} encerrou antes de ficar pronto.`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // A porta continua em inicialização; não imprimir resposta nem configuração.
    }
  }
  throw new Error(`${nome} não ficou pronto dentro do limite de inicialização.`);
}

async function encerrarProcessos(processos: readonly ChildOutput[]): Promise<void> {
  for (const processo of [...processos].reverse()) await encerrarProcesso(processo);
}

async function encerrarProcesso(processo: ChildOutput): Promise<void> {
  if (processo.child.exitCode !== null || processo.child.signalCode !== null) return;
  const pid = processo.child.pid;
  if (!pid) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      processo.child.kill('SIGTERM');
    }
  }

  const encerrou = await Promise.race([
    processo.exitou.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (encerrou) return;

  if (process.platform === 'win32') processo.child.kill();
  else {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      processo.child.kill('SIGKILL');
    }
  }
  await processo.exitou;
}

async function aguardarPortaLivre(host: string, port: number, nome: string): Promise<void> {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    try {
      await garantirPortaLivre(host, port);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`${nome} não liberou a porta ${port} durante a limpeza da fixture.`);
}
