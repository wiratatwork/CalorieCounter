import { cleanupE2eData } from '../scripts/cleanup-e2e-data.mjs';

export default async function globalSetup() {
  await cleanupE2eData();
}
