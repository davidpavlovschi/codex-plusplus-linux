import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { readCodexUsage } from "./usage.js";

const HOME = homedir();

export function buildPanelStatus({ appId, paths, health }) {
  const codexUsage = readCodexUsage();
  return {
    app: {
      id: appId,
      name: "Codex++ Linux",
      generatedAt: new Date().toISOString(),
    },
    health,
    usage: codexUsage,
    projects: recentProjects(),
    sessions: recentSessions(codexUsage),
    actions: [
      { id: "open", label: "Open full Codex" },
      { id: "codex-here", label: "Start Codex here" },
      { id: "ask-clipboard", label: "Ask about clipboard" },
      { id: "ask-active-window", label: "Ask about active window" },
      { id: "doctor", label: "Run doctor" },
      { id: "repair", label: "Repair Codex++" },
    ],
    paths,
  };
}

export function recentProjects() {
  const roots = [
    HOME,
    join(HOME, "Documents"),
    join(HOME, "Downloads"),
    join(HOME, "code"),
    join(HOME, "src"),
    join(HOME, "Projects"),
  ];
  const projects = new Map();
  for (const root of roots) collectGitProjects(root, projects, 0);
  return [...projects.values()]
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 20);
}

export function recentSessions(codexUsage = readCodexUsage()) {
  return codexUsage.sessions
    .map((session) => ({
      id: session.id,
      title: session.cwd ? basename(session.cwd) : session.id || "Codex session",
      cwd: session.cwd,
      model: session.model,
      updatedAt: session.updatedAt,
      usage: session.usage,
      apiEquivalentUsd: session.model ? codexUsage.usage.current.byModel?.[session.model]?.estimatedUsd : null,
    }))
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 15);
}

export function readUsageEstimate() {
  return readCodexUsage();
}

export function activeWindowSummary() {
  const title = runText("xdotool", ["getactivewindow", "getwindowname"]);
  const klass = runText("xdotool", ["getactivewindow", "getwindowclassname"]);
  return {
    title: title || null,
    class: klass || null,
  };
}

function collectGitProjects(root, out, depth) {
  if (depth > 3 || !existsSync(root)) return;
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  if (existsSync(join(root, ".git"))) {
    const stat = statSync(root);
    out.set(root, {
      name: basename(root),
      path: root,
      modifiedAt: stat.mtime.toISOString(),
    });
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (["node_modules", "dist", "build", "target"].includes(entry.name)) continue;
    collectGitProjects(join(root, entry.name), out, depth + 1);
  }
}

function runText(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}
