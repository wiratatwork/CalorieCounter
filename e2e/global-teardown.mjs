import { cleanupE2eData } from '../scripts/cleanup-e2e-data.mjs';

export default async function globalTeardown() {
  await cleanupE2eData();
}
