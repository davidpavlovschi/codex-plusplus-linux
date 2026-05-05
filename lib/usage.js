import {
  existsSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  closeSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join, relative } from "node:path";

export const DEFAULT_CODEX_DIR = join(homedir(), ".codex");

export const GPT_PRICING_USD_PER_MILLION_TOKENS = Object.freeze({
  "gpt-5.5": Object.freeze({ input: 5.0, cachedInput: 0.5, output: 30.0 }),
  "gpt-5.4": Object.freeze({ input: 2.5, cachedInput: 0.25, output: 15.0 }),
  "gpt-5.4-mini": Object.freeze({ input: 0.75, cachedInput: 0.075, output: 4.5 }),
});

const DEFAULT_LIMITS = Object.freeze({
  maxFiles: 500,
  maxDepth: 8,
  maxSessionBytes: 5 * 1024 * 1024,
  maxHistoryBytes: 2 * 1024 * 1024,
  maxLogBytes: 128 * 1024,
  maxJsonlLines: 20000,
});

const TOKEN_KEYS = Object.freeze({
  inputTokens: ["input_tokens", "inputTokens", "prompt_tokens", "promptTokens"],
  cachedInputTokens: ["cached_input_tokens", "cachedInputTokens", "cached_tokens", "cachedTokens"],
  outputTokens: ["output_tokens", "outputTokens", "completion_tokens", "completionTokens"],
  reasoningOutputTokens: ["reasoning_output_tokens", "reasoningOutputTokens", "reasoning_tokens", "reasoningTokens"],
  totalTokens: ["total_tokens", "totalTokens"],
});

export function readCodexUsage(options = {}) {
  const codexDir = options.codexDir || DEFAULT_CODEX_DIR;
  const now = options.now ? new Date(options.now) : new Date();
  const defaultModel = options.defaultModel || "gpt-5.5";
  const warnings = [];

  const sessions = readCodexSessions({ ...options, codexDir, warnings });
  const history = readCodexHistory({ ...options, codexDir, warnings });
  const logs = readCodexLogs({ ...options, codexDir, warnings });
  const usage = aggregateCodexUsage(sessions.sessions, { now, defaultModel, warnings });

  return {
    generatedAt: now.toISOString(),
    codexDir,
    pricing: GPT_PRICING_USD_PER_MILLION_TOKENS,
    usage,
    sessions: sessions.sessions,
    history: history.entries,
    logs: logs.logs,
    sources: mergeSources(sessions.sources, history.sources, logs.sources),
    warnings: unique(warnings),
  };
}

export function readCodexSessions(options = {}) {
  const codexDir = options.codexDir || DEFAULT_CODEX_DIR;
  const warnings = options.warnings || [];
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const roots = [
    join(codexDir, "sessions"),
    join(codexDir, "archived_sessions"),
  ];
  const files = roots.flatMap((root) => listFiles(root, {
    maxFiles: limits.maxFiles,
    maxDepth: limits.maxDepth,
    extensions: [".jsonl"],
    warnings,
  })).sort(byMtimeThenPath);

  const sessions = [];
  const sources = sourceSummary("sessions", roots);
  for (const file of files.slice(-limits.maxFiles)) {
    sources.scanned.push(sourceRecord(codexDir, file));
    const parsed = parseSessionFile(file, codexDir, limits, warnings);
    if (parsed) sessions.push(parsed);
  }

  if (files.length === 0) warnings.push(`no Codex session JSONL files found under ${roots.map((r) => displayPath(codexDir, r)).join(", ")}`);
  sources.count = sources.scanned.length;
  return { sessions, sources };
}

export function readCodexHistory(options = {}) {
  const codexDir = options.codexDir || DEFAULT_CODEX_DIR;
  const warnings = options.warnings || [];
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const file = join(codexDir, "history.jsonl");
  const sources = sourceSummary("history", [file]);
  const entries = [];

  if (!existsSync(file)) {
    warnings.push(`Codex history file missing: ${displayPath(codexDir, file)}`);
    return { entries, sources };
  }

  sources.scanned.push(sourceRecord(codexDir, file));
  for (const { value, timestamp, line } of readJsonl(file, limits.maxHistoryBytes, limits.maxJsonlLines, warnings)) {
    entries.push({
      sessionId: stringOrNull(value.session_id || value.sessionId),
      timestamp: timestamp || timestampFromEpoch(value.ts),
      text: typeof value.text === "string" ? value.text : "",
      source: { path: displayPath(codexDir, file), line },
    });
  }
  sources.count = sources.scanned.length;
  return { entries, sources };
}

export function readCodexLogs(options = {}) {
  const codexDir = options.codexDir || DEFAULT_CODEX_DIR;
  const warnings = options.warnings || [];
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  const roots = [
    join(codexDir, "log"),
    codexDir,
  ];
  const files = [
    ...listFiles(join(codexDir, "log"), { maxFiles: limits.maxFiles, maxDepth: 2, extensions: [".log"], warnings }),
    ...listFiles(codexDir, { maxFiles: limits.maxFiles, maxDepth: 1, extensions: [".sqlite"], warnings }),
  ].sort(byMtimeThenPath).slice(-limits.maxFiles);
  const sources = sourceSummary("logs", roots);
  const logs = [];

  for (const file of files) {
    sources.scanned.push(sourceRecord(codexDir, file));
    if (file.endsWith(".sqlite")) {
      logs.push({
        path: displayPath(codexDir, file),
        kind: "sqlite",
        entries: [],
        warning: "sqlite log detected but not parsed; no external sqlite dependency is used",
      });
      warnings.push(`sqlite log not parsed without external dependency: ${displayPath(codexDir, file)}`);
      continue;
    }

    const text = readBoundedText(file, limits.maxLogBytes, warnings);
    logs.push({
      path: displayPath(codexDir, file),
      kind: "text",
      bytesRead: Buffer.byteLength(text),
      entries: parseLogLines(text, codexDir, file),
    });
  }

  sources.count = sources.scanned.length;
  return { logs, sources };
}

export function aggregateCodexUsage(sessions, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const defaultModel = options.defaultModel || "gpt-5.5";
  const warnings = options.warnings || [];
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const weekStart = startOfLocalWeek(now);
  const nextWeekStart = addDays(weekStart, 7);
  const usableSessions = sessions.filter((session) => session.usageEventCount > 0);
  const latest = usableSessions.toSorted((a, b) => dateMs(a.lastUsageAt || a.updatedAt) - dateMs(b.lastUsageAt || b.updatedAt)).at(-1) || null;

  if (sessions.length > 0 && usableSessions.length === 0) {
    warnings.push("Codex sessions were found, but no usable token_count events with token fields were present");
  }

  return {
    today: aggregateWindow(usableSessions, todayStart, tomorrowStart, defaultModel),
    week: aggregateWindow(usableSessions, weekStart, nextWeekStart, defaultModel),
    current: latest ? aggregateSessions([latest], defaultModel) : emptyAggregate(defaultModel),
    windows: {
      todayStart: todayStart.toISOString(),
      weekStart: weekStart.toISOString(),
      currentSessionId: latest?.id || null,
    },
  };
}

export function estimateUsdForUsage(tokens, model = "gpt-5.5") {
  const pricing = GPT_PRICING_USD_PER_MILLION_TOKENS[normalizeModel(model)] || GPT_PRICING_USD_PER_MILLION_TOKENS["gpt-5.5"];
  const billableOutput = number(tokens.outputTokens) + number(tokens.reasoningOutputTokens);
  const uncachedInput = Math.max(0, number(tokens.inputTokens) - number(tokens.cachedInputTokens));
  const cachedInput = number(tokens.cachedInputTokens);
  const usd =
    (uncachedInput * pricing.input / 1_000_000) +
    (cachedInput * pricing.cachedInput / 1_000_000) +
    (billableOutput * pricing.output / 1_000_000);

  return roundUsd(usd);
}

function parseSessionFile(file, codexDir, limits, warnings) {
  const session = {
    id: sessionIdFromFile(file),
    path: displayPath(codexDir, file),
    createdAt: null,
    updatedAt: null,
    cwd: null,
    model: null,
    usage: emptyTokens(),
    usageEventCount: 0,
    lastUsageAt: null,
    lastRateLimits: null,
    warnings: [],
  };

  for (const { value, timestamp, line } of readJsonl(file, limits.maxSessionBytes, limits.maxJsonlLines, warnings)) {
    const eventTime = timestamp || timestampFromPayload(value);
    if (eventTime) {
      session.createdAt ||= eventTime;
      session.updatedAt = maxIso(session.updatedAt, eventTime);
    }

    const payload = value.payload || {};
    if (value.type === "session_meta" && payload) {
      session.id = stringOrNull(payload.id) || session.id;
      session.createdAt ||= stringOrNull(payload.timestamp);
      session.cwd ||= stringOrNull(payload.cwd);
      session.model ||= normalizeModel(payload.model || payload.model_slug || payload.modelSlug);
    }
    if (value.type === "turn_context" && payload) {
      session.cwd ||= stringOrNull(payload.cwd);
      session.model ||= normalizeModel(payload.model || payload?.collaboration_mode?.settings?.model);
    }

    const usage = extractUsageFromRecord(value);
    if (!usage) continue;

    if (!usage.hasPricedFields) {
      session.warnings.push(`line ${line}: token_count has total_tokens but no input/output split`);
    } else {
      session.usage = usage.tokens;
      session.usageEventCount += 1;
      session.lastUsageAt = eventTime || session.lastUsageAt;
    }
    if (payload.rate_limits) session.lastRateLimits = payload.rate_limits;
  }

  if (session.usageEventCount === 0 && session.warnings.length > 0) {
    warnings.push(`${session.path}: token data exists but lacks billable input/output fields`);
  }

  return session;
}

function extractUsageFromRecord(record) {
  const payload = record.payload || {};
  if (record.type !== "event_msg" || payload.type !== "token_count") return null;
  const info = payload.info || {};
  const raw = info.total_token_usage || info.totalTokenUsage || info.last_token_usage || info.lastTokenUsage || info.usage || null;
  if (!raw || typeof raw !== "object") return { tokens: emptyTokens(), hasPricedFields: false };

  const tokens = {
    inputTokens: pickNumber(raw, TOKEN_KEYS.inputTokens),
    cachedInputTokens: pickNumber(raw, TOKEN_KEYS.cachedInputTokens),
    outputTokens: pickNumber(raw, TOKEN_KEYS.outputTokens),
    reasoningOutputTokens: pickNumber(raw, TOKEN_KEYS.reasoningOutputTokens),
    totalTokens: pickNumber(raw, TOKEN_KEYS.totalTokens),
  };
  const hasPricedFields = tokens.inputTokens > 0 || tokens.cachedInputTokens > 0 || tokens.outputTokens > 0 || tokens.reasoningOutputTokens > 0;
  return { tokens, hasPricedFields };
}

function aggregateWindow(sessions, start, end, defaultModel) {
  return aggregateSessions(sessions.filter((session) => {
    const t = dateMs(session.lastUsageAt || session.updatedAt || session.createdAt);
    return t >= start.getTime() && t < end.getTime();
  }), defaultModel);
}

function aggregateSessions(sessions, defaultModel) {
  const totals = emptyTokens();
  const byModel = {};

  for (const session of sessions) {
    addTokens(totals, session.usage);
    const model = normalizeModel(session.model) || defaultModel;
    byModel[model] ||= { tokens: emptyTokens(), estimatedUsd: 0, sessions: 0 };
    addTokens(byModel[model].tokens, session.usage);
    byModel[model].sessions += 1;
  }

  for (const [model, item] of Object.entries(byModel)) {
    item.estimatedUsd = estimateUsdForUsage(item.tokens, model);
  }

  return {
    sessions: sessions.length,
    tokens: totals,
    estimatedUsd: roundUsd(Object.values(byModel).reduce((sum, item) => sum + item.estimatedUsd, 0)),
    byModel,
  };
}

function emptyAggregate(defaultModel) {
  return { sessions: 0, tokens: emptyTokens(), estimatedUsd: 0, byModel: {}, defaultModel };
}

function emptyTokens() {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

function addTokens(target, source) {
  for (const key of Object.keys(target)) target[key] += number(source?.[key]);
}

function readJsonl(file, maxBytes, maxLines, warnings) {
  const text = readBoundedText(file, maxBytes, warnings);
  const lines = text.split("\n").slice(-maxLines);
  const records = [];
  lines.forEach((lineText, index) => {
    const trimmed = lineText.trim();
    if (!trimmed || !trimmed.startsWith("{")) return;
    try {
      const value = JSON.parse(trimmed);
      records.push({
        value,
        timestamp: stringOrNull(value.timestamp),
        line: index + 1,
      });
    } catch {
      warnings.push(`${file}: skipped invalid JSONL line near bounded read offset ${index + 1}`);
    }
  });
  return records;
}

function readBoundedText(file, maxBytes, warnings) {
  try {
    const stat = statSync(file);
    if (stat.size <= maxBytes) return readFileSync(file, "utf8");

    const fd = openSync(file, "r");
    try {
      const buffer = Buffer.alloc(maxBytes);
      readSync(fd, buffer, 0, maxBytes, stat.size - maxBytes);
      warnings.push(`${file}: read last ${maxBytes} bytes of ${stat.size} bytes`);
      const text = buffer.toString("utf8");
      const firstNewline = text.indexOf("\n");
      return firstNewline >= 0 ? text.slice(firstNewline + 1) : text;
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    warnings.push(`${file}: ${error.message}`);
    return "";
  }
}

function listFiles(root, options) {
  const warnings = options.warnings || [];
  const out = [];
  if (!existsSync(root)) return out;

  function walk(dir, depth) {
    if (out.length >= options.maxFiles || depth > options.maxDepth) return;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      warnings.push(`${dir}: ${error.message}`);
      return;
    }

    for (const entry of entries) {
      if (out.length >= options.maxFiles) return;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path, depth + 1);
      } else if (entry.isFile() && options.extensions.some((ext) => path.endsWith(ext))) {
        out.push(path);
      }
    }
  }

  walk(root, 0);
  return out;
}

function parseLogLines(text, codexDir, file) {
  return text.split("\n").map((line, index) => {
    const timestamp = line.match(/^(\d{4}-\d{2}-\d{2}T[^\s]+)/)?.[1] || null;
    const threadId = line.match(/thread_id=([0-9a-f-]+)/)?.[1] || line.match(/thread\.id=([0-9a-f-]+)/)?.[1] || null;
    const model = normalizeModel(line.match(/model=([A-Za-z0-9_.-]+)/)?.[1]);
    if (!timestamp && !threadId && !model) return null;
    return { timestamp, threadId, model, source: { path: displayPath(codexDir, file), line: index + 1 } };
  }).filter(Boolean);
}

function sourceSummary(kind, roots) {
  return { kind, roots, count: 0, scanned: [] };
}

function sourceRecord(codexDir, file) {
  let size = 0;
  let mtime = null;
  try {
    const stat = statSync(file);
    size = stat.size;
    mtime = stat.mtime.toISOString();
  } catch {}
  return { path: displayPath(codexDir, file), size, mtime };
}

function mergeSources(...groups) {
  return {
    count: groups.reduce((sum, group) => sum + group.count, 0),
    groups,
  };
}

function byMtimeThenPath(a, b) {
  return statMtime(a) - statMtime(b) || a.localeCompare(b);
}

function statMtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function displayPath(root, path) {
  const rel = relative(root, path);
  return rel && !rel.startsWith("..") ? join("~/.codex", rel) : path;
}

function sessionIdFromFile(file) {
  return basename(file).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)?.[1] || null;
}

function timestampFromPayload(value) {
  return stringOrNull(value?.payload?.timestamp) || timestampFromEpoch(value?.payload?.completed_at);
}

function timestampFromEpoch(value) {
  if (!Number.isFinite(value)) return null;
  const ms = value > 10_000_000_000 ? value : value * 1000;
  return new Date(ms).toISOString();
}

function pickNumber(obj, keys) {
  for (const key of keys) {
    if (Number.isFinite(obj?.[key])) return obj[key];
  }
  return 0;
}

function number(value) {
  return Number.isFinite(value) ? value : 0;
}

function stringOrNull(value) {
  return typeof value === "string" && value ? value : null;
}

function normalizeModel(model) {
  if (!model || typeof model !== "string") return null;
  const normalized = model.toLowerCase();
  if (normalized === "gpt-5.4-mini" || normalized === "gpt-5.4 mini") return "gpt-5.4-mini";
  if (normalized.startsWith("gpt-5.5")) return "gpt-5.5";
  if (normalized.startsWith("gpt-5.4-mini")) return "gpt-5.4-mini";
  if (normalized.startsWith("gpt-5.4")) return "gpt-5.4";
  return normalized;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeek(date) {
  const day = startOfLocalDay(date);
  const mondayOffset = (day.getDay() + 6) % 7;
  return addDays(day, -mondayOffset);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateMs(value) {
  const ms = Date.parse(value || "");
  return Number.isFinite(ms) ? ms : 0;
}

function maxIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return dateMs(a) >= dateMs(b) ? a : b;
}

function roundUsd(value) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
