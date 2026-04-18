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
const AUTH_COOKIE_NAME = 'mind_islands_auth';
const AUTH_COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const VERIFICATION_CODE_TTL_MS = 1000 * 60 * 10;
const VERIFICATION_RESEND_COOLDOWN_MS = 1000 * 60;
const VERIFICATION_MAX_ATTEMPTS = 8;
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

const toSafeUser = (row) => ({
  id: String(row.id),
  username: row.username,
  email: row.email,
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
  if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
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
      'SELECT id, username, email, created_at FROM users WHERE id = $1 LIMIT 1',
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS user_states (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      email VARCHAR(255) PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts_remaining INT NOT NULL DEFAULT ${VERIFICATION_MAX_ATTEMPTS},
      sent_count INT NOT NULL DEFAULT 1,
      last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbPool.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at
    ON email_verifications (expires_at);
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
      /\b(tomorrow|today|tonight|this weekend|next week|this week|this evening)\b/gi,
      '',
    )
    .replace(/\b(at|around|before|by)\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\b(on)\s+\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/gi, '')
    .replace(/\b(on)\s+\d{1,2}[/-]\d{1,2}\b/gi, '')
    .replace(/(明天|今天|今晚|下周|这周|周末|早上|上午|中午|下午|晚上|今晚)/g, '')
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
    /(?:todo|to-do)\s*[:：]\s*(.+)/i,
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
    .split(/(?:\.\s+|;\s+|,\s*(?=(?:i\s+need|also|then|and\s+i\s+need))|\b(?:also|then)\b)/i)
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

  const fallbackTodos = todos.length === 0 ? inferTodoFallbackList(message, nowISO) : [];
  const finalTodos = todos.length > 0 ? todos : fallbackTodos;
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
  } else if (candidateIslands.length > 1 && finalTodos.length === 0) {
    needsFollowup = true;
    followupQuestion = `I can log this. Which island should I put it in: ${candidateIslands
      .map((id) => id.charAt(0).toUpperCase() + id.slice(1))
      .join(', ')}?`;
    if (preferredLanguage === 'zh') {
      followupQuestion = `我可以帮你记录。你希望放到哪个岛屿：${candidateIslands
        .map((id) => {
          if (id === 'body') return '健康';
          if (id === 'work') return '工作';
          if (id === 'learning') return '学习';
          if (id === 'relationships') return '关系';
          if (id === 'curiosity') return '好奇';
          if (id === 'compassion') return '自我关怀';
          return id;
        })
        .join('、')}？`;
    }
    finalEntries = {};
    finalDetected = [];
  }

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
  "detectedIslands": ["body","work","learning","relationships","curiosity","compassion"],
  "todos": [
    {
      "text": "string",
      "details": "string or omitted",
      "deadline": "ISO datetime like 2026-02-24T18:00:00-08:00 or omitted",
      "remindAt": "ISO datetime like 2026-02-24T17:30:00-08:00 or omitted",
      "estimatedMinutes": 90,
      "importance": 1,
      "islandId": "body|work|learning|relationships|curiosity|compassion or omitted"
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
- Rewrite any free-text log content into fluent natural language before returning it.
- Do not add facts that are not explicitly stated or strongly implied.
- If user says tasks like "I need to ... tomorrow", create a todo item.
- If user gives effort duration (e.g., "1-2 hours"), extract estimatedMinutes.
- Use importance (1-5) only when confidence is high (academic/work deadlines usually >=4).
- For relative dates (today/tomorrow/this weekend), convert to absolute ISO datetime based on Current local datetime.
- Use the same timezone offset as Current local datetime for all deadline/remindAt values.
- If a reminder is implied ("remind me", "提醒我"), set remindAt. Otherwise you may set remindAt to 30 minutes before deadline when confidence is high.
- For clear task-intent messages (e.g., "I need to do laundry tomorrow"), DO NOT ask follow-up; directly create todo with best-effort deadline/remindAt.
- Usually one message should map to one island.
- If the message could belong to multiple islands and the user did not specify one clearly, set needsFollowup=true and ask which island to use.
- If pendingContext exists and the user replies with an island choice, use that island and complete logging.
- If draftContext exists, update the existing draft instead of starting from empty.
- If draftContext exists and user does not mention a field, keep previous confirmed draft values.
- If draftContext exists and user asks to remove something, remove it explicitly from entries/todos.
- Keep confidence high only if extraction is clear.
- If confidence < 0.55 and key fields are missing, set needsFollowup=true with one short follow-up question.
- If user only chats emotionally with no loggable content, keep entries empty and do not force islands.
- detectedIslands should match entries keys actually populated.
- Output language must follow preferredLanguage: "${preferredLanguage === 'zh' ? 'zh' : 'en'}".
- For zh: assistantReply and followupQuestion should be natural Simplified Chinese.
- For en: assistantReply and followupQuestion should be natural English.
- Voice style must be self-compassionate self-talk, not therapist or external companion.
`.trim();
};

const buildCompassionPrompt = ({ message, history, context, nowISO, preferredLanguage }) => {
  return `
You are the user's self-compassion inner voice in an app called Mind Islands.

Critical role:
- You are NOT a therapist and NOT an external authority.
- Speak as the user's caring inner self (first-person self-talk style).
- Tone: warm, natural, emotionally present, never preachy.
- Keep response concise (3-6 short sentences).

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

Return STRICT JSON only:
{
  "reply": "string"
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

app.post('/api/auth/send-verification-code', async (req, res) => {
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

app.post('/api/auth/register', async (req, res) => {
  let client = null;
  try {
    if (!requireAuthConfig(res)) return;

    const username = normalizeUsername(req.body?.username);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!username || username.length < 2 || username.length > 32) {
      return res.status(400).json({ error: 'invalid_username' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'invalid_email' });
    }
    if (!password || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'invalid_password' });
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

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await client.query(
      `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
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

app.post('/api/auth/login', async (req, res) => {
  try {
    if (!requireAuthConfig(res)) return;

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_credentials' });
    }

    const found = await dbPool.query(
      'SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1',
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

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ user: req.authUser });
});

app.get('/api/state', requireAuth, async (req, res) => {
  try {
    const result = await dbPool.query(
      'SELECT state_json, updated_at FROM user_states WHERE user_id = $1 LIMIT 1',
      [Number(req.authUser.id)],
    );
    if (result.rowCount === 0) {
      return res.json({ state: null, updatedAt: null });
    }
    return res.json({
      state: result.rows[0].state_json,
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
      INSERT INTO user_states (user_id, state_json, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = NOW()
      `,
      [Number(req.authUser.id), JSON.stringify(state)],
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: 'save_state_failed',
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
    dbReachable,
    localOfflineMode: LOCAL_OFFLINE_MODE,
    cookieSecure: COOKIE_SECURE,
  });
});

app.get('/api/ready', async (_req, res) => {
  const dbReachable = await checkDatabaseConnection();
  if (!Boolean(dbPool) || !Boolean(JWT_SECRET) || !Boolean(GEMINI_API_KEY) || !dbReachable) {
    return res.status(503).json({
      ok: false,
      hasDb: Boolean(dbPool),
      hasJwtSecret: Boolean(JWT_SECRET),
      hasKey: Boolean(GEMINI_API_KEY),
      dbReachable,
    });
  }

  return res.json({ ok: true });
});

app.post('/api/chat-insights', requireAuth, async (req, res) => {
  try {
    const { message, pendingContext, routineSettings, nowISO, draftContext, preferredLanguage } =
      req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
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
      preferredLanguage === 'zh' ? 'zh' : 'en',
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

app.post('/api/compassion-chat', requireAuth, async (req, res) => {
  try {
    const { message, history, context, nowISO, preferredLanguage } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in environment' });
    }

    const prompt = buildCompassionPrompt({
      message,
      history: Array.isArray(history) ? history.slice(-10) : [],
      context: typeof context === 'object' && context ? context : {},
      nowISO: nowISO || new Date().toISOString(),
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

    const reply =
      typeof parsed?.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : preferredLanguage === 'zh'
          ? '我会陪着自己。现在先做一个温和的小步骤就好。'
          : "I'm here with myself. Let me take one small, kind step right now.";

    return res.json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: 'internal_server_error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/curiosity-chat', requireAuth, async (req, res) => {
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
