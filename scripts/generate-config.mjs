/**
 * อ่าน .env / env vars แล้วสร้าง js/config.js (ฝั่งเบราว์เซอร์ — ไม่ใส่ Gemini key)
 * รัน: npm run env
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const outPath = path.join(root, 'js', 'config.js');

function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const fromFile = fs.existsSync(envPath)
  ? parseEnv(fs.readFileSync(envPath, 'utf8'))
  : {};

const env = {
  ...fromFile,
  SUPABASE_URL: process.env.SUPABASE_URL || fromFile.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || fromFile.SUPABASE_ANON_KEY,
};

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !env[key]);
if (missing.length) {
  console.error(`ขาดค่า: ${missing.join(', ')} (ใส่ใน .env หรือ environment)`);
  process.exit(1);
}

const contents = `/* AUTO-GENERATED — อย่าแก้โดยตรง (รัน npm run env) */
/* Gemini key อยู่ที่ Supabase Edge Function secrets เท่านั้น */
window.APP_CONFIG = {
  supabaseUrl: ${JSON.stringify(env.SUPABASE_URL)},
  supabaseAnonKey: ${JSON.stringify(env.SUPABASE_ANON_KEY)},
};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, contents, 'utf8');
console.log('สร้าง js/config.js แล้ว (Supabase only — ไม่มี Gemini key)');
