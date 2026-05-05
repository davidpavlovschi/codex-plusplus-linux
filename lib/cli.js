import {
  accessSync,
  constants,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { activeWindowSummary, buildPanelStatus, readUsageEstimate } from "./panel.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

const APP_ID = "codex-plusplus-linux";
const APP_NAME = "Codex++ Linux";
const XDG_DATA_HOME = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
const XDG_CACHE_HOME = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");

const installRoot = join(XDG_DATA_HOME, APP_ID);
const logRoot = join(installRoot, "logs");
const launcherLogRoot = join(logRoot, "launcher");
const desktopPath = join(XDG_DATA_HOME, "applications", `${APP_ID}.desktop`);
const iconDir = join(XDG_DATA_HOME, "icons", "hicolor", "256x256", "apps");
const scalableIconDir = join(XDG_DATA_HOME, "icons", "hicolor", "scalable", "apps");
const iconPath = join(iconDir, `${APP_ID}.png`);
const scalableIconPath = join(scalableIconDir, `${APP_ID}.svg`);
const statePath = join(installRoot, "state.json");
const codexPlusPlusData = join(XDG_DATA_HOME, "codex-plusplus");
const codexPlusPlusConfig = join(codexPlusPlusData, "config.json");

export async function main(argv) {
  const command = argv[0] || "launch";
  const args = argv.slice(1);

  switch (command) {
    case "install":
      await install(args);
      return;
    case "launch":
    case "run":
      await launch(args);
      return;
    case "doctor":
    case "status":
      await doctor();
      return;
    case "status-json":
      await statusJson();
      return;
    case "daemon":
      await daemon(args);
      return;
    case "usage":
      json(readUsageEstimate());
      return;
    case "open":
      await openInCodex(args);
      return;
    case "ask-file":
      await promptForPath(args, "Ask Codex about this file");
      return;
    case "explain-log":
      await promptForPath(args, "Explain this error log");
      return;
    case "generate-readme":
      await promptForPath(args, "Generate a README for this folder");
      return;
    case "ask-active-window":
      await askActiveWindow();
      return;
    case "ask-clipboard":
      await askClipboard();
      return;
    case "repair":
      await repair();
      return;
    case "logs":
      showLogs();
      return;
    case "uninstall":
      await uninstall();
      return;
    case "--help":
    case "-h":
    case "help":
      printHelp();
      return;
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

async function install(args) {
  const withDefaultTweaks = args.includes("--default-tweaks");
  ensureLinuxX64();
  ensureCommand("node", "Node.js 20+ is required.");
  ensureCommand("npm", "npm is required.");
  ensureCommand("tar", "tar is required to extract the Codex desktop bundle.");

  mkdirSync(installRoot, { recursive: true });
  mkdirSync(launcherLogRoot, { recursive: true });
  mkdirSync(dirname(desktopPath), { recursive: true });
  mkdirSync(iconDir, { recursive: true });

  const codexCli = resolveCodexCli();
  const codexAppLinux = resolveCodexAppLinux();

  run(codexCli, ["--version"], { label: "checking Codex CLI" });

  const plusplusArgs = ["--plusplus", "install"];
  if (!withDefaultTweaks) plusplusArgs.push("--no-default-tweaks");
  run(codexAppLinux, plusplusArgs, {
    label: "installing Codex++ into Linux desktop bundle",
    env: {
      ...process.env,
      CODEX_CLI_PATH: codexCli,
    },
  });

  disableCodexPlusPlusSelfUpdate();
  installBundledTweaks();
  installNemoActions();
  installDesktopFiles();
  pinCinnamonFavorite();
  writeState({ codexCli, codexAppLinux, installedAt: new Date().toISOString() });

  process.stdout.write(`\nInstalled ${APP_NAME}.\n\n`);
  process.stdout.write(`Run from terminal:\n  codex-plusplus-linux launch\n\n`);
  process.stdout.write(`Or open from your launcher:\n  ${APP_NAME}\n\n`);
  process.stdout.write(`Health check:\n  codex-plusplus-linux doctor\n\n`);
}

async function launch(args) {
  const state = readState();
  const codexCli = resolveCodexCli();
  const appBinary = await resolveAppBinary(state.codexAppLinux);

  mkdirSync(launcherLogRoot, { recursive: true });
  const stamp = timestamp();
  const logFile = join(launcherLogRoot, `${APP_ID}-${stamp}.log`);
  const latest = join(launcherLogRoot, "latest.log");
  safeSymlink(logFile, latest);

  writeFileSync(
    logFile,
    [
      `[${new Date().toISOString()}] starting ${APP_NAME}`,
      `app: ${appBinary}`,
      `codex: ${codexCli}`,
      `log: ${logFile}`,
      "",
    ].join("\n"),
  );

  const child = spawn(appBinary, ["--no-sandbox", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      CODEX_CLI_PATH: codexCli,
    },
  });

  child.stdout.pipe(createWriteStream(logFile, { flags: "a" }));
  child.stderr.pipe(createWriteStream(logFile, { flags: "a" }));

  child.on("exit", (code, signal) => {
    append(logFile, `\n[${new Date().toISOString()}] exited code=${code ?? ""} signal=${signal ?? ""}\n`);
    process.exit(code ?? (signal ? 1 : 0));
  });
}

async function doctor() {
  ensureLinuxX64();
  report("node", process.version, true);
  report("npm", commandVersion("npm", ["--version"]), which("npm") !== null);
  report("tar", commandVersion("tar", ["--version"], 1), which("tar") !== null);

  const codexCli = tryResolve(resolveCodexCli);
  report("Codex CLI", codexCli || "missing", Boolean(codexCli));
  if (codexCli) report("Codex CLI version", commandVersion(codexCli, ["--version"]), true);

  const codexAppLinux = tryResolve(resolveCodexAppLinux);
  report("codex-app-linux", codexAppLinux || "missing", Boolean(codexAppLinux));

  const appBinary = await tryResolveAsync(() => resolveAppBinary(codexAppLinux || undefined));
  report("Codex desktop binary", appBinary || "missing", Boolean(appBinary));

  report("desktop entry", desktopPath, existsSync(desktopPath));
  report("icon", existsSync(scalableIconPath) ? scalableIconPath : iconPath, existsSync(iconPath) || existsSync(scalableIconPath));
  report("launcher logs", launcherLogRoot, existsSync(launcherLogRoot));

  const codexPlusPlus = which("codexplusplus");
  report("codexplusplus", codexPlusPlus || "missing", Boolean(codexPlusPlus));
  if (codexPlusPlus) run(codexPlusPlus, ["doctor"], { reject: false });

  run("systemctl", ["--user", "status", "codex-plusplus-watcher.path", "codex-plusplus-watcher.timer", "--no-pager"], {
    reject: false,
  });
}

async function statusJson() {
  json(buildPanelStatus({
    appId: APP_ID,
    paths: importantPaths(),
    health: await healthStatus(),
  }));
}

async function daemon(args) {
  const port = Number(args[0] || process.env.CODEX_PLUSPLUS_LINUX_PORT || 17654);
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      if (url.pathname === "/status") return sendJson(res, buildPanelStatus({ appId: APP_ID, paths: importantPaths(), health: await healthStatus() }));
      if (url.pathname === "/usage") return sendJson(res, readUsageEstimate());
      if (url.pathname === "/health") return sendJson(res, await healthStatus());
      if (url.pathname === "/active-window") return sendJson(res, activeWindowSummary());
      if (url.pathname === "/open" && req.method === "POST") {
        const body = await readBody(req);
        await openInCodex([body.path || homedir()]);
        return sendJson(res, { ok: true });
      }
      sendJson(res, { error: "not found" }, 404);
    } catch (error) {
      sendJson(res, { error: error instanceof Error ? error.message : String(error) }, 500);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`codex-plusplus-linux daemon listening on http://127.0.0.1:${port}\n`);
  });
}

async function openInCodex(args) {
  const cwd = resolve(args[0] || process.cwd());
  launchCodexVisible({ cwd, prompt: null });
  process.stdout.write(`Opened Codex in ${cwd}\n`);
}

async function promptForPath(args, action) {
  const target = resolve(args[0] || process.cwd());
  const prompt = `${action}: ${target}`;
  await launchCodexVisible({ cwd: existsSync(target) && statIsDirectory(target) ? target : dirname(target), prompt });
}

async function askActiveWindow() {
  const active = activeWindowSummary();
  const prompt = `Help me with my active Linux window.\nTitle: ${active.title || "(unknown)"}\nClass: ${active.class || "(unknown)"}`;
  await launchCodexVisible({ cwd: process.cwd(), prompt });
}

async function askClipboard() {
  const text = commandOutput("xclip", ["-selection", "clipboard", "-o"]) || commandOutput("xsel", ["--clipboard", "--output"]) || "";
  const prompt = `Help me with this clipboard content:\n\n${text.slice(0, 20000)}`;
  await launchCodexVisible({ cwd: process.cwd(), prompt });
}

async function repair() {
  const codexAppLinux = resolveCodexAppLinux();
  const codexCli = resolveCodexCli();
  run(codexAppLinux, ["--plusplus", "repair"], {
    env: { ...process.env, CODEX_CLI_PATH: codexCli },
  });
  disableCodexPlusPlusSelfUpdate();
}

function showLogs() {
  process.stdout.write(`Launcher latest:\n  ${join(launcherLogRoot, "latest.log")}\n\n`);
  process.stdout.write(`Codex++ runtime:\n  ${join(codexPlusPlusData, "log", "main.log")}\n  ${join(codexPlusPlusData, "log", "preload.log")}\n\n`);
  process.stdout.write("Watcher:\n  journalctl --user -u codex-plusplus-watcher.service -n 100 --no-pager\n");
}

async function healthStatus() {
  const codexCli = tryResolve(resolveCodexCli);
  const codexAppLinux = tryResolve(resolveCodexAppLinux);
  const appBinary = await tryResolveAsync(() => resolveAppBinary(codexAppLinux || undefined));
  const codexPlusPlus = which("codexplusplus");
  return {
    node: { ok: true, version: process.version },
    codexCli: { ok: Boolean(codexCli), path: codexCli },
    codexAppLinux: { ok: Boolean(codexAppLinux), path: codexAppLinux },
    desktopApp: { ok: Boolean(appBinary), path: appBinary },
    codexPlusPlus: { ok: Boolean(codexPlusPlus), path: codexPlusPlus },
    desktopEntry: { ok: existsSync(desktopPath), path: desktopPath },
    icon: { ok: existsSync(iconPath) || existsSync(scalableIconPath), path: existsSync(scalableIconPath) ? scalableIconPath : iconPath },
    watcher: { ok: systemdUserActive("codex-plusplus-watcher.path") },
  };
}

function importantPaths() {
  return {
    installRoot,
    launcherLogRoot,
    desktopPath,
    codexPlusPlusData,
    tweaks: join(codexPlusPlusData, "tweaks"),
    codexHome: join(homedir(), ".codex"),
  };
}

async function uninstall() {
  const codexAppLinux = tryResolve(resolveCodexAppLinux);
  if (codexAppLinux) {
    run(codexAppLinux, ["--plusplus", "uninstall"], { reject: false });
  }

  rmSync(desktopPath, { force: true });
  rmSync(iconPath, { force: true });
  rmSync(scalableIconPath, { force: true });
  rmSync(installRoot, { recursive: true, force: true });
  refreshDesktopDatabase();
  process.stdout.write(`${APP_NAME} desktop integration removed.\n`);
}

async function resolveAppBinary(codexAppLinuxPath) {
  const state = readState();
  const explicit = process.env.CODEX_APP_LINUX_BINARY_PATH || state.appBinary;
  if (explicit && isExecutable(explicit)) return explicit;

  const cached = findCachedAppBinary();
  if (cached) return cached;

  const launcher = codexAppLinuxPath && isExecutable(codexAppLinuxPath) ? codexAppLinuxPath : resolveCodexAppLinux();
  run(launcher, ["--plusplus", "install", "--no-default-tweaks"], {
    label: "installing Codex desktop bundle",
    env: {
      ...process.env,
      CODEX_CLI_PATH: resolveCodexCli(),
    },
  });
  disableCodexPlusPlusSelfUpdate();
  const after = findCachedAppBinary();
  if (after) return after;

  throw new Error("Codex desktop binary was not found after installing codex-app-linux.");
}

function findCachedAppBinary() {
  const root = join(XDG_CACHE_HOME, "codex-app-linux");
  const candidates = [];
  collect(root, candidates);
  return candidates
    .filter((p) => /linux-unpacked\/codex-app-linux$/.test(p) && isExecutable(p))
    .sort()
    .at(-1) || null;
}

function collect(dir, out) {
  if (!existsSync(dir)) return;
  const result = spawnSync("find", [dir, "-type", "f", "-name", "codex-app-linux"], {
    encoding: "utf8",
  });
  if (result.status === 0) {
    for (const line of result.stdout.split("\n")) {
      if (line) out.push(line);
    }
  }
}

function installDesktopFiles() {
  const sourceIcon = join(packageRoot, "assets", `${APP_ID}.png`);
  const sourceSvgIcon = join(packageRoot, "assets", `${APP_ID}.svg`);
  if (existsSync(sourceIcon)) copyFileSync(sourceIcon, iconPath);
  if (existsSync(sourceSvgIcon)) {
    mkdirSync(scalableIconDir, { recursive: true });
    copyFileSync(sourceSvgIcon, scalableIconPath);
  }

  writeFileSync(
    desktopPath,
    [
      "[Desktop Entry]",
      "Type=Application",
      `Name=${APP_NAME}`,
      "Comment=OpenAI Codex desktop app with Codex++ tweaks",
      `Exec=${process.execPath} ${resolve(packageRoot, "bin", "codex-plusplus-linux.js")} launch`,
      `Icon=${APP_ID}`,
      "Terminal=false",
      "Categories=Development;",
      "StartupNotify=true",
      "",
    ].join("\n"),
  );

  refreshDesktopDatabase();
}

function installBundledTweaks() {
  const sourceRoot = join(packageRoot, "tweaks");
  if (!existsSync(sourceRoot)) return;

  const targetRoot = join(codexPlusPlusData, "tweaks");
  mkdirSync(targetRoot, { recursive: true });

  const result = spawnSync("find", [sourceRoot, "-mindepth", "1", "-maxdepth", "1", "-type", "d"], {
    encoding: "utf8",
  });
  if (result.status !== 0) return;

  for (const dir of result.stdout.split("\n").filter(Boolean)) {
    const name = dir.split("/").at(-1);
    if (!name) continue;
    const target = join(targetRoot, name);
    rmSync(target, { recursive: true, force: true });
    run("cp", ["-R", dir, target], { reject: false, quiet: true });
  }
}

function installNemoActions() {
  const installer = join(packageRoot, "integrations", "nemo", "install.sh");
  if (!isExecutable(installer)) return;
  run(installer, [], { reject: false, quiet: true });
}

function pinCinnamonFavorite() {
  if (!which("gsettings")) return;
  const id = `${APP_ID}.desktop`;
  const result = spawnSync("gsettings", ["get", "org.cinnamon", "favorite-apps"], { encoding: "utf8" });
  if (result.status !== 0 || result.stdout.includes(id)) return;

  const apps = [...result.stdout.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  apps.push(id);
  const serialized = `[${apps.map((app) => `'${app.replace(/'/g, "\\'")}'`).join(", ")}]`;
  run("gsettings", ["set", "org.cinnamon", "favorite-apps", serialized], { reject: false, quiet: true });
}

function disableCodexPlusPlusSelfUpdate() {
  mkdirSync(codexPlusPlusData, { recursive: true });
  writeFileSync(codexPlusPlusConfig, JSON.stringify({ codexPlusPlus: { autoUpdate: false } }, null, 2));
}

function refreshDesktopDatabase() {
  run("update-desktop-database", [dirname(desktopPath)], { reject: false, quiet: true });
}

function resolveCodexCli() {
  const local = resolve(packageRoot, "node_modules", ".bin", "codex");
  if (isExecutable(local)) return local;
  const global = which("codex");
  if (global) return global;
  throw new Error("Codex CLI not found. Reinstall this package so @openai/codex is installed.");
}

function resolveCodexAppLinux() {
  const local = resolve(packageRoot, "node_modules", ".bin", "codex-app-linux");
  if (isExecutable(local)) return local;
  const global = which("codex-app-linux");
  if (global) return global;
  throw new Error("codex-app-linux not found. Reinstall this package so dependencies are installed.");
}

function ensureLinuxX64() {
  if (process.platform !== "linux") throw new Error("This package currently supports Linux only.");
  if (process.arch !== "x64") throw new Error(`This package currently supports Linux x64 only, got ${process.arch}.`);
}

function ensureCommand(command, message) {
  if (!which(command)) throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.quiet ? "ignore" : "inherit",
    env: options.env || process.env,
    encoding: "utf8",
  });
  if (result.error) {
    if (options.reject === false) return result.status ?? 1;
    throw result.error;
  }
  if (result.status !== 0 && options.reject !== false) {
    throw new Error(`${options.label || command} failed with exit code ${result.status}`);
  }
  return result.status ?? 0;
}

function commandOutput(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

async function launchCodexVisible({ cwd, prompt }) {
  const codexCli = resolveCodexCli();
  const args = prompt ? [prompt] : [];
  if (process.stdout.isTTY) {
    const child = spawn(codexCli, args, { cwd, stdio: "inherit", env: process.env });
    await waitForChild(child);
    return;
  }

  const terminal = which("x-terminal-emulator") || which("gnome-terminal") || which("konsole") || which("xfce4-terminal");
  if (!terminal) {
    const child = spawn(codexCli, args, { cwd, stdio: "ignore", detached: true, env: process.env });
    child.unref();
    return;
  }

  const quotedCwd = shellQuote(cwd);
  const quotedCodex = shellQuote(codexCli);
  const quotedArgs = args.map(shellQuote).join(" ");
  const command = `cd ${quotedCwd} && ${quotedCodex}${quotedArgs ? ` ${quotedArgs}` : ""}; printf '\\nCodex exited. Press Enter to close.'; read _`;
  const termArgs = terminal.endsWith("gnome-terminal")
    ? ["--", "bash", "-lc", command]
    : ["-e", "bash", "-lc", command];
  const child = spawn(terminal, termArgs, { stdio: "ignore", detached: true, env: process.env });
  child.unref();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function systemdUserActive(unit) {
  const result = spawnSync("systemctl", ["--user", "is-active", "--quiet", unit]);
  return result.status === 0;
}

function which(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  const found = result.status === 0 ? result.stdout.trim() : "";
  return found && isExecutable(found) ? found : null;
}

function commandVersion(command, args, maxLines = 3) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const text = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return text.split("\n").slice(0, maxLines).join(" | ") || "(unknown)";
}

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function statIsDirectory(path) {
  try {
    return existsSync(path) && spawnSync("test", ["-d", path]).status === 0;
  } catch {
    return false;
  }
}

function readState() {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

function writeState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function safeSymlink(target, link) {
  try {
    unlinkSync(link);
  } catch {}
  try {
    symlinkSync(target, link);
  } catch {}
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-");
}

function append(file, text) {
  writeFileSync(file, text, { flag: "a" });
}

function report(name, detail, ok) {
  process.stdout.write(`${ok ? "✓" : "✗"} ${name}: ${detail}\n`);
}

function json(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function sendJson(res, value, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(value, null, 2)}\n`);
}

async function readBody(req) {
  let text = "";
  for await (const chunk of req) text += chunk;
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

function waitForChild(child) {
  return new Promise((resolvePromise, rejectPromise) => {
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code) rejectPromise(new Error(`Codex exited with code ${code}`));
      else resolvePromise();
    });
  });
}

function tryResolve(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

async function tryResolveAsync(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function printHelp() {
  process.stdout.write(`Usage: codex-plusplus-linux <command>\n\n`);
  process.stdout.write(`Commands:\n`);
  process.stdout.write(`  install       Install Codex desktop + Codex++ integration\n`);
  process.stdout.write(`  launch        Launch the app and write logs\n`);
  process.stdout.write(`  daemon        Start local panel API on 127.0.0.1:17654\n`);
  process.stdout.write(`  status-json   Print panel status JSON\n`);
  process.stdout.write(`  usage         Print token/API-equivalent usage estimate\n`);
  process.stdout.write(`  open [path]   Open Codex in a project folder\n`);
  process.stdout.write(`  ask-file      Ask Codex about a file\n`);
  process.stdout.write(`  explain-log   Ask Codex to explain a log file\n`);
  process.stdout.write(`  generate-readme Ask Codex to generate a README for a folder\n`);
  process.stdout.write(`  doctor        Check dependencies, app, Codex++, watcher\n`);
  process.stdout.write(`  repair        Re-apply Codex++ patch to the desktop bundle\n`);
  process.stdout.write(`  logs          Print log locations\n`);
  process.stdout.write(`  uninstall     Remove desktop integration and ask Codex++ to uninstall\n`);
}
