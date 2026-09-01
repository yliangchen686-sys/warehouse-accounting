/**
 * 本地 Supabase 管理客户端（读取 .env.local 中的 SUPABASE_SECRET_KEY）
 * 用法: node scripts/supabase-admin.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('缺少 .env.local，请配置 SUPABASE_URL 和 SUPABASE_SECRET_KEY');
  }

  const env = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
  });
  return env;
}

function getAdminClient() {
  const env = loadEnvLocal();
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('.env.local 需包含 SUPABASE_URL 和 SUPABASE_SECRET_KEY');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

module.exports = { getAdminClient, loadEnvLocal };

if (require.main === module) {
  getAdminClient()
    .from('employees')
    .select('name, base_salary')
    .limit(3)
    .then(({ data, error }) => {
      if (error) {
        console.error('连接失败:', error.message);
        process.exit(1);
      }
      console.log('Supabase 管理密钥可用，示例数据:', data);
    });
}
