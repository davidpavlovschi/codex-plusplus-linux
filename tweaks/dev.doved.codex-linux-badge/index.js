const BADGE_ID = "codex-linux-badge";

module.exports = {
  async start(api) {
    injectStyles();
    const observer = new MutationObserver(() => placeBadge());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    placeBadge();

    api.settings?.register({
      id: "about",
      title: "Linux identity",
      description: "Shows a small Linux badge inside the Codex desktop app.",
      render(root) {
        const card = document.createElement("div");
        card.className =
          "border-token-border flex flex-col divide-y-[0.5px] divide-token-border rounded-lg border";
        card.style.backgroundColor = "var(--color-background-panel, var(--color-token-bg-fog))";

        const row = document.createElement("div");
        row.className = "flex items-center justify-between gap-4 p-3";

        const left = document.createElement("div");
        left.className = "flex min-w-0 flex-col gap-1";

        const label = document.createElement("div");
        label.className = "min-w-0 text-sm text-token-text-primary";
        label.textContent = "Codex for Linux";

        const desc = document.createElement("div");
        desc.className = "text-token-text-secondary min-w-0 text-sm";
        desc.textContent = "This Linux build is packaged by Codex++ Linux.";

        const badge = document.createElement("div");
        badge.className = "codex-linux-badge codex-linux-badge--settings";
        badge.innerHTML = linuxIconSvg();
        badge.title = "Codex++ Linux";

        left.append(label, desc);
        row.append(left, badge);
        card.appendChild(row);
        root.appendChild(card);
      },
    });

    this.stop = () => {
      observer.disconnect();
      document.getElementById(BADGE_ID)?.remove();
    };
  },

  stop() {},
};

function placeBadge() {
  const existing = document.getElementById(BADGE_ID);
  if (existing?.isConnected) return;

  const target = findSettingsControl() || findTopBar();
  if (!target?.parentElement) return;

  const badge = document.createElement("button");
  badge.id = BADGE_ID;
  badge.type = "button";
  badge.className = "codex-linux-badge";
  badge.title = "Codex++ Linux";
  badge.setAttribute("aria-label", "Codex++ Linux");
  badge.innerHTML = `${linuxIconSvg()}<span>Linux</span>`;
  badge.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("codexpp:open-settings", { detail: { page: "tweaks" } }));
  });

  target.insertAdjacentElement("beforebegin", badge);
}

function findSettingsControl() {
  const selectors = [
    'button[aria-label*="Settings" i]',
    'a[aria-label*="Settings" i]',
    '[title*="Settings" i]',
    'button:has(svg)',
  ];

  for (const selector of selectors) {
    try {
      const nodes = [...document.querySelectorAll(selector)];
      const match = nodes.find((node) => /settings/i.test(`${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""} ${node.textContent || ""}`));
      if (match) return match;
    } catch {}
  }

  return null;
}

function findTopBar() {
  const candidates = [
    '[class*="toolbar" i]',
    'header',
    'nav',
    '[role="toolbar"]',
  ];
  for (const selector of candidates) {
    const node = document.querySelector(selector);
    if (node) return node.firstElementChild || node;
  }
  return null;
}

function injectStyles() {
  if (document.getElementById("codex-linux-badge-style")) return;
  const style = document.createElement("style");
  style.id = "codex-linux-badge-style";
  style.textContent = `
    .codex-linux-badge {
      align-items: center;
      background: color-mix(in srgb, var(--color-token-bg-fog, #111827) 86%, transparent);
      border: 1px solid var(--color-token-border, rgba(255,255,255,.14));
      border-radius: 999px;
      color: var(--color-token-text-primary, currentColor);
      cursor: pointer;
      display: inline-flex;
      flex: 0 0 auto;
      font-size: 12px;
      font-weight: 600;
      gap: 6px;
      height: 28px;
      line-height: 1;
      margin-inline: 6px;
      padding: 0 9px 0 7px;
      white-space: nowrap;
    }
    .codex-linux-badge:hover {
      background: color-mix(in srgb, var(--color-token-foreground, currentColor) 9%, transparent);
    }
    .codex-linux-badge svg {
      display: block;
      height: 17px;
      width: 17px;
    }
    .codex-linux-badge--settings {
      cursor: default;
      height: 32px;
      margin: 0;
      padding: 0 8px;
    }
    .codex-linux-badge--settings svg {
      height: 20px;
      width: 20px;
    }
  `;
  document.head.appendChild(style);
}

function linuxIconSvg() {
  return `
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#111827"/>
      <path d="M32 10c-8 0-14 7-14 18v6c0 10 6 18 14 18s14-8 14-18v-6c0-11-6-18-14-18Z" fill="#F9FAFB"/>
      <path d="M23 28c0-10 4-16 9-16s9 6 9 16v7c0 8-4 14-9 14s-9-6-9-14v-7Z" fill="#111827"/>
      <path d="M21 40c-5 2-8 6-8 10 0 3 2 5 5 5 4 0 8-3 10-7l-7-8Z" fill="#FACC15"/>
      <path d="M43 40c5 2 8 6 8 10 0 3-2 5-5 5-4 0-8-3-10-7l7-8Z" fill="#FACC15"/>
      <circle cx="27" cy="24" r="2" fill="#F9FAFB"/>
      <circle cx="37" cy="24" r="2" fill="#F9FAFB"/>
      <path d="M28 32c2 2 6 2 8 0" stroke="#F9FAFB" stroke-width="2" stroke-linecap="round"/>
      <path d="M25 53h14" stroke="#FACC15" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `;
}
