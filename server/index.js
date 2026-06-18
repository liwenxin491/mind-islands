import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const PORT = Number(process.env.PORT || 8787);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const LOCAL_OFFLINE_MODE = process.env.LOCAL_OFFLINE === 'true' && !IS_PRODUCTION;
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === 'true'
    ? true
    : process.env.COOKIE_SECURE === 'false'
      ? false
      : NODE_ENV === 'production';
const DATABASE_URL = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || '';
const APP_ORIGIN = process.env.APP_ORIGIN || process.env.PUBLIC_APP_URL || '';
const AUTH_COOKIE_NAME = 'mind_islands_auth';
const AUTH_COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const VERIFICATION_CODE_TTL_MS = 1000 * 60 * 10;
const VERIFICATION_RESEND_COOLDOWN_MS = 1000 * 60;
const VERIFICATION_MAX_ATTEMPTS = 8;
const AUTH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;
const AUTH_RATE_LIMIT_MAX = 30;
const AI_RATE_LIMIT_WINDOW_MS = 1000 * 60;
const AI_RATE_LIMIT_MAX = 30;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE =
  process.env.SMTP_SECURE === 'true'
    ? true
    : process.env.SMTP_SECURE === 'false'
      ? false
      : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const ISLAND_TYPES = ['body', 'work', 'learning', 'relationships', 'curiosity', 'compassion'];
const MEMORY_SOURCES = ['manual', 'ai', 'inspiration', 'harbor-saved', 'plan-check-in'];
const MEMORY_TEMPLATES = ['general', 'body', 'progress', 'connection'];
const MEMORY_SENSITIVITY_LEVELS = ['normal', 'sensitive'];
const PROFILE_SIGNAL_CATEGORIES = [
  'stressor',
  'goal',
  'routine',
  'support_style',
  'coping_strategy',
  'relationship_theme',
  'tone_preference',
  'identity',
  'interest',
];
const DEFAULT_MEMORY_SETTINGS = {
  saveMemoriesEnabled: true,
  profileLearningEnabled: true,
  aiPersonalizationEnabled: true,
  harborMemoryEnabled: true,
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const { Pool } = pg;
const dbPool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
  : null;
const hasEmailConfig = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM);
const emailTransporter = hasEmailConfig
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: COOKIE_SECURE,
  path: '/',
  maxAge: AUTH_COOKIE_TTL_MS,
};
const trustedOrigins = new Set(
  [APP_ORIGIN]
    .filter(Boolean)
    .flatMap((origin) => origin.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PRODUCTION && COOKIE_SECURE) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use((req, res, next) => {
  if (!IS_PRODUCTION || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  if (!req.path.startsWith('/api/')) return next();

  const origin = String(req.headers.origin || '');
  if (!origin) return next();
  if (trustedOrigins.size === 0 || trustedOrigins.has(origin)) return next();
  return res.status(403).json({ error: 'untrusted_origin' });
});

const rateLimitBuckets = new Map();
const createRateLimiter = ({ prefix, windowMs, max }) => (req, res, next) => {
  const now = Date.now();
  const key = `${prefix}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  current.count += 1;
  if (current.count > max) {
    const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({ error: 'rate_limited', retryAfterSec });
  }
  return next();
};

const authRateLimiter = createRateLimiter({
  prefix: 'auth',
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
});
const aiRateLimiter = createRateLimiter({
  prefix: 'ai',
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  max: AI_RATE_LIMIT_MAX,
});

const toSafeUser = (row) => ({
  id: String(row.id),
  username: row.username,
  email: row.email,
  emailVerifiedAt: row.email_verified_at || null,
  createdAt: row.created_at,
});

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizeUsername = (value = '') => String(value || '').trim();
const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const buildVerificationHash = (email = '', code = '') =>
  crypto.createHash('sha256').update(`${email}|${code}|${JWT_SECRET || 'mind-islands'}`).digest('hex');
const generateVerificationCode = () => String(crypto.randomInt(100000, 1000000));
const timingSafeEqualString = (left = '', right = '') => {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};
const encryptionKey = DATA_ENCRYPTION_KEY
  ? crypto.createHash('sha256').update(DATA_ENCRYPTION_KEY).digest()
  : null;
const isEncryptedEnvelope = (value = '') => typeof value === 'string' && value.startsWith('enc:v1:');
const encryptText = (value = '') => {
  if (!encryptionKey) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
};
const decryptText = (value = '') => {
  if (!isEncryptedEnvelope(value)) return value;
  if (!encryptionKey) {
    throw new Error('data_encryption_key_required');
  }
  const [, version, ivText, tagText, ciphertextText] = String(value).split(':');
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText) {
    throw new Error('invalid_encrypted_payload');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(ivText, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};
const encryptNullableText = (value = '') => {
  const text = String(value || '');
  if (!text) return '';
  return encryptText(text);
};
const encryptJson = (value = {}) => encryptText(JSON.stringify(value ?? {}));
const decryptJson = (encryptedValue, fallback = {}) => {
  if (!encryptedValue) return fallback;
  try {
    const text = decryptText(encryptedValue);
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};
const ciphertextOrPlain = (ciphertext, plaintext = '') => {
  if (ciphertext) return decryptText(ciphertext);
  return plaintext || '';
};
const searchableHash = (value = '') => {
  if (!value) return null;
  const key = encryptionKey || crypto.createHash('sha256').update(JWT_SECRET || 'mind-islands').digest();
  return crypto
    .createHmac('sha256', key)
    .update(String(value).trim().toLowerCase())
    .digest('hex');
};

const sendVerificationEmail = async ({ email, username = '', code = '' }) => {
  if (!emailTransporter) {
    if (!IS_PRODUCTION) {
      // eslint-disable-next-line no-console
      console.log(`[auth] verification code for ${email}: ${code}`);
      return;
    }
    throw new Error('email_service_not_configured');
  }

  const displayName = username || 'there';
  await emailTransporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Mind Islands verification code',
    text: `Hi ${displayName}, your Mind Islands verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f1f1f">
        <p>Hi ${displayName},</p>
        <p>Your Mind Islands verification code is:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:2px;">${code}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
};

const validateRuntimeConfig = () => {
  if (LOCAL_OFFLINE_MODE) return;
  if (!IS_PRODUCTION) return;
  const missing = [];
  if (!DATABASE_URL) missing.push('DATABASE_URL');
  if (!JWT_SECRET) missing.push('JWT_SECRET');
  if (!DATA_ENCRYPTION_KEY) missing.push('DATA_ENCRYPTION_KEY');
  if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  if (!APP_ORIGIN) missing.push('APP_ORIGIN');
  if (!hasEmailConfig) missing.push('SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM');
  if (missing.length > 0) {
    throw new Error(`Missing required env in production: ${missing.join(', ')}`);
  }
};

const checkDatabaseConnection = async () => {
  if (!dbPool) return false;
  try {
    await dbPool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

const requireDatabaseConfig = (res, options = {}) => {
  const { allowOffline = true } = options;
  if (allowOffline && LOCAL_OFFLINE_MODE) return true;
  if (!dbPool) {
    res.status(503).json({ error: 'database_not_configured' });
    return false;
  }
  return true;
};

const requireAuthConfig = (res) => {
  if (!requireDatabaseConfig(res)) return false;
  if (!JWT_SECRET) {
    res.status(503).json({ error: 'jwt_secret_not_configured' });
    return false;
  }
  return true;
};

const signAuthToken = (user) =>
  jwt.sign(
    {
      uid: String(user.id),
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '14d' },
  );

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...authCookieOptions,
    maxAge: undefined,
  });
};

const readAuthToken = (req) => {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const header = String(req.headers.authorization || '');
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
};

const requireAuth = async (req, res, next) => {
  if (LOCAL_OFFLINE_MODE) {
    req.authUser = {
      id: 'local-offline',
      username: 'Local User',
      email: 'offline@localhost',
      createdAt: '',
    };
    return next();
  }

  if (!requireAuthConfig(res)) return;
  const token = readAuthToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const uid = Number(payload?.uid);
  if (!Number.isFinite(uid) || uid <= 0) {
    return res.status(401).json({ error: 'invalid_token_payload' });
  }

  try {
    const result = await dbPool.query(
      'SELECT id, username, email, email_verified_at, created_at FROM users WHERE id = $1 LIMIT 1',
      [uid],
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'user_not_found' });
    }
    req.authUser = toSafeUser(result.rows[0]);
    return next();
  } catch (error) {
    return res.status(500).json({
      error: 'auth_user_lookup_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

const runDatabaseMigrations = async () => {
  if (!dbPool) {
    // eslint-disable-next-line no-console
    console.warn('[db] DATABASE_URL is missing. Auth + cloud state endpoints are disabled.');
    return;
  }

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
  `);

  await dbPool.query(`
    UPDATE users
    SET email_verified_at = created_at
    WHERE email_verified_at IS NULL;
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS user_states (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state_json JSONB NOT NULL,
      state_ciphertext TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    ALTER TABLE user_states
    ADD COLUMN IF NOT EXISTS state_ciphertext TEXT;
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      email VARCHAR(255) PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts_remaining INT NOT NULL DEFAULT ${VERIFICATION_MAX_ATTEMPTS},
      sent_count INT NOT NULL DEFAULT 1,
      last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    ALTER TABLE email_verifications
    ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;
  `);

  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at
    ON email_verifications (expires_at);
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS user_memory_settings (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      save_memories_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      profile_learning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ai_personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      harbor_memory_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS user_memory_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source VARCHAR(40) NOT NULL DEFAULT 'manual',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_ciphertext TEXT,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      islands JSONB NOT NULL DEFAULT '[]'::jsonb,
      template VARCHAR(40) NOT NULL DEFAULT 'general',
      fields JSONB,
      fields_ciphertext TEXT,
      pinned BOOLEAN NOT NULL DEFAULT FALSE,
      sensitivity_level VARCHAR(20) NOT NULL DEFAULT 'normal',
      source_message TEXT,
      source_message_ciphertext TEXT,
      legacy_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `);

  await dbPool.query(`
    ALTER TABLE user_memory_events
    ADD COLUMN IF NOT EXISTS legacy_key TEXT;
  `);

  await dbPool.query(`
    ALTER TABLE user_memory_events
    ADD COLUMN IF NOT EXISTS content_ciphertext TEXT,
    ADD COLUMN IF NOT EXISTS fields_ciphertext TEXT,
    ADD COLUMN IF NOT EXISTS source_message_ciphertext TEXT;
  `);

  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_memory_events_user_active_created
    ON user_memory_events (user_id, deleted_at, created_at DESC);
  `);

  await dbPool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memory_events_user_legacy_key
    ON user_memory_events (user_id, legacy_key)
    WHERE legacy_key IS NOT NULL;
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS user_profile_facts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(60) NOT NULL,
      value TEXT NOT NULL,
      value_ciphertext TEXT,
      value_lookup_hash TEXT,
      confidence NUMERIC(4,3) NOT NULL DEFAULT 0.6,
      evidence_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      retracted_at TIMESTAMPTZ
    );
  `);

  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_profile_facts_user_active_category
    ON user_profile_facts (user_id, active, category);
  `);

  await dbPool.query(`
    ALTER TABLE user_profile_facts
    ADD COLUMN IF NOT EXISTS value_ciphertext TEXT,
    ADD COLUMN IF NOT EXISTS value_lookup_hash TEXT;
  `);

  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_profile_facts_user_lookup
    ON user_profile_facts (user_id, active, category, value_lookup_hash)
    WHERE value_lookup_hash IS NOT NULL;
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS user_profile_summaries (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      summary_ciphertext TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    ALTER TABLE user_profile_summaries
    ADD COLUMN IF NOT EXISTS summary_ciphertext TEXT;
  `);
};

const cleanJson = (text = '') => {
  const trimmed = text.trim();
  if (!trimmed) return '{}';
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
};

const trimTaskSuffix = (text = '') =>
  text
    .replace(/[。！？.!?]+$/g, '')
    .replace(
      /\b(day after tomorrow|tomorrow|today|tonight|this weekend|next week|this week|this evening)\b/gi,
      '',
    )
    .replace(/\b(at|around|before|by)\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\b(on)\s+\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/gi, '')
    .replace(/\b(on)\s+\d{1,2}[/-]\d{1,2}\b/gi, '')
    .replace(/(后天|明天|今天|今晚|下周|这周|周末|早上|上午|中午|下午|晚上|今晚)/g, '')
    .replace(/\d{1,2}\s*点(\s*\d{1,2}\s*分?)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractTaskText = (message = '') => {
  const clean = message.trim();
  if (!clean) return '';

  const patterns = [
    /(?:i\s+need\s+to|i\s+have\s+to|i\s+must|i\s+should|i\s+want\s+to)\s+(.+)/i,
    /(?:remember\s+to)\s+(.+)/i,
    /(?:please\s+)?(?:add|create)\s+(?:a\s+)?(?:todo|to-do)(?:\s+item)?(?:\s+(?:for|to))?\s+(.+)/i,
    /(?:please\s+)?(?:record|save)\s+(?:a\s+)?(?:todo|to-do|task)(?:\s+item)?(?:\s+(?:for|to))?\s*[:：]?\s*(.+)/i,
    /(?:todo|to-do)\s*[:：]\s*(.+)/i,
    /(?:我要|我想|帮我|请帮我)?\s*(?:记录|添加|加入|保存|写入|写进)\s*(?:一?条)?\s*(?:todo|to-do|待办|任务)\s*[:：]?\s*(.+)/i,
    /(?:我(?:需要|要|得|必须|记得))\s*(.+)/,
    /(?:待办|任务|todo)\s*[:：]\s*(.+)/i,
    /^(?:tomorrow|today|tonight|this weekend|next week)\s+(.+)$/i,
    /^(?:明天|今天|今晚|周末|下周)\s*(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      const task = trimTaskSuffix(match[1]);
      if (task) return task;
    }
  }

  if (/^(do|buy|call|email|finish|submit|book|pay|clean|laundry|study|read|write)\b/i.test(clean)) {
    return trimTaskSuffix(clean);
  }
  if (/^(去|做|完成|提交|买|联系|打电话|整理|洗|学习|复习)/.test(clean)) {
    return trimTaskSuffix(clean);
  }

  return '';
};

const parseRemindLead = (message = '') => {
  const minEn = message.match(/(\d+)\s*(min|mins|minute|minutes)\s*before/i);
  if (minEn) return Number(minEn[1]);
  const minZh = message.match(/提前\s*(\d+)\s*分钟/);
  if (minZh) return Number(minZh[1]);
  return 30;
};

const parseTimeHint = (message = '') => {
  const lower = message.toLowerCase();
  if (/morning|早上|上午/.test(lower)) return { hour: 9, minute: 0 };
  if (/noon|中午/.test(lower)) return { hour: 12, minute: 0 };
  if (/afternoon|下午/.test(lower)) return { hour: 15, minute: 0 };
  if (/evening|tonight|晚上|今晚/.test(lower)) return { hour: 19, minute: 0 };
  if (/night|late/.test(lower)) return { hour: 21, minute: 0 };

  return { hour: 18, minute: 0 };
};

const parseExplicitDate = (message = '', now = new Date()) => {
  const fullDate = message.match(/\b(20\d{2})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (fullDate) {
    const d = new Date(now);
    d.setUTCFullYear(Number(fullDate[1]), Number(fullDate[2]) - 1, Number(fullDate[3]));
    return d;
  }

  const shortDate = message.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (shortDate) {
    const d = new Date(now);
    d.setUTCMonth(Number(shortDate[1]) - 1, Number(shortDate[2]));
    return d;
  }

  const zhDate = message.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  if (zhDate) {
    const d = new Date(now);
    d.setUTCMonth(Number(zhDate[1]) - 1, Number(zhDate[2]));
    return d;
  }

  return null;
};

const parseExplicitTime = (message = '') => {
  const hhmm = message.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) {
    return { hour: Number(hhmm[1]), minute: Number(hhmm[2]) };
  }

  const ampm = message.match(/\b(1[0-2]|0?\d)(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2] || 0);
    const marker = ampm[3].toLowerCase();
    if (marker === 'pm' && hour < 12) hour += 12;
    if (marker === 'am' && hour === 12) hour = 0;
    return { hour, minute };
  }

  const zh = message.match(/([01]?\d|2[0-3])\s*点\s*(半|([0-5]?\d)\s*分?)?/);
  if (zh) {
    const hour = Number(zh[1]);
    const minute = zh[2] === '半' ? 30 : Number(zh[3] || 0);
    return { hour, minute };
  }

  return null;
};

const parseEstimatedMinutes = (text = '') => {
  const source = text.toLowerCase();
  const rangeHours = source.match(/(\d+(?:\.\d+)?)\s*(?:-|to|~|–)\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);
  if (rangeHours) {
    const avg = (Number(rangeHours[1]) + Number(rangeHours[2])) / 2;
    return Math.round(avg * 60);
  }
  const rangeMinutes = source.match(/(\d+)\s*(?:-|to|~|–)\s*(\d+)\s*(minutes?|mins?|m)\b/);
  if (rangeMinutes) {
    return Math.round((Number(rangeMinutes[1]) + Number(rangeMinutes[2])) / 2);
  }
  const zhRangeHours = text.match(/(\d+)\s*(?:到|至)\s*(\d+)\s*个?小时/);
  if (zhRangeHours) {
    return Math.round(((Number(zhRangeHours[1]) + Number(zhRangeHours[2])) / 2) * 60);
  }
  const singleHours = source.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);
  if (singleHours) return Math.round(Number(singleHours[1]) * 60);
  const zhHours = text.match(/(\d+(?:\.\d+)?)\s*个?小时/);
  if (zhHours) return Math.round(Number(zhHours[1]) * 60);
  const singleMinutes = source.match(/(\d+)\s*(minutes?|mins?|m)\b/);
  if (singleMinutes) return Number(singleMinutes[1]);
  const zhMinutes = text.match(/(\d+)\s*分钟/);
  if (zhMinutes) return Number(zhMinutes[1]);
  return undefined;
};

const parseISOOffsetMinutes = (iso = '') => {
  const match = iso.match(/([+-])(\d{2}):?(\d{2})$/);
  if (!match) return -8 * 60;
  const sign = match[1] === '+' ? 1 : -1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
};

const toOffsetWallClock = (date, offsetMinutes) => new Date(date.getTime() + offsetMinutes * 60 * 1000);

const fromOffsetWallClock = (wallClockDate, offsetMinutes) =>
  new Date(wallClockDate.getTime() - offsetMinutes * 60 * 1000);

const toISOWithOffset = (date, offsetMinutes) => {
  const wall = toOffsetWallClock(date, offsetMinutes);
  const year = wall.getUTCFullYear();
  const month = String(wall.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wall.getUTCDate()).padStart(2, '0');
  const hour = String(wall.getUTCHours()).padStart(2, '0');
  const minute = String(wall.getUTCMinutes()).padStart(2, '0');
  const second = String(wall.getUTCSeconds()).padStart(2, '0');
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offsetHour = String(Math.floor(abs / 60)).padStart(2, '0');
  const offsetMinute = String(abs % 60).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMinute}`;
};

const resolveDeadline = (message = '', nowISO = new Date().toISOString()) => {
  const now = new Date(nowISO);
  const offsetMinutes = parseISOOffsetMinutes(nowISO);
  const nowWallClock = toOffsetWallClock(now, offsetMinutes);
  const lower = message.toLowerCase();
  let date = new Date(nowWallClock);
  let hasDateCue = false;

  const explicitDate = parseExplicitDate(message, nowWallClock);
  if (explicitDate) {
    date = explicitDate;
    hasDateCue = true;
  } else if (/day after tomorrow|后天/.test(lower)) {
    date.setUTCDate(date.getUTCDate() + 2);
    hasDateCue = true;
  } else if (/tomorrow|明天/.test(lower)) {
    date.setUTCDate(date.getUTCDate() + 1);
    hasDateCue = true;
  } else if (/next week|下周/.test(lower)) {
    date.setUTCDate(date.getUTCDate() + 7);
    hasDateCue = true;
  } else if (/this weekend|weekend|周末/.test(lower)) {
    const day = date.getUTCDay();
    const delta = (6 - day + 7) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + delta);
    hasDateCue = true;
  } else if (/today|今天|tonight|今晚|this evening/.test(lower)) {
    hasDateCue = true;
  }

  const explicitTime = parseExplicitTime(message);
  const hasTimeKeyword = /morning|afternoon|evening|tonight|night|早上|上午|中午|下午|晚上|今晚/.test(lower);
  const shouldSetDeadline = hasDateCue || Boolean(explicitTime) || hasTimeKeyword;
  if (!shouldSetDeadline) return '';

  if (explicitTime) {
    date.setUTCHours(explicitTime.hour, explicitTime.minute, 0, 0);
  } else {
    const hint = parseTimeHint(message);
    date.setUTCHours(hint.hour, hint.minute, 0, 0);
  }

  const deadline = fromOffsetWallClock(date, offsetMinutes);
  if (!hasDateCue && deadline.getTime() <= now.getTime()) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return toISOWithOffset(fromOffsetWallClock(date, offsetMinutes), offsetMinutes);
};

const inferTodoIsland = (task = '', message = '') => {
  const text = `${task} ${message}`.toLowerCase();
  if (/workout|gym|exercise|run|健身|锻炼|运动/.test(text)) return 'body';
  if (/study|class|learn|复习|学习|上课|作业/.test(text)) return 'learning';
  if (/job|interview|resume|application|工作|面试|简历|投递/.test(text)) return 'work';
  if (/friend|family|partner|message|call|朋友|家人|伴侣|联系/.test(text)) return 'relationships';
  if (/journal|reflect|meditate|self-care|冥想|反思|自我关怀/.test(text)) return 'compassion';
  return undefined;
};

const resolveReminderAt = (message = '', deadlineISO = '', nowISO = new Date().toISOString()) => {
  if (!deadlineISO) return '';
  const deadline = new Date(deadlineISO);
  if (!Number.isFinite(deadline.getTime())) return '';

  const offsetMinutes = parseISOOffsetMinutes(nowISO);
  const lead = parseRemindLead(message);
  const remindAt = new Date(deadline.getTime() - lead * 60 * 1000);
  const now = new Date(nowISO);

  if (remindAt.getTime() <= now.getTime()) {
    const minLead = new Date(now.getTime() + 5 * 60 * 1000);
    if (minLead.getTime() < deadline.getTime()) return toISOWithOffset(minLead, offsetMinutes);
    return '';
  }

  return toISOWithOffset(remindAt, offsetMinutes);
};

const inferTodoFallback = (message = '', nowISO = new Date().toISOString()) => {
  const task = extractTaskText(message);
  if (!task) return null;

  const deadline = resolveDeadline(message, nowISO);
  const remindAt = resolveReminderAt(message, deadline, nowISO);
  const estimatedMinutes = parseEstimatedMinutes(message);

  return {
    text: task,
    deadline,
    remindAt,
    estimatedMinutes,
    details: '',
    islandId: inferTodoIsland(task, message),
  };
};

const splitTaskCandidates = (message = '') => {
  return message
    .replace(/\n+/g, '. ')
    .split(/(?:\.\s+|[；;]\s*|[。]\s*|,\s*(?=(?:i\s+need|also|then|and\s+i\s+need))|，\s*(?=(?:我(?:需要|要|得|必须|记得)|也要|然后|还有))|\b(?:also|then)\b)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
};

const inferTodoFallbackList = (message = '', nowISO = new Date().toISOString()) => {
  const chunks = splitTaskCandidates(message);
  const todos = chunks
    .map((chunk) => inferTodoFallback(chunk, nowISO))
    .filter(Boolean);

  const dedup = [];
  const seen = new Set();
  for (const todo of todos) {
    const key = `${todo.text.toLowerCase()}|${todo.deadline || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(todo);
  }
  return dedup;
};

const polishLogText = (value = '') => {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  if (!/[A-Za-z]/.test(text)) return text;
  const withPronoun = text.replace(/\bi\b/g, 'I');
  const normalized = withPronoun.charAt(0).toUpperCase() + withPronoun.slice(1);
  if (/[.!?]$/.test(normalized)) return normalized;
  return `${normalized}.`;
};

const hasEntryContent = (entry = {}) => {
  if (!entry || typeof entry !== 'object') return false;
  return Object.values(entry).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return value === true;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
};

const detectMentionedIslands = (message = '') => {
  const text = message.toLowerCase();
  const checks = [
    { id: 'body', pattern: /\b(body|health|health island|workout|fitness|sleep|gym|exercise)\b|健康|运动|健身|睡眠/ },
    { id: 'work', pattern: /\b(work|work island|job|career|internship|interview|application)\b|工作|求职|实习|面试|投递/ },
    { id: 'learning', pattern: /\b(learning|learning island|study|class|course|homework)\b|学习|课程|上课|作业/ },
    { id: 'relationships', pattern: /\b(relationship|relationships|relationship island|friendship|family|partner|colleague)\b|关系|社交|朋友|家人|伴侣|同事/ },
    { id: 'curiosity', pattern: /\b(curiosity|curiosity island|new thing|discovery|discover)\b|好奇|发现|新事物/ },
    { id: 'compassion', pattern: /\b(compassion|self-compassion|self care|meditation|journal|reflection)\b|自我关怀|冥想|反思/ },
  ];

  const found = checks
    .filter((item) => item.pattern.test(text))
    .map((item) => item.id)
    .filter((item, idx, arr) => arr.indexOf(item) === idx);

  return found;
};

const pickEntriesByIsland = (entries = {}, islandId = '') => {
  const map = {
    body: 'body',
    work: 'work',
    learning: 'learning',
    relationships: 'relationships',
    curiosity: 'curiosity',
    compassion: 'compassion',
  };
  const key = map[islandId];
  if (!key) return {};
  return entries[key] ? { [key]: entries[key] } : {};
};

const hasRemoveIntent = (message = '') =>
  /(remove|delete|clear|drop|erase|discard|cancel|不要|删除|去掉|移除|清空)/i.test(message);

const mergeEntry = (base = {}, patch = {}) => {
  const merged = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      merged[key] = value.trim() ? value : merged[key];
      continue;
    }
    if (Array.isArray(value)) {
      merged[key] = value.length > 0 ? value : merged[key];
      continue;
    }
    merged[key] = value;
  }
  return merged;
};

const mergeDraftInsight = (baseInsight = {}, nextInsight = {}, message = '') => {
  const removeIntent = hasRemoveIntent(message);
  const baseEntries = typeof baseInsight.entries === 'object' && baseInsight.entries ? baseInsight.entries : {};
  const nextEntries = typeof nextInsight.entries === 'object' && nextInsight.entries ? nextInsight.entries : {};

  let mergedEntries = {
    body: mergeEntry(baseEntries.body, nextEntries.body),
    work: mergeEntry(baseEntries.work, nextEntries.work),
    learning: mergeEntry(baseEntries.learning, nextEntries.learning),
    relationships: mergeEntry(baseEntries.relationships, nextEntries.relationships),
    curiosity: mergeEntry(baseEntries.curiosity, nextEntries.curiosity),
    compassion: mergeEntry(baseEntries.compassion, nextEntries.compassion),
  };

  const mentionedIslands = detectMentionedIslands(message);
  let detectedIslands = Array.from(
    new Set([...(baseInsight.detectedIslands || []), ...(nextInsight.detectedIslands || [])]),
  );
  if (mentionedIslands.length === 1) {
    detectedIslands = mentionedIslands;
    mergedEntries = pickEntriesByIsland(mergedEntries, mentionedIslands[0]);
  }

  const mentionsTodo = /(todo|to-do|task|待办|任务|提醒)/i.test(message);
  const todos =
    removeIntent && mentionsTodo
      ? []
      : Array.isArray(nextInsight.todos) && nextInsight.todos.length > 0
        ? nextInsight.todos
        : Array.isArray(baseInsight.todos)
          ? baseInsight.todos
          : [];

  return {
    ...baseInsight,
    ...nextInsight,
    detectedIslands,
    todos,
    memory: nextInsight.memory || baseInsight.memory,
    profileSignals: Array.isArray(nextInsight.profileSignals)
      ? nextInsight.profileSignals
      : Array.isArray(baseInsight.profileSignals)
        ? baseInsight.profileSignals
        : [],
    entries: mergedEntries,
  };
};

const normalizeInsights = (
  raw = {},
  message = '',
  nowISO = new Date().toISOString(),
  preferredLanguage = 'en',
) => {
  const s = (en, zh) => (preferredLanguage === 'zh' ? zh : en);
  const detectedIslands = Array.isArray(raw.detectedIslands)
    ? raw.detectedIslands.filter((item) => ISLAND_TYPES.includes(item))
    : [];
  const todos = Array.isArray(raw.todos)
    ? raw.todos
        .map((todo) => ({
          text: typeof todo?.text === 'string' ? todo.text.trim() : '',
          details: typeof todo?.details === 'string' ? todo.details.trim() : '',
          deadline: typeof todo?.deadline === 'string' ? todo.deadline.trim() : '',
          remindAt: typeof todo?.remindAt === 'string' ? todo.remindAt.trim() : '',
          estimatedMinutes:
            Number.isFinite(Number(todo?.estimatedMinutes)) && Number(todo?.estimatedMinutes) > 0
              ? Math.round(Number(todo.estimatedMinutes))
              : parseEstimatedMinutes(`${todo?.text || ''} ${todo?.details || ''}`),
          importance:
            Number.isFinite(Number(todo?.importance))
              ? clamp(Math.round(Number(todo.importance)), 1, 5)
              : undefined,
          islandId:
            typeof todo?.islandId === 'string' && ISLAND_TYPES.includes(todo.islandId)
              ? todo.islandId
              : undefined,
        }))
        .filter((todo) => todo.text)
    : [];

  const rawEntries = typeof raw.entries === 'object' && raw.entries ? raw.entries : {};
  const rawMemory = typeof raw.memory === 'object' && raw.memory ? raw.memory : null;
  const memory =
    rawMemory && typeof rawMemory.content === 'string' && rawMemory.content.trim()
      ? {
          title:
            typeof rawMemory.title === 'string' && rawMemory.title.trim()
              ? rawMemory.title.trim()
              : s('A memory worth keeping', '一条值得留下的记忆'),
          content: polishLogText(rawMemory.content),
          tags: Array.isArray(rawMemory.tags)
            ? Array.from(
                new Set(
                  rawMemory.tags
                    .filter((tag) => typeof tag === 'string')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                ),
              ).slice(0, 8)
            : [],
          template:
            ['general', 'body', 'progress', 'connection'].includes(rawMemory.template)
              ? rawMemory.template
              : 'general',
          fields:
            rawMemory.fields && typeof rawMemory.fields === 'object'
              ? rawMemory.fields
              : undefined,
        }
      : undefined;
  const entries = {
    ...rawEntries,
    body: rawEntries.body
      ? {
          ...rawEntries.body,
          notes: polishLogText(rawEntries.body.notes),
          mealNotes: polishLogText(rawEntries.body.mealNotes),
        }
      : undefined,
    work: rawEntries.work
      ? {
          ...rawEntries.work,
          progressStep: polishLogText(rawEntries.work.progressStep),
          todaysWin: polishLogText(rawEntries.work.todaysWin),
        }
      : undefined,
    learning: rawEntries.learning
      ? {
          ...rawEntries.learning,
          whatILearned: polishLogText(rawEntries.learning.whatILearned),
        }
      : undefined,
    relationships: rawEntries.relationships
      ? {
          ...rawEntries.relationships,
          momentNote: polishLogText(rawEntries.relationships.momentNote),
          gratitudeNote: polishLogText(rawEntries.relationships.gratitudeNote),
        }
      : undefined,
    curiosity: rawEntries.curiosity
      ? {
          ...rawEntries.curiosity,
          newThingNoticed: polishLogText(rawEntries.curiosity.newThingNoticed),
          newSkillOrFact: polishLogText(rawEntries.curiosity.newSkillOrFact),
        }
      : undefined,
    compassion: rawEntries.compassion
      ? {
          ...rawEntries.compassion,
          reflectionPrompt: polishLogText(rawEntries.compassion.reflectionPrompt),
          journalEntry: polishLogText(rawEntries.compassion.journalEntry),
        }
      : undefined,
  };
  const profileSignals = Array.isArray(raw.profileSignals)
    ? raw.profileSignals
        .map((signal) => ({
          category:
            typeof signal?.category === 'string' && PROFILE_SIGNAL_CATEGORIES.includes(signal.category)
              ? signal.category
              : '',
          value: typeof signal?.value === 'string' ? polishLogText(signal.value).slice(0, 240) : '',
          confidence: Number.isFinite(Number(signal?.confidence))
            ? clamp(Number(signal.confidence), 0.1, 1)
            : 0.6,
          evidence: typeof signal?.evidence === 'string' ? polishLogText(signal.evidence).slice(0, 240) : '',
          sensitivity:
            signal?.sensitivity === 'sensitive' || signal?.sensitivity === 'normal'
              ? signal.sensitivity
              : 'normal',
        }))
        .filter((signal) => signal.category && signal.value)
        .slice(0, 8)
    : [];

  const sourceTodos = inferTodoFallbackList(message, nowISO);
  const sourceAlignedTodos =
    todos.length > 0 && sourceTodos.length === todos.length
      ? todos.map((todo, index) => {
          const sourceTodo = sourceTodos[index];
          return {
            ...todo,
            text: sourceTodo?.text || todo.text,
            deadline: todo.deadline || sourceTodo?.deadline || '',
            remindAt: todo.remindAt || sourceTodo?.remindAt || '',
            estimatedMinutes: todo.estimatedMinutes || sourceTodo?.estimatedMinutes,
            islandId: todo.islandId || sourceTodo?.islandId,
          };
        })
      : todos;
  const fallbackTodos = sourceAlignedTodos.length === 0 ? sourceTodos : [];
  const finalTodos = sourceAlignedTodos.length > 0 ? sourceAlignedTodos : fallbackTodos;
  const mentionedIslands = detectMentionedIslands(message);
  const entryIslands = ISLAND_TYPES.filter((id) => {
    const key = id === 'relationships' ? 'relationships' : id;
    return hasEntryContent(entries[key]);
  });
  const candidateIslands = Array.from(new Set([...detectedIslands, ...entryIslands]));
  const rawNeedsFollowup = finalTodos.length > 0 ? false : Boolean(raw.needsFollowup);
  const rawFollowupQuestion =
    finalTodos.length > 0
      ? ''
      : typeof raw.followupQuestion === 'string' && raw.followupQuestion.trim()
        ? raw.followupQuestion.trim()
        : '';
  const confidence = fallbackTodos.length > 0
    ? Math.max(0.72, Number.isFinite(raw.confidence) ? raw.confidence : 0.72)
    : Number.isFinite(raw.confidence)
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0.65;

  let finalDetected = [...detectedIslands];
  let finalEntries = entries;
  let needsFollowup = rawNeedsFollowup;
  let followupQuestion = rawFollowupQuestion;

  if (mentionedIslands.length === 1 && candidateIslands.length > 1) {
    const selectedIsland = mentionedIslands[0];
    finalDetected = [selectedIsland];
    finalEntries = pickEntriesByIsland(entries, selectedIsland);
    needsFollowup = false;
    followupQuestion = '';
  }

  if (memory) {
    finalDetected = [];
    finalEntries = {};
    needsFollowup = false;
    followupQuestion = '';
  }

  const rawPreview = raw.quickLogPreview && typeof raw.quickLogPreview === 'object' ? raw.quickLogPreview : null;
  const previewTarget =
    rawPreview && ['memory', 'todo', 'harbor', 'followup', 'entry'].includes(rawPreview.target)
      ? rawPreview.target
      : finalTodos.length > 0
        ? 'todo'
        : memory
          ? 'memory'
          : candidateIslands.length > 0
            ? 'entry'
            : needsFollowup
              ? 'followup'
              : 'memory';
  const previewSummary =
    rawPreview && typeof rawPreview.summary === 'string' && rawPreview.summary.trim()
      ? rawPreview.summary.trim().slice(0, 160)
      : finalTodos[0]?.text ||
        memory?.title ||
        memory?.content?.slice(0, 120) ||
        followupQuestion ||
        message.trim().slice(0, 120);
  const quickLogPreview = {
    summary: previewSummary,
    target: previewTarget,
    confidence,
  };

  return {
    assistantReply:
      typeof raw.assistantReply === 'string' && raw.assistantReply.trim()
        ? raw.assistantReply.trim()
        : s('Got it. I will organize and record your update.', '收到。我会整理并记录你的更新。'),
    confidence,
    needsFollowup,
    followupQuestion,
    detectedIslands: finalDetected,
    todos: finalTodos,
    memory,
    quickLogPreview,
    profileSignals,
    entries: finalEntries,
  };
};

const buildPrompt = ({
  message,
  pendingContext,
  routineSettings,
  nowISO,
  draftContext,
  preferredLanguage,
  captureHints,
}) => {
  return `
You are an extraction engine for a self-care game called Mind Islands.

Critical product intent:
- The avatar is the user's "externalized self", not an AI companion.
- Tone must sound like self-reminder / self-encouragement.
- The hub chat is mainly for automated recording into island logs.
- The user prefers recording by default. If uncertain, ask one focused follow-up question.

Current local datetime: ${nowISO}
User routine settings:
${JSON.stringify(routineSettings || {}, null, 2)}

Optional Quick Log capture hints. These are soft UI hints selected by the user; use them to improve routing, tags, mood fields, and template choice, but never replace or translate the user's original wording:
${JSON.stringify(captureHints || null, null, 2)}

If pending context exists, it means your last turn asked a follow-up:
${JSON.stringify(pendingContext || null, null, 2)}

If draft context exists, it is the current unconfirmed draft.
When present, treat the user's message as an edit instruction for this draft:
${JSON.stringify(draftContext || null, null, 2)}

User message:
${message}

Return STRICT JSON only (no markdown, no comments), exactly with this shape:
{
  "assistantReply": "string, concise, warm self-voice",
  "confidence": 0.0,
  "needsFollowup": false,
  "followupQuestion": "string or empty",
  "quickLogPreview": {
    "summary": "short confirmation summary for the Quick Log card",
    "target": "memory|todo|harbor|followup|entry",
    "confidence": 0.0
  },
  "detectedIslands": ["body","work","learning","relationships","curiosity","compassion"],
  "todos": [
    {
      "text": "string, preserve the user's original task wording and language",
      "details": "string or omitted, preserve original language when it comes from the user",
      "deadline": "ISO datetime like 2026-02-24T18:00:00-08:00 or omitted",
      "remindAt": "ISO datetime like 2026-02-24T17:30:00-08:00 or omitted",
      "estimatedMinutes": 90,
      "importance": 1,
      "islandId": "body|work|learning|relationships|curiosity|compassion or omitted"
    }
  ],
  "memory": {
    "title": "short title for a revisitable memory",
    "content": "polished account of the experience or reflection",
    "tags": ["short user-facing theme tags"],
    "template": "general|body|progress|connection",
    "fields": {
      "energyLevel": 3,
      "sleepTime": "23:00",
      "workoutCompleted": true,
      "workoutDuration": 30,
      "progressNote": "optional",
      "learned": "optional",
      "personName": "optional",
      "emotionalResult": 4
    }
  },
  "profileSignals": [
    {
      "category": "stressor|goal|routine|support_style|coping_strategy|relationship_theme|tone_preference|identity|interest",
      "value": "one stable user-profile fact in first-person neutral wording",
      "confidence": 0.0,
      "evidence": "short phrase from the current input that supports this fact",
      "sensitivity": "normal|sensitive"
    }
  ],
  "entries": {
    "body": {
      "sleepTime": "HH:mm or omitted",
      "wakeTime": "HH:mm or omitted",
      "workoutCompleted": true,
      "workoutType": "string or omitted",
      "workoutDuration": 30,
      "workoutTime": "HH:mm or omitted",
      "workoutIntensity": "light|moderate|intense or omitted",
      "ateMealsOnTime": true,
      "mealNotes": "string or omitted",
      "energyLevel": 1,
      "notes": "string or omitted",
      "estimatedFields": ["fieldName"]
    },
    "work": {
      "progressStep": "string",
      "stressLevel": 1,
      "todaysWin": "string or omitted"
    },
    "learning": {
      "focusedStudyMinutes": 45,
      "whatILearned": "string",
      "resources": ["optional string list"]
    },
    "relationships": {
      "category": "friendship|family|partner|colleagues|other",
      "connectedToday": true,
      "interactionType": "message|call|in-person",
      "personName": "string or omitted",
      "emotionalResult": 1,
      "momentNote": "string",
      "gratitudeNote": "string or omitted"
    },
    "curiosity": {
      "newThingNoticed": "string",
      "newSkillOrFact": "string or omitted",
      "tags": ["optional tags"]
    },
    "compassion": {
      "reflectionPrompt": "string or omitted",
      "journalEntry": "string",
      "mood": 1
    }
  }
}

Extraction rules:
- Use 24h HH:mm times only.
- If a value is inferred (e.g., "tonight" -> 20:00), include the field name in estimatedFields.
- Rewrite memory/log free-text content into fluent natural language before returning it. Do not rewrite or translate todos[].text beyond trimming scheduling phrases that are represented by deadline/remindAt.
- Do not add facts that are not explicitly stated or strongly implied.
- Use captureHints only as soft hints. If a mood hint is selected, reflect it in relevant mood/emotional fields when compatible. If a theme hint is selected, prefer that route only when the message supports it.
- If user says tasks like "I need to ... tomorrow", create a todo item.
- If user gives effort duration (e.g., "1-2 hours"), extract estimatedMinutes.
- Use importance (1-5) only when confidence is high (academic/work deadlines usually >=4).
- For todos[].text, preserve the user's original task wording and language as much as possible. If the UI language is English but the user writes a Chinese task, keep the Chinese task text.
- For relative dates (today/tomorrow/this weekend), convert to absolute ISO datetime based on Current local datetime.
- Use the same timezone offset as Current local datetime for all deadline/remindAt values.
- If a reminder is implied ("remind me", "提醒我"), set remindAt. Otherwise you may set remindAt to 30 minutes before deadline when confidence is high.
- For clear task-intent messages (e.g., "I need to do laundry tomorrow"), DO NOT ask follow-up; directly create todo with best-effort deadline/remindAt.
- For a lived moment, reflection, progress update, connection, or observation worth revisiting, create a memory draft with concise theme tags. The user never needs to choose an island first.
- Add profileSignals only for stable, reusable preferences or patterns that would help future support. Do not add one-off events, diagnoses, medical claims, or highly sensitive facts unless the user explicitly frames them as recurring or important.
- Use support_style for how the user likes to be supported, coping_strategy for what helps them regulate, stressor for recurring pressure, goal for durable aims, routine for repeated habits, relationship_theme for recurring social context, tone_preference for language/style preferences, identity for user-stated role/context, interest for durable curiosity.
- Put precise values into memory.fields and select a lightweight memory.template when useful. Only use legacy structured entries when a memory draft is not appropriate.
- If pendingContext exists, use the extra detail to complete the memory or task draft.
- If draftContext exists, update the existing draft instead of starting from empty.
- If draftContext exists and user does not mention a field, keep previous confirmed draft values.
- If draftContext exists and user asks to remove something, remove it explicitly from entries/todos.
- Keep confidence high only if extraction is clear.
- If confidence < 0.55 and key fields are missing, set needsFollowup=true with one short follow-up question.
- If user only chats emotionally with no loggable content, keep entries empty and do not force islands.
- detectedIslands should match entries keys actually populated.
- Output language for assistantReply and followupQuestion must follow preferredLanguage: "${preferredLanguage === 'zh' ? 'zh' : 'en'}".
- For zh: assistantReply and followupQuestion should be natural Simplified Chinese.
- For en: assistantReply and followupQuestion should be natural English.
- Voice style must be self-compassionate self-talk, not therapist or external companion.
`.trim();
};

const COMPASSION_GUARDRAIL_SEVERITY = {
  support: 0,
  elevated: 1,
  dangerous_request: 2,
  crisis: 3,
};

const COMPASSION_GUARDRAIL_ACTIONS = new Set(['comfort', 'refuse', 'handoff']);
const COMPASSION_INTERVENTION_TYPES = new Set(['dbt_abc', 'grounding', 'emotion_reflection']);
const COMPASSION_RESOURCE_KINDS = new Set(['phone', 'text', 'link', 'emergency']);

const getCompassionActionForLevel = (level = 'support') => {
  if (level === 'crisis') return 'handoff';
  if (level === 'dangerous_request') return 'refuse';
  return 'comfort';
};

const hasAnyPattern = (text = '', patterns = []) => patterns.some((pattern) => pattern.test(text));

const detectCompassionSafety = (message = '', history = []) => {
  const text = String(message || '').toLowerCase();
  const recentText = Array.isArray(history)
    ? history
        .slice(-6)
        .map((item) => String(item?.content || '').toLowerCase())
        .join('\n')
    : '';
  const combined = `${recentText}\n${text}`;

  const dangerousRequestPatterns = [
    /\b(how|best|easiest|quickest|painless|effective|tell me|show me|give me|instructions?|method|plan)\b.{0,80}\b(kill myself|end my life|die by suicide|suicide|self[-\s]?harm|cut myself|overdose)\b/i,
    /\b(how|best|easiest|quickest|painless|effective|tell me|show me|give me|instructions?|method|plan)\b.{0,80}\b(kill|hurt|harm|poison|overdose|stab|shoot|attack|bomb)\b/i,
    /(怎么|如何|办法|方法|最快|无痛|教程|步骤|告诉我|帮我).{0,30}(自杀|结束生命|去死|割腕|跳楼|服药|伤害自己|杀人|伤害别人|下毒|炸)/i,
  ];

  const crisisPatterns = [
    /\b(i'?m going to|i am going to|i'?m about to|i plan to|i will|i intend to|right now|tonight)\b.{0,80}\b(kill myself|end my life|die by suicide|suicide)\b/i,
    /\b(i have|i've got).{0,40}\b(plan|weapon|gun|knife|pills|means)\b.{0,80}\b(kill myself|end my life|suicide|hurt myself)\b/i,
    /\b(i can'?t stay safe|i cannot stay safe|i am not safe|i'?m not safe|i took pills|i overdosed)\b/i,
    /\b(i'?m going to|i plan to|i will|i'?m about to)\b.{0,80}\b(kill|hurt|attack|stab|shoot)\b.{0,40}\b(someone|them|him|her|people)\b/i,
    /(我要|我准备|我打算|我现在|今晚|马上).{0,30}(自杀|结束生命|去死|跳楼|割腕|伤害自己|杀人|伤害别人)/i,
    /(我有|已经准备好).{0,30}(计划|刀|药|绳|工具).{0,30}(自杀|伤害自己|伤害别人)/i,
    /(我不安全|我控制不住|我已经吃了很多药|我吞了很多药|我正在流血)/i,
  ];

  const elevatedPatterns = [
    /\b(overwhelmed|ashamed|shame|worthless|helpless|stuck|ruminating|can'?t stop thinking|burned out|burnt out|panic|anxious|depressed|exhausted|spiraling)\b/i,
    /\b(very|really|so|extremely)\s+(bad|low|sad|upset)\b/i,
    /\b(feel|feeling|am)\s+(awful|terrible|horrible|miserable|not okay|not ok)\b/i,
    /\b(in a bad place|in a dark place|rough place)\b/i,
    /(崩溃|羞耻|没用|无助|困住|反复想|停不下来|焦虑|抑郁|很累|撑不住|内耗|逃避|麻木|很难受|非常难受|很痛苦|状态很差|心情.{0,8}(不好|很差|糟糕))/i,
  ];

  const passiveSelfHarmPatterns = [
    /\b(i want to die|i don'?t want to live|i wish i could disappear|i wish i wouldn'?t wake up)\b/i,
    /(不想活|想死|希望自己消失|不想醒来|活着没意思)/i,
  ];

  if (hasAnyPattern(text, crisisPatterns)) {
    return {
      level: 'crisis',
      action: 'handoff',
      shouldShowResourceCard: true,
      reason: 'User appears to describe imminent danger, active self-harm intent, or harm-to-others intent.',
    };
  }

  if (hasAnyPattern(text, passiveSelfHarmPatterns)) {
    return {
      level: 'crisis',
      action: 'handoff',
      shouldShowResourceCard: true,
      reason: 'User appears to describe suicidal or self-harm ideation that needs human support.',
    };
  }

  if (hasAnyPattern(text, dangerousRequestPatterns)) {
    return {
      level: 'dangerous_request',
      action: 'refuse',
      shouldShowResourceCard: true,
      reason: 'User appears to be asking for dangerous instructions or harmful action support.',
    };
  }

  if (hasAnyPattern(combined, elevatedPatterns)) {
    return {
      level: 'elevated',
      action: 'comfort',
      shouldShowResourceCard: false,
      reason: 'User appears emotionally overloaded and may benefit from a light DBT-informed support step.',
    };
  }

  return {
    level: 'support',
    action: 'comfort',
    shouldShowResourceCard: false,
    reason: 'No obvious high-risk pattern detected by deterministic pre-screen.',
  };
};

const hasDirectTodoIntent = (message = '') =>
  Boolean(extractTaskText(message)) || /(todo|to-do|task|remind me|待办|任务|提醒我)/i.test(message);

const buildQuickLogSupportHandoff = (safety, preferredLanguage = 'en') => {
  const level = safety?.level || 'support';
  const isZh = preferredLanguage === 'zh';

  if (level === 'crisis' || level === 'dangerous_request') {
    const message = getSafetyCompassionReply(level, preferredLanguage);
    return {
      assistantReply: message,
      supportHandoff: {
        destination: 'harbor',
        level,
        title: isZh ? '这更适合交给栖息地' : 'This belongs in Harbor',
        message: isZh
          ? '我会把这句话带到栖息地里继续。那里会优先处理安全、稳定和真人支持资源。'
          : 'I can carry this into Harbor, where the next step focuses on safety, steadiness, and human support resources.',
        ctaLabel: isZh ? '去栖息地' : 'Go to Harbor',
      },
    };
  }

  const assistantReply = isZh
    ? '这听起来不只是普通记录，而是一个需要被温柔接住的时刻。我建议先去栖息地，让自己稳一下。'
    : 'This sounds heavier than a normal log. I should take this to Harbor, where the app can support me more gently.';

  return {
    assistantReply,
    supportHandoff: {
      destination: 'harbor',
      level,
      title: isZh ? '去栖息地接住这一刻' : 'Take this to Harbor',
      message: isZh
        ? 'Quick Log 适合捕捉记录；栖息地更适合处理很重的情绪。我可以把刚才这句话带过去，不需要重新输入。'
        : 'Quick Log is for capturing notes; Harbor is better for heavier feelings. I can bring this exact message with me, so I do not have to retype it.',
      ctaLabel: isZh ? '去栖息地' : 'Go to Harbor',
    },
  };
};

const getCompassionCrisisResources = (preferredLanguage = 'en') => {
  if (preferredLanguage === 'zh') {
    return [
      { label: '拨打 988', value: '988', kind: 'phone' },
      { label: '短信 988', value: '988', kind: 'text' },
      { label: '988 在线聊天', value: 'https://988lifeline.org/chat/', kind: 'link' },
      { label: '立即生命危险', value: '如果自己或他人有立即生命危险，请拨打 911 或前往最近急诊。', kind: 'emergency' },
    ];
  }

  return [
    { label: 'Call 988', value: '988', kind: 'phone' },
    { label: 'Text 988', value: '988', kind: 'text' },
    { label: '988 online chat', value: 'https://988lifeline.org/chat/', kind: 'link' },
    { label: 'Immediate danger', value: 'If you or someone else is in immediate physical danger, call 911 or go to the nearest ER.', kind: 'emergency' },
  ];
};

const getDefaultCompassionReply = (preferredLanguage = 'en') =>
  preferredLanguage === 'zh'
    ? '我听见自己了。现在做一个温和的小步骤就已经足够。'
    : 'I hear myself. I can take one gentle step right now, and that is enough.';

const getSafetyCompassionReply = (level = 'support', preferredLanguage = 'en') => {
  if (level === 'crisis') {
    return preferredLanguage === 'zh'
      ? '此刻这件事已经超出 AI 能安全承接的范围了，我需要先把自己的安全放在第一位。请现在联系身边可信任的人，不要独自扛着；如果自己或他人有立即危险，请拨打 911 或去最近的急诊。也可以立刻拨打或短信 988，和真人危机咨询员连接。'
      : 'This is beyond what AI can safely hold on its own, so I need to put immediate safety first. I should contact someone trusted nearby right now and not stay alone with this; if I or someone else is in immediate danger, I should call 911 or go to the nearest ER. I can also call or text 988 now to reach a real crisis counselor.';
  }

  if (level === 'dangerous_request') {
    return preferredLanguage === 'zh'
      ? '我不能帮助自己制定或执行会伤害自己或他人的做法。现在更重要的是先把危险距离拉开：把相关工具放远一点，联系身边可信任的人，或者拨打/短信 988 获得真人支持。我们可以先做一个很短的稳定步骤：把脚踩在地上，慢慢呼气。'
      : "I can't help create or carry out a plan that could hurt me or someone else. The safer next step is to create distance from anything risky, reach out to someone trusted nearby, or call/text 988 for real human support. For this moment, I can put my feet on the floor and take one slow exhale.";
  }

  return getDefaultCompassionReply(preferredLanguage);
};

const getDefaultDbtAbcIntervention = (preferredLanguage = 'en') => {
  if (preferredLanguage === 'zh') {
    return {
      type: 'dbt_abc',
      title: '一张很小的 ABC 卡',
      intro: '可以的话，我们不解决整件事，只帮自己稳住一点点。',
      prompts: [
        { label: 'A', question: '积累一点积极体验：现在有什么很小、无压力、能让自己舒服一点的事？' },
        { label: 'B', question: '建立一点掌控感：接下来 10 分钟内，我能完成哪一件小事？' },
        { label: 'C', question: '提前应对：如果情绪又上来，我希望自己先做什么来保护自己？' },
      ],
      closingPrompt: '先选其中一个格子回答就好，不需要完整。',
    };
  }

  return {
    type: 'dbt_abc',
    title: 'A tiny ABC card',
    intro: "If it feels okay, I don't have to solve the whole thing. I can help myself steady one small piece.",
    prompts: [
      { label: 'A', question: 'Accumulate positive emotion: what is one tiny, low-pressure thing that could feel a little kinder right now?' },
      { label: 'B', question: 'Build mastery: what is one small thing I could finish in the next 10 minutes?' },
      { label: 'C', question: 'Cope ahead: if this feeling rises again, what do I want to do first to protect myself?' },
    ],
    closingPrompt: 'I can answer just one box first. It does not need to be complete.',
  };
};

const normalizeCompassionIntervention = (rawIntervention, preferredLanguage = 'en') => {
  if (!rawIntervention || typeof rawIntervention !== 'object') return null;
  const type = COMPASSION_INTERVENTION_TYPES.has(rawIntervention.type)
    ? rawIntervention.type
    : null;
  if (!type) return null;

  const prompts = Array.isArray(rawIntervention.prompts)
    ? rawIntervention.prompts
        .map((prompt) => ({
          label: String(prompt?.label || '').trim(),
          question: String(prompt?.question || '').trim(),
        }))
        .filter((prompt) => prompt.label && prompt.question)
        .slice(0, 4)
    : [];

  if (prompts.length === 0) return null;

  const fallback = type === 'dbt_abc' ? getDefaultDbtAbcIntervention(preferredLanguage) : null;
  return {
    type,
    title: String(rawIntervention.title || '').trim() || fallback?.title || '',
    intro: String(rawIntervention.intro || '').trim() || fallback?.intro || '',
    prompts,
    closingPrompt: String(rawIntervention.closingPrompt || '').trim() || fallback?.closingPrompt || '',
  };
};

const normalizeCompassionResources = (rawResources, preferredLanguage = 'en') => {
  const resources = Array.isArray(rawResources) ? rawResources : [];
  return resources
    .map((resource) => ({
      label: String(resource?.label || '').trim(),
      value: String(resource?.value || '').trim(),
      kind: COMPASSION_RESOURCE_KINDS.has(resource?.kind) ? resource.kind : 'link',
    }))
    .filter((resource) => resource.label && resource.value)
    .slice(0, 6);
};

const normalizeCompassionResponse = (parsed, { preferredLanguage = 'en', safetyFloor }) => {
  const parsedGuardrail = parsed?.guardrail && typeof parsed.guardrail === 'object' ? parsed.guardrail : {};
  const parsedLevel = Object.prototype.hasOwnProperty.call(
    COMPASSION_GUARDRAIL_SEVERITY,
    parsedGuardrail.level,
  )
    ? parsedGuardrail.level
    : 'support';
  const floorLevel = safetyFloor?.level || 'support';
  const level =
    COMPASSION_GUARDRAIL_SEVERITY[floorLevel] > COMPASSION_GUARDRAIL_SEVERITY[parsedLevel]
      ? floorLevel
      : parsedLevel;
  const action = COMPASSION_GUARDRAIL_ACTIONS.has(parsedGuardrail.action)
    ? parsedGuardrail.action
    : getCompassionActionForLevel(level);
  const forcedAction = getCompassionActionForLevel(level);
  const normalizedAction =
    COMPASSION_GUARDRAIL_SEVERITY[level] >= COMPASSION_GUARDRAIL_SEVERITY.dangerous_request
      ? forcedAction
      : action;
  const shouldShowResourceCard =
    level === 'crisis' || level === 'dangerous_request' || Boolean(parsedGuardrail.shouldShowResourceCard);
  const resources = shouldShowResourceCard
    ? normalizeCompassionResources(parsed?.resources, preferredLanguage).concat(
        getCompassionCrisisResources(preferredLanguage),
      )
    : normalizeCompassionResources(parsed?.resources, preferredLanguage);
  const dedupedResources = resources.filter((resource, index) => {
    const key = `${resource.kind}:${resource.value}`;
    return resources.findIndex((item) => `${item.kind}:${item.value}` === key) === index;
  });

  const reply =
    level === 'crisis' || level === 'dangerous_request'
      ? getSafetyCompassionReply(level, preferredLanguage)
      : typeof parsed?.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : getDefaultCompassionReply(preferredLanguage);

  const parsedIntervention = normalizeCompassionIntervention(parsed?.intervention, preferredLanguage);
  const intervention =
    level === 'crisis' || level === 'dangerous_request'
      ? null
      : parsedIntervention || (level === 'elevated' ? getDefaultDbtAbcIntervention(preferredLanguage) : null);

  return {
    reply,
    guardrail: {
      level,
      action: normalizedAction,
      shouldShowResourceCard,
      reason: String(parsedGuardrail.reason || safetyFloor?.reason || '').trim(),
    },
    intervention,
    resources: dedupedResources,
  };
};

const buildCompassionPrompt = ({ message, history, context, nowISO, preferredLanguage, safetyFloor }) => {
  return `
You are the user's self-compassion inner voice in an app called Mind Islands.

Critical role:
- You are NOT a therapist and NOT an external authority.
- Speak as a light self-compassion guide: warm, concrete, emotionally present, never preachy or clinical.
- Keep response concise (3-6 short sentences).
- Do not diagnose, do not claim to treat, and do not say "as your therapist".
- Use at most 1-2 concrete details from saved context.

Four-layer boundary system:
1. Comfort response: validate ordinary emotion, normalize humanity, offer one tiny next step.
2. Risk recognition: watch for self-harm, harm-to-others, urgent danger, coercion, or destabilization.
3. Dangerous advice refusal: never provide tactics, methods, instructions, optimization, or plans for harm.
4. Human handoff: when risk exceeds AI support, route to trusted people, 988, 911, or emergency care.

Deterministic safety floor from backend pre-screen:
${JSON.stringify(safetyFloor || {}, null, 2)}
You may raise risk above this floor, but you must never downgrade below it.

Current local datetime: ${nowISO}

Recent life context from records:
${JSON.stringify(context || {}, null, 2)}

Recent conversation:
${JSON.stringify(history || [], null, 2)}

Latest user message:
${message}

Response rules:
- Use concrete acknowledgement based on context when possible ("I remember..." / "I noticed...").
- If user sounds low, follow 3 steps: validate feeling -> normalize humanity -> offer one tiny next step.
- If user sounds positive, reinforce progress without exaggeration and reflect one reason it worked.
- Prefer gentle language like "I can...", "let me...", "it's okay...".
- Avoid generic motivational slogans and avoid command-heavy tone.
- Output language must follow preferredLanguage: "${preferredLanguage === 'zh' ? 'zh' : 'en'}".
- If suitable, ask one short reflection question at the end.
- If context has recent records, reference 1-2 concrete details briefly.
- If elevated but not crisis, you may naturally invite a DBT ABC card when the user shows overwhelm, shame, avoidance, rumination, helplessness, or low mood.
- DBT ABC means only: A = Accumulate positive emotion, B = Build mastery, C = Cope ahead.
- Do not offer DBT ABC during crisis, dangerous requests, or ordinary light positive chat.
- If no structured exercise is useful, set intervention to null.
- If crisis, stop ordinary coaching and recommend immediate human support.

Return STRICT JSON only:
{
  "reply": "string",
  "guardrail": {
    "level": "support|elevated|dangerous_request|crisis",
    "action": "comfort|refuse|handoff",
    "shouldShowResourceCard": false,
    "reason": "short internal reason"
  },
  "intervention": null or {
    "type": "dbt_abc|grounding|emotion_reflection",
    "title": "string",
    "intro": "string",
    "prompts": [
      { "label": "A", "question": "string" }
    ],
    "closingPrompt": "string"
  },
  "resources": [
    { "label": "string", "value": "string", "kind": "phone|text|link|emergency" }
  ]
}
`.trim();
};

const sanitizeTags = (input = []) => {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input
    .map((tag) => String(tag || '').trim())
    .filter((tag) => tag.length > 0)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
};

const fallbackIdeaTitle = (message = '') => {
  const cleaned = message.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New idea';
  const words = cleaned.split(' ').slice(0, 8).join(' ');
  return words.length > 60 ? `${words.slice(0, 57)}...` : words;
};

const normalizeIdeaDraft = (rawDraft, message = '') => {
  if (!rawDraft || typeof rawDraft !== 'object') return null;
  const title = String(rawDraft.title || '').trim() || fallbackIdeaTitle(message);
  const content = polishLogText(String(rawDraft.content || '').trim() || message);
  const tags = sanitizeTags(rawDraft.tags);
  if (!content) return null;
  return {
    title: title.length > 80 ? `${title.slice(0, 77)}...` : title,
    content,
    tags,
  };
};

const normalizeThreadSummary = (value = '') => {
  const summary = polishLogText(String(value || '').trim());
  if (!summary) return '';
  return summary.length > 520 ? `${summary.slice(0, 517)}...` : summary;
};

const buildCuriosityPrompt = ({
  message,
  history,
  context,
  nowISO,
  activeThread,
  gapMinutes,
  preferredLanguage,
}) => {
  return `
You are the Curiosity Idea Lab assistant inside Mind Islands.

Core role:
- Help the user explore half-formed ideas and make them clearer.
- Keep the exchange playful, warm, and thoughtful.
- This chat is for idea discussion, not for task logging.
- Output language must follow preferredLanguage: "${preferredLanguage === 'zh' ? 'zh' : 'en'}".

Current local datetime: ${nowISO}

Recent context:
${JSON.stringify(context || {}, null, 2)}

Recent chat:
${JSON.stringify(history || [], null, 2)}

Current active thread (if any):
${JSON.stringify(activeThread || null, null, 2)}

Minutes since last message in active thread:
${typeof gapMinutes === 'number' ? gapMinutes : null}

Latest user message:
${message}

Return STRICT JSON only:
{
  "reply": "string",
  "topicShift": false,
  "topicShiftReason": "string",
  "threadSummary": "string",
  "nextTopicTitle": "string",
  "ideaDraft": {
    "title": "short title",
    "content": "clean natural-language summary in first person",
    "tags": ["tag1", "tag2"]
  },
  "shouldSaveIdea": false
}

Rules:
- "reply" should be 2-5 short sentences.
- If user is brainstorming, ask one useful next-step question at most.
- If user asks to save/capture/archive this idea, set shouldSaveIdea=true.
- If content is too vague to save, still return a helpful reply and leave ideaDraft with best-effort concise wording.
- If activeThread exists and new message is clearly a different topic, set topicShift=true.
- Also consider long silence as a strong topicShift signal (especially gapMinutes >= 90).
- If topicShift=true, generate threadSummary as a concise conclusion of the previous thread:
  what was explored, what was clarified, and one practical next step.
- If topicShift=false, keep threadSummary empty.
- Do not invent factual details; only rewrite what user provided.
`.trim();
};

const safeJsonArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);

const sanitizeIslandList = (value = []) =>
  safeJsonArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => ISLAND_TYPES.includes(item))
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 6);

const sanitizeMemorySource = (value = '') =>
  MEMORY_SOURCES.includes(value) ? value : 'manual';

const sanitizeMemoryTemplate = (value = '') =>
  MEMORY_TEMPLATES.includes(value) ? value : 'general';

const sanitizeSensitivityLevel = (value = '') =>
  MEMORY_SENSITIVITY_LEVELS.includes(value) ? value : 'normal';

const normalizeMemorySettings = (row = {}) => ({
  saveMemoriesEnabled:
    typeof row.save_memories_enabled === 'boolean'
      ? row.save_memories_enabled
      : DEFAULT_MEMORY_SETTINGS.saveMemoriesEnabled,
  profileLearningEnabled:
    typeof row.profile_learning_enabled === 'boolean'
      ? row.profile_learning_enabled
      : DEFAULT_MEMORY_SETTINGS.profileLearningEnabled,
  aiPersonalizationEnabled:
    typeof row.ai_personalization_enabled === 'boolean'
      ? row.ai_personalization_enabled
      : DEFAULT_MEMORY_SETTINGS.aiPersonalizationEnabled,
  harborMemoryEnabled:
    typeof row.harbor_memory_enabled === 'boolean'
      ? row.harbor_memory_enabled
      : DEFAULT_MEMORY_SETTINGS.harborMemoryEnabled,
});

const ensureMemorySettings = async (userId) => {
  const result = await dbPool.query(
    `
    INSERT INTO user_memory_settings (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING save_memories_enabled, profile_learning_enabled, ai_personalization_enabled, harbor_memory_enabled
    `,
    [userId],
  );
  return normalizeMemorySettings(result.rows[0]);
};

const rowToMemoryEvent = (row) => ({
  id: String(row.id),
  source: row.source,
  title: row.title,
  content: ciphertextOrPlain(row.content_ciphertext, row.content),
  tags: safeJsonArray(row.tags),
  islands: sanitizeIslandList(row.islands),
  template: row.template,
  fields: row.fields_ciphertext ? decryptJson(row.fields_ciphertext, {}) : row.fields || undefined,
  pinned: Boolean(row.pinned),
  sensitivityLevel: row.sensitivity_level,
  sourceMessage: ciphertextOrPlain(row.source_message_ciphertext, row.source_message) || undefined,
  legacyKey: row.legacy_key || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at || undefined,
});

const rowToProfileFact = (row) => ({
  id: String(row.id),
  category: row.category,
  value: ciphertextOrPlain(row.value_ciphertext, row.value),
  confidence: Number(row.confidence),
  evidenceMemoryIds: safeJsonArray(row.evidence_memory_ids).map(String),
  active: Boolean(row.active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  retractedAt: row.retracted_at || undefined,
});

const rowToProfileSummary = (row, fallback = {}) => {
  if (!row) return fallback;
  if (row.summary_ciphertext) return decryptJson(row.summary_ciphertext, fallback);
  return row.summary_json || fallback;
};

const normalizeProfileSignalsForMemory = (signals = []) =>
  safeJsonArray(signals)
    .map((signal) => ({
      category:
        typeof signal?.category === 'string' && PROFILE_SIGNAL_CATEGORIES.includes(signal.category)
          ? signal.category
          : '',
      value: typeof signal?.value === 'string' ? polishLogText(signal.value).slice(0, 240) : '',
      confidence: Number.isFinite(Number(signal?.confidence))
        ? clamp(Number(signal.confidence), 0.1, 1)
        : 0.6,
      evidence: typeof signal?.evidence === 'string' ? polishLogText(signal.evidence).slice(0, 240) : '',
      sensitivity: sanitizeSensitivityLevel(signal?.sensitivity),
    }))
    .filter((signal) => signal.category && signal.value)
    .slice(0, 8);

const inferProfileSignalsFromMemory = (memory = {}) => {
  const text = `${memory.title || ''} ${memory.content || ''} ${safeJsonArray(memory.tags).join(' ')}`;
  const lower = text.toLowerCase();
  const signals = [];

  if (/(stress|stressed|overwhelm|overwhelmed|burnout|burned out|anxious|焦虑|压力|崩溃|内耗|撑不住)/i.test(text)) {
    signals.push({
      category: 'stressor',
      value: memory.title || memory.content.slice(0, 120),
      confidence: 0.55,
      evidence: memory.content.slice(0, 160),
      sensitivity: 'normal',
    });
  }
  if (/(helps me|helped me|works for me|calm|breathe|walk|journal|对我有帮助|让我平静|呼吸|散步|记录)/i.test(text)) {
    signals.push({
      category: 'coping_strategy',
      value: memory.content.slice(0, 160),
      confidence: 0.55,
      evidence: memory.content.slice(0, 160),
      sensitivity: 'normal',
    });
  }
  if (/(goal|want to|trying to|working toward|目标|想要|正在努力|计划)/i.test(text)) {
    signals.push({
      category: 'goal',
      value: memory.title || memory.content.slice(0, 140),
      confidence: lower.includes('goal') || text.includes('目标') ? 0.65 : 0.52,
      evidence: memory.content.slice(0, 160),
      sensitivity: 'normal',
    });
  }

  return signals.slice(0, 4);
};

const compactFactsByCategory = (facts = [], category, limit = 5) =>
  facts
    .filter((fact) => fact.category === category && fact.active)
    .sort((a, b) => Number(b.confidence) - Number(a.confidence))
    .slice(0, limit)
    .map((fact) => {
      const value = ciphertextOrPlain(fact.value_ciphertext, fact.value);
      return {
        id: String(fact.id),
        value,
        confidence: Number(fact.confidence),
        evidenceMemoryIds: safeJsonArray(fact.evidence_memory_ids).map(String),
      };
    });

const buildProfileSummaryJson = ({ facts = [], pinnedMemories = [], recentMilestones = [] }) => ({
  knownStressors: compactFactsByCategory(facts, 'stressor'),
  goals: compactFactsByCategory(facts, 'goal'),
  routines: compactFactsByCategory(facts, 'routine'),
  helpfulSupportStyle: compactFactsByCategory(facts, 'support_style', 4),
  copingStrategies: compactFactsByCategory(facts, 'coping_strategy', 5),
  relationshipThemes: compactFactsByCategory(facts, 'relationship_theme', 5),
  tonePreferences: compactFactsByCategory(facts, 'tone_preference', 4),
  identityContext: compactFactsByCategory(facts, 'identity', 4),
  interests: compactFactsByCategory(facts, 'interest', 5),
  pinnedMemories: pinnedMemories.map((memory) => ({
    id: String(memory.id),
    title: memory.title,
    content: memory.content.length > 240 ? `${memory.content.slice(0, 237)}...` : memory.content,
    tags: safeJsonArray(memory.tags).slice(0, 6),
  })),
  recentMilestones: recentMilestones.map((memory) => ({
    id: String(memory.id),
    title: memory.title,
    content: memory.content.length > 180 ? `${memory.content.slice(0, 177)}...` : memory.content,
    tags: safeJsonArray(memory.tags).slice(0, 6),
  })),
});

const rebuildUserProfileSummary = async (userId) => {
  const [factsResult, pinnedResult, milestoneResult] = await Promise.all([
    dbPool.query(
      `
      SELECT id, category, value, value_ciphertext, confidence, evidence_memory_ids, active
      FROM user_profile_facts
      WHERE user_id = $1 AND active = TRUE
      ORDER BY confidence DESC, updated_at DESC
      `,
      [userId],
    ),
    dbPool.query(
      `
      SELECT id, title, content, content_ciphertext, tags
      FROM user_memory_events
      WHERE user_id = $1 AND deleted_at IS NULL AND pinned = TRUE AND sensitivity_level = 'normal'
      ORDER BY updated_at DESC
      LIMIT 5
      `,
      [userId],
    ),
    dbPool.query(
      `
      SELECT id, title, content, content_ciphertext, tags
      FROM user_memory_events
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND sensitivity_level = 'normal'
        AND (template = 'progress' OR tags ? 'progress')
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [userId],
    ),
  ]);
  const summary = buildProfileSummaryJson({
    facts: factsResult.rows,
    pinnedMemories: pinnedResult.rows.map((row) => ({
      ...row,
      content: ciphertextOrPlain(row.content_ciphertext, row.content),
    })),
    recentMilestones: milestoneResult.rows.map((row) => ({
      ...row,
      content: ciphertextOrPlain(row.content_ciphertext, row.content),
    })),
  });
  const encryptedSummary = encryptionKey ? encryptJson(summary) : null;
  await dbPool.query(
    `
    INSERT INTO user_profile_summaries (user_id, summary_json, summary_ciphertext, updated_at)
    VALUES ($1, $2::jsonb, $3, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      summary_json = EXCLUDED.summary_json,
      summary_ciphertext = EXCLUDED.summary_ciphertext,
      updated_at = NOW()
    `,
    [userId, encryptionKey ? JSON.stringify({ encrypted: true }) : JSON.stringify(summary), encryptedSummary],
  );
  return summary;
};

const applyProfileSignalsForMemory = async (userId, memoryId, signals = [], memory = {}) => {
  const normalized = normalizeProfileSignalsForMemory(signals);
  const candidates = normalized.length > 0 ? normalized : inferProfileSignalsFromMemory(memory);
  for (const signal of candidates) {
    const valueHash = searchableHash(signal.value);
    const found = await dbPool.query(
      `
      SELECT id, confidence, evidence_memory_ids
      FROM user_profile_facts
      WHERE user_id = $1
        AND active = TRUE
        AND category = $2
        AND (
          value_lookup_hash = $3
          OR (value_lookup_hash IS NULL AND lower(value) = lower($4))
        )
      LIMIT 1
      `,
      [userId, signal.category, valueHash, signal.value],
    );
    if (found.rowCount > 0) {
      const row = found.rows[0];
      const evidence = Array.from(new Set([...safeJsonArray(row.evidence_memory_ids).map(String), String(memoryId)]));
      const confidence = Math.min(1, Math.max(Number(row.confidence), signal.confidence));
      await dbPool.query(
        `
        UPDATE user_profile_facts
        SET confidence = $1, evidence_memory_ids = $2::jsonb, updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        `,
        [confidence, JSON.stringify(evidence), row.id, userId],
      );
    } else {
      const encryptedValue = encryptionKey ? encryptText(signal.value) : null;
      await dbPool.query(
        `
        INSERT INTO user_profile_facts (
          user_id, category, value, value_ciphertext, value_lookup_hash,
          confidence, evidence_memory_ids, active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE, NOW(), NOW())
        `,
        [
          userId,
          signal.category,
          encryptionKey ? '[encrypted]' : signal.value,
          encryptedValue,
          valueHash,
          signal.confidence,
          JSON.stringify([String(memoryId)]),
        ],
      );
    }
  }
  return rebuildUserProfileSummary(userId);
};

const retractProfileEvidenceForMemory = async (userId, memoryId) => {
  const result = await dbPool.query(
    `
    SELECT id, evidence_memory_ids
    FROM user_profile_facts
    WHERE user_id = $1 AND active = TRUE AND evidence_memory_ids ? $2
    `,
    [userId, String(memoryId)],
  );
  for (const row of result.rows) {
    const nextEvidence = safeJsonArray(row.evidence_memory_ids)
      .map(String)
      .filter((id) => id !== String(memoryId));
    if (nextEvidence.length === 0) {
      await dbPool.query(
        `
        UPDATE user_profile_facts
        SET active = FALSE, retracted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        `,
        [row.id, userId],
      );
    } else {
      await dbPool.query(
        `
        UPDATE user_profile_facts
        SET evidence_memory_ids = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        `,
        [JSON.stringify(nextEvidence), row.id, userId],
      );
    }
  }
  return rebuildUserProfileSummary(userId);
};

const normalizeMemoryPayload = (payload = {}) => {
  const title = String(payload.title || '').trim();
  const content = String(payload.content || '').trim();
  return {
    source: sanitizeMemorySource(payload.source),
    title: title || 'Memory',
    content,
    tags: sanitizeTags(payload.tags || []),
    islands: sanitizeIslandList(payload.islands || payload.detectedIslands || []),
    template: sanitizeMemoryTemplate(payload.template),
    fields: payload.fields && typeof payload.fields === 'object' ? payload.fields : null,
    pinned: Boolean(payload.pinned),
    sensitivityLevel: sanitizeSensitivityLevel(payload.sensitivityLevel),
    sourceMessage: typeof payload.sourceMessage === 'string' ? payload.sourceMessage.trim() : '',
    legacyKey: typeof payload.legacyKey === 'string' && payload.legacyKey.trim() ? payload.legacyKey.trim() : null,
    profileSignals: normalizeProfileSignalsForMemory(payload.profileSignals || []),
  };
};

const createMemoryEventForUser = async (userId, payload = {}) => {
  const settings = await ensureMemorySettings(userId);
  if (!settings.saveMemoriesEnabled) {
    const error = new Error('memory_saving_disabled');
    error.status = 403;
    throw error;
  }

  const memory = normalizeMemoryPayload(payload);
  if (!memory.content) {
    const error = new Error('memory_content_required');
    error.status = 400;
    throw error;
  }

  const result = await dbPool.query(
    `
    INSERT INTO user_memory_events (
      user_id, source, title, content, content_ciphertext, tags, islands, template,
      fields, fields_ciphertext, pinned, sensitivity_level, source_message,
      source_message_ciphertext, legacy_key, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8,
      $9::jsonb, $10, $11, $12, $13, $14, $15, NOW(), NOW()
    )
    ON CONFLICT (user_id, legacy_key) WHERE legacy_key IS NOT NULL
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      content_ciphertext = EXCLUDED.content_ciphertext,
      tags = EXCLUDED.tags,
      islands = EXCLUDED.islands,
      template = EXCLUDED.template,
      fields = EXCLUDED.fields,
      fields_ciphertext = EXCLUDED.fields_ciphertext,
      sensitivity_level = EXCLUDED.sensitivity_level,
      source_message = EXCLUDED.source_message,
      source_message_ciphertext = EXCLUDED.source_message_ciphertext,
      deleted_at = NULL,
      updated_at = NOW()
    RETURNING *
    `,
    [
      userId,
      memory.source,
      memory.title,
      encryptionKey ? '[encrypted]' : memory.content,
      encryptionKey ? encryptText(memory.content) : null,
      JSON.stringify(memory.tags),
      JSON.stringify(memory.islands),
      memory.template,
      encryptionKey ? JSON.stringify({ encrypted: true }) : JSON.stringify(memory.fields || {}),
      encryptionKey ? encryptJson(memory.fields || {}) : null,
      memory.pinned,
      memory.sensitivityLevel,
      encryptionKey ? (memory.sourceMessage ? '[encrypted]' : '') : memory.sourceMessage,
      encryptionKey ? encryptNullableText(memory.sourceMessage) : null,
      memory.legacyKey,
    ],
  );
  const event = rowToMemoryEvent(result.rows[0]);
  if (settings.profileLearningEnabled) {
    await applyProfileSignalsForMemory(userId, event.id, memory.profileSignals, event);
  } else {
    await rebuildUserProfileSummary(userId);
  }
  return event;
};

const loadHarborContextForUser = async (userId) => {
  const settings = await ensureMemorySettings(userId);
  if (!settings.aiPersonalizationEnabled || !settings.harborMemoryEnabled) {
    return {
      enabled: false,
      summary: {},
      pinnedMemories: [],
    };
  }
  const summaryResult = await dbPool.query(
    'SELECT summary_json, summary_ciphertext FROM user_profile_summaries WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  const summary =
    summaryResult.rowCount > 0 ? rowToProfileSummary(summaryResult.rows[0]) : await rebuildUserProfileSummary(userId);
  return {
    enabled: true,
    summary,
    pinnedMemories: safeJsonArray(summary.pinnedMemories).slice(0, 5),
  };
};

app.post('/api/auth/send-verification-code', authRateLimiter, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res, { allowOffline: false })) return;

    const email = normalizeEmail(req.body?.email);
    const username = normalizeUsername(req.body?.username);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'invalid_email' });
    }

    const existingUser = await dbPool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: 'email_already_registered' });
    }

    const previous = await dbPool.query(
      'SELECT last_sent_at FROM email_verifications WHERE email = $1 LIMIT 1',
      [email],
    );
    if (previous.rowCount > 0) {
      const elapsed = Date.now() - new Date(previous.rows[0].last_sent_at).getTime();
      if (elapsed < VERIFICATION_RESEND_COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          error: 'verification_code_too_frequent',
          retryAfterSec,
        });
      }
    }

    const code = generateVerificationCode();
    const codeHash = buildVerificationHash(email, code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    await dbPool.query(
      `
      INSERT INTO email_verifications (
        email, code_hash, expires_at, attempts_remaining, sent_count, last_sent_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
      ON CONFLICT (email)
      DO UPDATE SET
        code_hash = EXCLUDED.code_hash,
        expires_at = EXCLUDED.expires_at,
        attempts_remaining = EXCLUDED.attempts_remaining,
        sent_count = email_verifications.sent_count + 1,
        last_sent_at = NOW(),
        updated_at = NOW()
      `,
      [email, codeHash, expiresAt.toISOString(), VERIFICATION_MAX_ATTEMPTS],
    );

    await sendVerificationEmail({ email, username, code });
    return res.json({
      ok: true,
      expiresInSec: Math.floor(VERIFICATION_CODE_TTL_MS / 1000),
      resendAfterSec: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
      ...(IS_PRODUCTION ? {} : !emailTransporter ? { devCode: code } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'email_service_not_configured') {
      return res.status(503).json({ error: 'email_service_not_configured' });
    }
    return res.status(500).json({
      error: 'send_verification_code_failed',
      details: message,
    });
  }
});

app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  let client = null;
  try {
    if (!requireAuthConfig(res)) return;

    const username = normalizeUsername(req.body?.username);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const verificationCode = String(req.body?.verificationCode || '').trim();

    if (!username || username.length < 2 || username.length > 32) {
      return res.status(400).json({ error: 'invalid_username' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'invalid_email' });
    }
    if (!password || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'invalid_password' });
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      return res.status(400).json({ error: 'invalid_verification_code' });
    }

    client = await dbPool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1',
      [username, email],
    );
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'user_already_exists' });
    }

    const verification = await client.query(
      `
      SELECT email, code_hash, expires_at, attempts_remaining, consumed_at
      FROM email_verifications
      WHERE email = $1
      FOR UPDATE
      `,
      [email],
    );
    if (verification.rowCount === 0 || verification.rows[0].consumed_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'verification_code_required' });
    }

    const verificationRow = verification.rows[0];
    if (new Date(verificationRow.expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'verification_code_expired' });
    }
    if (Number(verificationRow.attempts_remaining) <= 0) {
      await client.query('ROLLBACK');
      return res.status(429).json({ error: 'verification_code_locked' });
    }

    const expectedHash = buildVerificationHash(email, verificationCode);
    if (!timingSafeEqualString(expectedHash, verificationRow.code_hash)) {
      await client.query(
        `
        UPDATE email_verifications
        SET attempts_remaining = GREATEST(attempts_remaining - 1, 0),
            updated_at = NOW()
        WHERE email = $1
        `,
        [email],
      );
      await client.query('COMMIT');
      return res.status(400).json({ error: 'invalid_verification_code' });
    }

    await client.query(
      `
      UPDATE email_verifications
      SET consumed_at = NOW(), updated_at = NOW()
      WHERE email = $1
      `,
      [email],
    );

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await client.query(
      `
      INSERT INTO users (username, email, password_hash, email_verified_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, username, email, email_verified_at, created_at
      `,
      [username, email, passwordHash],
    );
    await client.query('COMMIT');

    const user = toSafeUser(created.rows[0]);
    const token = signAuthToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ user });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback errors
      }
    }
    return res.status(500).json({
      error: 'register_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  try {
    if (!requireAuthConfig(res)) return;

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_credentials' });
    }

    const found = await dbPool.query(
      'SELECT id, username, email, password_hash, email_verified_at, created_at FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    if (found.rowCount === 0) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const userRow = found.rows[0];
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    if (!userRow.email_verified_at) {
      return res.status(403).json({ error: 'email_not_verified' });
    }

    const user = toSafeUser(userRow);
    const token = signAuthToken(user);
    setAuthCookie(res, token);
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({
      error: 'login_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/auth/logout', authRateLimiter, (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ user: req.authUser });
});

app.get('/api/state', requireAuth, async (req, res) => {
  try {
    const result = await dbPool.query(
      'SELECT state_json, state_ciphertext, updated_at FROM user_states WHERE user_id = $1 LIMIT 1',
      [Number(req.authUser.id)],
    );
    if (result.rowCount === 0) {
      return res.json({ state: null, updatedAt: null });
    }
    return res.json({
      state: result.rows[0].state_ciphertext
        ? decryptJson(result.rows[0].state_ciphertext, null)
        : result.rows[0].state_json,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'load_state_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.put('/api/state', requireAuth, async (req, res) => {
  try {
    const state = req.body?.state;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'invalid_state_payload' });
    }

    await dbPool.query(
      `
      INSERT INTO user_states (user_id, state_json, state_ciphertext, updated_at)
      VALUES ($1, $2::jsonb, $3, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        state_json = EXCLUDED.state_json,
        state_ciphertext = EXCLUDED.state_ciphertext,
        updated_at = NOW()
      `,
      [
        Number(req.authUser.id),
        encryptionKey ? JSON.stringify({ encrypted: true }) : JSON.stringify(state),
        encryptionKey ? encryptJson(state) : null,
      ],
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: 'save_state_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/memory/settings', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    const settings = await ensureMemorySettings(Number(req.authUser.id));
    return res.json({ settings });
  } catch (error) {
    return res.status(500).json({
      error: 'load_memory_settings_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.put('/api/memory/settings', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    const current = await ensureMemorySettings(Number(req.authUser.id));
    const input = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : req.body || {};
    const next = {
      saveMemoriesEnabled:
        typeof input.saveMemoriesEnabled === 'boolean' ? input.saveMemoriesEnabled : current.saveMemoriesEnabled,
      profileLearningEnabled:
        typeof input.profileLearningEnabled === 'boolean' ? input.profileLearningEnabled : current.profileLearningEnabled,
      aiPersonalizationEnabled:
        typeof input.aiPersonalizationEnabled === 'boolean' ? input.aiPersonalizationEnabled : current.aiPersonalizationEnabled,
      harborMemoryEnabled:
        typeof input.harborMemoryEnabled === 'boolean' ? input.harborMemoryEnabled : current.harborMemoryEnabled,
    };
    const result = await dbPool.query(
      `
      UPDATE user_memory_settings
      SET save_memories_enabled = $1,
          profile_learning_enabled = $2,
          ai_personalization_enabled = $3,
          harbor_memory_enabled = $4,
          updated_at = NOW()
      WHERE user_id = $5
      RETURNING save_memories_enabled, profile_learning_enabled, ai_personalization_enabled, harbor_memory_enabled
      `,
      [
        next.saveMemoriesEnabled,
        next.profileLearningEnabled,
        next.aiPersonalizationEnabled,
        next.harborMemoryEnabled,
        Number(req.authUser.id),
      ],
    );
    await rebuildUserProfileSummary(Number(req.authUser.id));
    return res.json({ settings: normalizeMemorySettings(result.rows[0]) });
  } catch (error) {
    return res.status(500).json({
      error: 'save_memory_settings_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/memories', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    await ensureMemorySettings(Number(req.authUser.id));
    const result = await dbPool.query(
      `
      SELECT *
      FROM user_memory_events
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 500
      `,
      [Number(req.authUser.id)],
    );
    return res.json({ memories: result.rows.map(rowToMemoryEvent) });
  } catch (error) {
    return res.status(500).json({
      error: 'load_memories_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/memories', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    const event = await createMemoryEventForUser(Number(req.authUser.id), req.body || {});
    return res.status(201).json({ memory: event });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error instanceof Error ? error.message : 'create_memory_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.put('/api/memories/:id', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    const memoryId = Number(req.params.id);
    if (!Number.isFinite(memoryId) || memoryId <= 0) {
      return res.status(400).json({ error: 'invalid_memory_id' });
    }
    const current = await dbPool.query(
      'SELECT id FROM user_memory_events WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1',
      [memoryId, Number(req.authUser.id)],
    );
    if (current.rowCount === 0) return res.status(404).json({ error: 'memory_not_found' });

    const memory = normalizeMemoryPayload(req.body || {});
    if (!memory.content) return res.status(400).json({ error: 'memory_content_required' });

    const result = await dbPool.query(
      `
      UPDATE user_memory_events
      SET source = $1,
          title = $2,
          content = $3,
          content_ciphertext = $4,
          tags = $5::jsonb,
          islands = $6::jsonb,
          template = $7,
          fields = $8::jsonb,
          fields_ciphertext = $9,
          pinned = $10,
          sensitivity_level = $11,
          source_message = $12,
          source_message_ciphertext = $13,
          updated_at = NOW()
      WHERE id = $14 AND user_id = $15 AND deleted_at IS NULL
      RETURNING *
      `,
      [
        memory.source,
        memory.title,
        encryptionKey ? '[encrypted]' : memory.content,
        encryptionKey ? encryptText(memory.content) : null,
        JSON.stringify(memory.tags),
        JSON.stringify(memory.islands),
        memory.template,
        encryptionKey ? JSON.stringify({ encrypted: true }) : JSON.stringify(memory.fields || {}),
        encryptionKey ? encryptJson(memory.fields || {}) : null,
        memory.pinned,
        memory.sensitivityLevel,
        encryptionKey ? (memory.sourceMessage ? '[encrypted]' : '') : memory.sourceMessage,
        encryptionKey ? encryptNullableText(memory.sourceMessage) : null,
        memoryId,
        Number(req.authUser.id),
      ],
    );
    const event = rowToMemoryEvent(result.rows[0]);
    await retractProfileEvidenceForMemory(Number(req.authUser.id), event.id);
    const settings = await ensureMemorySettings(Number(req.authUser.id));
    if (settings.profileLearningEnabled) {
      await applyProfileSignalsForMemory(Number(req.authUser.id), event.id, memory.profileSignals, event);
    }
    return res.json({ memory: event });
  } catch (error) {
    return res.status(500).json({
      error: 'update_memory_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.delete('/api/memories/:id', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    const memoryId = Number(req.params.id);
    if (!Number.isFinite(memoryId) || memoryId <= 0) {
      return res.status(400).json({ error: 'invalid_memory_id' });
    }
    const result = await dbPool.query(
      `
      UPDATE user_memory_events
      SET deleted_at = NOW(), updated_at = NOW(), pinned = FALSE
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id
      `,
      [memoryId, Number(req.authUser.id)],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'memory_not_found' });
    await retractProfileEvidenceForMemory(Number(req.authUser.id), String(memoryId));
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: 'delete_memory_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    const userId = Number(req.authUser.id);
    const settings = await ensureMemorySettings(userId);
    const factsResult = await dbPool.query(
      `
      SELECT *
      FROM user_profile_facts
      WHERE user_id = $1 AND active = TRUE
      ORDER BY category ASC, confidence DESC, updated_at DESC
      LIMIT 200
      `,
      [userId],
    );
    const summaryResult = await dbPool.query(
      'SELECT summary_json, summary_ciphertext, updated_at FROM user_profile_summaries WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const summary =
      summaryResult.rowCount > 0
        ? rowToProfileSummary(summaryResult.rows[0])
        : await rebuildUserProfileSummary(userId);
    const harborContext = await loadHarborContextForUser(userId);
    return res.json({
      settings,
      facts: factsResult.rows.map(rowToProfileFact),
      summary,
      harborContext,
      updatedAt: summaryResult.rows[0]?.updated_at || null,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'load_profile_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.delete('/api/profile/facts/:id', requireAuth, async (req, res) => {
  try {
    if (!requireDatabaseConfig(res)) return;
    const factId = Number(req.params.id);
    if (!Number.isFinite(factId) || factId <= 0) {
      return res.status(400).json({ error: 'invalid_profile_fact_id' });
    }
    const result = await dbPool.query(
      `
      UPDATE user_profile_facts
      SET active = FALSE, retracted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND active = TRUE
      RETURNING id
      `,
      [factId, Number(req.authUser.id)],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'profile_fact_not_found' });
    await rebuildUserProfileSummary(Number(req.authUser.id));
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: 'delete_profile_fact_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/health', async (_req, res) => {
  const dbReachable = await checkDatabaseConnection();
  res.json({
    ok: true,
    model: GEMINI_MODEL,
    hasKey: Boolean(GEMINI_API_KEY),
    hasDb: Boolean(dbPool),
    hasJwtSecret: Boolean(JWT_SECRET),
    hasDataEncryptionKey: Boolean(DATA_ENCRYPTION_KEY),
    hasEmailConfig,
    hasAppOrigin: Boolean(APP_ORIGIN),
    dbReachable,
    localOfflineMode: LOCAL_OFFLINE_MODE,
    cookieSecure: COOKIE_SECURE,
  });
});

app.get('/api/ready', async (_req, res) => {
  const dbReachable = await checkDatabaseConnection();
  if (
    !Boolean(dbPool) ||
    !Boolean(JWT_SECRET) ||
    !Boolean(DATA_ENCRYPTION_KEY) ||
    !Boolean(GEMINI_API_KEY) ||
    !Boolean(APP_ORIGIN) ||
    !hasEmailConfig ||
    !dbReachable
  ) {
    return res.status(503).json({
      ok: false,
      hasDb: Boolean(dbPool),
      hasJwtSecret: Boolean(JWT_SECRET),
      hasDataEncryptionKey: Boolean(DATA_ENCRYPTION_KEY),
      hasKey: Boolean(GEMINI_API_KEY),
      hasEmailConfig,
      hasAppOrigin: Boolean(APP_ORIGIN),
      dbReachable,
    });
  }

  return res.json({ ok: true });
});

app.post('/api/chat-insights', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { message, pendingContext, routineSettings, nowISO, draftContext, preferredLanguage, captureHints } =
      req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const language = preferredLanguage === 'zh' ? 'zh' : 'en';
    const safety = detectCompassionSafety(message, []);
    const shouldOfferHarbor =
      !pendingContext &&
      !draftContext &&
      COMPASSION_GUARDRAIL_SEVERITY[safety.level] >= COMPASSION_GUARDRAIL_SEVERITY.elevated &&
      !hasDirectTodoIntent(message);
    if (shouldOfferHarbor) {
      const handoff = buildQuickLogSupportHandoff(safety, language);
      return res.json({
        assistantReply: handoff.assistantReply,
        confidence: safety.level === 'elevated' ? 0.78 : 0.95,
        detectedIslands: ['compassion'],
        needsFollowup: false,
        followupQuestion: '',
        todos: [],
        memory: undefined,
        quickLogPreview: {
          summary: handoff.supportHandoff.title,
          target: 'harbor',
          confidence: safety.level === 'elevated' ? 0.78 : 0.95,
        },
        profileSignals: [],
        supportHandoff: handoff.supportHandoff,
        entries: {},
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in environment' });
    }

    const prompt = buildPrompt({
      message,
      pendingContext: pendingContext || null,
      routineSettings: routineSettings || {},
      nowISO: nowISO || new Date().toISOString(),
      draftContext: draftContext || null,
      preferredLanguage: language,
      captureHints: captureHints && typeof captureHints === 'object' ? captureHints : null,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'gemini_request_failed', details: errText });
    }

    const data = await response.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('\n')
        .trim() || '{}';

    let parsed;
    try {
      parsed = JSON.parse(cleanJson(rawText));
    } catch {
      return res.status(500).json({ error: 'invalid_json_from_model', raw: rawText });
    }

    const normalized = normalizeInsights(
      parsed,
      message,
      nowISO || new Date().toISOString(),
      language,
    );
    const draftBase =
      draftContext && typeof draftContext === 'object' && typeof draftContext.insight === 'object'
        ? draftContext.insight
        : null;

    if (draftBase && !normalized.needsFollowup) {
      return res.json(mergeDraftInsight(draftBase, normalized, message));
    }

    return res.json(normalized);
  } catch (error) {
    return res.status(500).json({
      error: 'internal_server_error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/compassion-chat', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { message, history, context, nowISO, preferredLanguage } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in environment' });
    }

    const normalizedHistory = Array.isArray(history) ? history.slice(-10) : [];
    const language = preferredLanguage === 'zh' ? 'zh' : 'en';
    const safetyFloor = detectCompassionSafety(message, normalizedHistory);
    const memoryProfile = dbPool
      ? await loadHarborContextForUser(Number(req.authUser.id))
      : { enabled: false, summary: {}, pinnedMemories: [] };
    const safeContext = {
      ...(typeof context === 'object' && context ? context : {}),
      memoryProfile,
    };
    const prompt = buildCompassionPrompt({
      message,
      history: normalizedHistory,
      context: safeContext,
      nowISO: nowISO || new Date().toISOString(),
      preferredLanguage: language,
      safetyFloor,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'gemini_request_failed', details: errText });
    }

    const data = await response.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('\n')
        .trim() || '{}';

    let parsed;
    try {
      parsed = JSON.parse(cleanJson(rawText));
    } catch {
      return res.status(500).json({ error: 'invalid_json_from_model', raw: rawText });
    }

    return res.json(normalizeCompassionResponse(parsed, { preferredLanguage: language, safetyFloor }));
  } catch (error) {
    return res.status(500).json({
      error: 'internal_server_error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/curiosity-chat', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { message, history, context, nowISO, activeThread, gapMinutes, preferredLanguage } =
      req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in environment' });
    }

    const prompt = buildCuriosityPrompt({
      message,
      history: Array.isArray(history) ? history.slice(-12) : [],
      context: typeof context === 'object' && context ? context : {},
      nowISO: nowISO || new Date().toISOString(),
      activeThread: activeThread && typeof activeThread === 'object' ? activeThread : null,
      gapMinutes:
        Number.isFinite(Number(gapMinutes)) && Number(gapMinutes) >= 0
          ? Math.round(Number(gapMinutes))
          : null,
      preferredLanguage: preferredLanguage === 'zh' ? 'zh' : 'en',
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'gemini_request_failed', details: errText });
    }

    const data = await response.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('\n')
        .trim() || '{}';

    let parsed;
    try {
      parsed = JSON.parse(cleanJson(rawText));
    } catch {
      return res.status(500).json({ error: 'invalid_json_from_model', raw: rawText });
    }

    const reply =
      typeof parsed?.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : preferredLanguage === 'zh'
          ? '这个想法很有火花。我可以先帮你整理清楚，再继续往下推进。'
          : 'Interesting spark. I can shape this into a clearer idea and keep building from here.';
    const ideaDraft = normalizeIdeaDraft(parsed?.ideaDraft, message);
    const shouldSaveIdea = Boolean(parsed?.shouldSaveIdea);
    const fallbackShift =
      Boolean(activeThread && typeof activeThread === 'object' && activeThread.id) &&
      Number.isFinite(Number(gapMinutes)) &&
      Number(gapMinutes) >= 120;
    const topicShift = Boolean(parsed?.topicShift) || fallbackShift;
    const topicShiftReason =
      typeof parsed?.topicShiftReason === 'string' && parsed.topicShiftReason.trim()
        ? parsed.topicShiftReason.trim()
        : topicShift
          ? fallbackShift
            ? preferredLanguage === 'zh'
              ? '与上一条想法线程间隔时间较长。'
              : 'Long gap since the previous idea thread.'
            : preferredLanguage === 'zh'
              ? '检测到你正在进入一个不同的话题方向。'
              : 'Detected a different idea direction.'
          : '';
    const threadSummary = topicShift ? normalizeThreadSummary(parsed?.threadSummary) : '';
    const nextTopicTitle =
      typeof parsed?.nextTopicTitle === 'string' && parsed.nextTopicTitle.trim()
        ? parsed.nextTopicTitle.trim()
        : ideaDraft?.title || fallbackIdeaTitle(message);

    return res.json({
      reply,
      ideaDraft,
      shouldSaveIdea,
      topicShift,
      topicShiftReason,
      threadSummary,
      nextTopicTitle,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'internal_server_error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

if (NODE_ENV === 'production') {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const startServer = async () => {
  try {
    validateRuntimeConfig();
    await runDatabaseMigrations();
    if (IS_PRODUCTION) {
      const dbReachable = await checkDatabaseConnection();
      if (!dbReachable) {
        throw new Error('Database is not reachable in production.');
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[startup] failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[mind-islands-api] listening on http://localhost:${PORT} (${NODE_ENV})`);
  });
};

startServer();
