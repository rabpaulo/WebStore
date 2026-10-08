import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const placeholder = 'replace-with-a-random-secret-at-least-32-characters';
const secret = randomBytes(32).toString('hex');
if (!existsSync('.env'))
  writeFileSync('.env', readFileSync('.env.example', 'utf8').replace(placeholder, secret), {
    mode: 0o600,
  });
const rootEnv = readFileSync('.env', 'utf8');
const jwt = rootEnv.match(/^JWT_SECRET=(.+)$/m)?.[1] ?? secret;
const dbPort = rootEnv.match(/^POSTGRES_PORT=(.+)$/m)?.[1] ?? '5434';
const dbUser = rootEnv.match(/^POSTGRES_USER=(.+)$/m)?.[1] ?? 'lingerieflow';
const dbPassword = rootEnv.match(/^POSTGRES_PASSWORD=(.+)$/m)?.[1] ?? 'local-development-only';
const dbName = rootEnv.match(/^POSTGRES_DB=(.+)$/m)?.[1] ?? 'lingerieflow';
const apiPort = rootEnv.match(/^API_PORT=(.+)$/m)?.[1] ?? '3005';
const webPort = rootEnv.match(/^FRONTEND_PORT=(.+)$/m)?.[1] ?? '5173';
if (!existsSync('backend/.env'))
  writeFileSync(
    'backend/.env',
    readFileSync('backend/.env.example', 'utf8')
      .replace(placeholder, jwt)
      .replaceAll(
        'postgresql://lingerieflow:local-development-only@localhost:5434/lingerieflow',
        `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@localhost:${dbPort}/${dbName}`,
      )
      .replace('PORT=3005', `PORT=${apiPort}`)
      .replace('localhost:5173', `localhost:${webPort}`),
    { mode: 0o600 },
  );
if (!existsSync('frontend/.env'))
  writeFileSync('frontend/.env', readFileSync('frontend/.env.example', 'utf8'), { mode: 0o600 });
console.log('Ambiente preparado. Arquivos .env existentes foram preservados.');
