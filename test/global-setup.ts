import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONTAINER = 'corkboard-db-1';
const TEST_DB = 'db_corkboard_test';

const sh = (cmd: string) => execSync(cmd, { stdio: ['inherit', 'inherit', 'inherit'], shell: '/bin/bash' });

export default async function setup() {
  sh(`docker exec ${CONTAINER} psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB}" >/dev/null`);
  const seedPath = resolve(__dirname, '..', 'prisma', 'seed.sql');
  const seed = readFileSync(seedPath, 'utf8').replace(/db_corkboard\b/g, TEST_DB);
  execSync(`docker exec -i ${CONTAINER} psql -U postgres -d postgres`, {
    input: seed,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}
