/**
 * ลบแถว E2E จาก daily_calories (เฉพาะ is_test = true)
 * ใช้ service role ถ้ามี ไม่งั้น fallback เป็น anon key (RLS ปัจจุบันลบได้)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

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

const fromFile = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};

function getEnv(key) {
  return process.env[key] || fromFile[key];
}

function isMissingColumnError(error, column) {
  const msg = String(error?.message || error?.details || '').toLowerCase();
  return msg.includes(String(column).toLowerCase()) || error?.code === 'PGRST204';
}

export async function cleanupE2eData() {
  const url = getEnv('SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  const apiKey = serviceKey || anonKey;

  if (!url || !apiKey) {
    console.warn(
      'ข้าม cleanup E2E: ตั้ง SUPABASE_URL และ SUPABASE_ANON_KEY (หรือ SERVICE_ROLE_KEY) ใน .env'
    );
    return { skipped: true };
  }

  if (!serviceKey) {
    console.warn(
      'cleanup E2E: ใช้ SUPABASE_ANON_KEY (แนะนำเพิ่ม SUPABASE_SERVICE_ROLE_KEY ใน .env สำหรับ CI)'
    );
  }

  const client = createClient(url, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let deleted = 0;

  const { error, count } = await client
    .from('daily_calories')
    .delete({ count: 'exact' })
    .eq('is_test', true);

  if (error) {
    if (isMissingColumnError(error, 'is_test')) {
      console.warn('ข้าม cleanup E2E: ยังไม่มีคอลัมน์ is_test — รัน migration add_is_test.sql');
      return { skipped: true, reason: 'missing_column' };
    }
    throw error;
  }

  deleted = count ?? 0;
  console.log(`ลบข้อมูล E2E แล้ว ${deleted} แถว (is_test = true)`);
  return { deleted };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  cleanupE2eData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
