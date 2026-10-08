import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { config } from 'dotenv';
const require = createRequire(import.meta.url);
config({ quiet: true });
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) {
  console.error('Defina TEST_DATABASE_URL com banco exclusivo terminado em _test.');
  process.exit(1);
}
const env = { ...process.env, DATABASE_URL: url };
const prisma = join(dirname(require.resolve('prisma/package.json')), 'build/index.js');
const migration = spawnSync(process.execPath, [prisma, 'migrate', 'deploy'], {
  stdio: 'inherit',
  env,
});
if (migration.status !== 0) process.exit(migration.status ?? 1);
const jest = join(dirname(require.resolve('jest/package.json')), 'bin/jest.js');
const result = spawnSync(
  process.execPath,
  [jest, '--config', 'jest.e2e.config.cjs', '--runInBand'],
  { stdio: 'inherit', env },
);
process.exit(result.status ?? 1);
