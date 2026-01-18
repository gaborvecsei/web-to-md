(() => {
  let enabled = false;
  let hoverEl = null;
  let pickerOverlay = null;
  const selected = new Set();
  let lastMarkdown = "";

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
    preformattedCode: true,
  });

  turndownService.escape = (text) => text;

  turndownService.addRule("preserveCodeBlocks", {
    filter: (node) => {
      return node.nodeName === "PRE" && node.querySelector("code");
    },
    replacement: (content, node) => {
      const codeEl = node.querySelector("code");
      const lang = codeEl ? (codeEl.className.match(/language-(\w+)/) || [])[1] || "" : "";
      const code = codeEl ? codeEl.textContent : node.textContent;
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    },
  });

  turndownService.addRule("preserveWhitespace", {
    filter: (node) => {
      return node.nodeName === "PRE" || (node.style && node.style.whiteSpace === "pre");
    },
    replacement: (content, node) => {
      return `\n\`\`\`\n${node.textContent}\n\`\`\`\n`;
    },
  });

  const toAbsoluteURL = (url) => {
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  };

  const getTitleAttr = (node) => {
    const title = node.getAttribute("title");
    return title ? ` "${title}"` : "";
  };

  turndownService.addRule("removeScriptsStyles", {
    filter: ["script", "style", "noscript"],
    replacement: () => "",
  });

  turndownService.addRule("preserveImages", {
    filter: "img",
    replacement: (content, node) => {
      const src = node.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return "<IMAGE WAS HERE>";

      const absoluteSrc = toAbsoluteURL(src);
      if (absoluteSrc === src && !src.startsWith("http")) return "<IMAGE WAS HERE>";

      const alt = node.getAttribute("alt") || "";
      return `![${alt}](${absoluteSrc}${getTitleAttr(node)})`;
    },
  });

  turndownService.addRule("preserveLinks", {
    filter: (node) => node.nodeName === "A" && node.getAttribute("href"),
    replacement: (content, node) => {
      const href = node.getAttribute("href") || "";
      const absoluteHref = href.startsWith("#") || href.startsWith("javascript:") ? href : toAbsoluteURL(href);
      return `[${content}](${absoluteHref}${getTitleAttr(node)})`;
    },
  });

  function createHelpPanel() {
    if (pickerOverlay) return pickerOverlay;

    const panel = document.createElement("div");
    panel.dataset.zapIgnore = "true";
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      font-size: 12px;
      color: #fff;
      pointer-events: none;
      min-width: 200px;
    `;

    const shortcuts = [
      { key: "Esc", desc: "Exit zapper" },
      { key: "Click", desc: "Select element" },
      { key: "Enter", desc: "Select hovered" },
      { key: "Shift+Enter", desc: "Multi-select" },
      { key: "Cmd/Ctrl+C", desc: "Copy markdown" },
      { key: "↑", desc: "Parent element" },
      { key: "↓", desc: "Child element" },
      { key: "Alt+Hover", desc: "Smart container" },
    ];

    const title = document.createElement("div");
    title.textContent = "Zapper Shortcuts";
    title.style.cssText = `
      font-weight: 600;
      margin-bottom: 12px;
      color: #00aaff;
      font-size: 13px;
    `;
    panel.appendChild(title);

    shortcuts.forEach((s) => {
      const row = document.createElement("div");
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        gap: 16px;
      `;

      const key = document.createElement("span");
      key.textContent = s.key;
      key.style.cssText = `
        color: #10b981;
        font-weight: 500;
      `;

      const desc = document.createElement("span");
      desc.textContent = s.desc;
      desc.style.cssText = `
        color: #cbd5e1;
        text-align: right;
      `;

      row.appendChild(key);
      row.appendChild(desc);
      panel.appendChild(row);
    });

    document.body.appendChild(panel);
    pickerOverlay = panel;
    return panel;
  }

  function removeHelpPanel() {
    if (pickerOverlay) {
      pickerOverlay.remove();
      pickerOverlay = null;
    }
  }

  function isValidElement(el) {
    if (!el || el.dataset.zapIgnore) return false;
    if (el === document.body || el === document.documentElement) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function navigateToParent() {
    if (!hoverEl) return;
    let parent = hoverEl.parentElement;
    while (parent && !isValidElement(parent)) {
      parent = parent.parentElement;
    }
    if (parent) setHover(parent);
  }

  function navigateToChild() {
    if (!hoverEl) return;
    const child = Array.from(hoverEl.children).find(isValidElement);
    if (child) setHover(child);
  }

  function getSmartContainer(el) {
    if (!el) return el;
    let current = el;

    while (current && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      const cls = (current.className || "").toLowerCase();
      const isSemanticTag = ["article", "main", "section"].includes(tag);
      const hasContentClass =
        cls.includes("content") || cls.includes("article") || cls.includes("post") || cls.includes("main");

      if (isSemanticTag || hasContentClass) return current;
      current = current.parentElement;
    }

    return el;
  }

  function setHover(el) {
    if (hoverEl === el) return;
    if (hoverEl) hoverEl.classList.remove("zap-hover");
    hoverEl = el;
    if (el && !el.dataset.zapIgnore) el.classList.add("zap-hover");
  }

  function clearHover() {
    if (hoverEl) {
      hoverEl.classList.remove("zap-hover");
      hoverEl = null;
    }
  }

  async function toggleSelect(el, multi) {
    if (!el || el.dataset.zapIgnore) return;

    if (!multi) {
      selected.forEach((node) => node.classList.remove("zap-selected"));
      selected.clear();
    }

    if (selected.has(el)) {
      selected.delete(el);
      el.classList.remove("zap-selected");
    } else {
      selected.add(el);
      el.classList.add("zap-selected");
    }

    lastMarkdown = await buildMarkdown();
  }

  function cleanupMarkdown(md) {
    const codeBlocks = [];
    let index = 0;

    let result = md.replace(/(```[\s\S]*?```)/g, (match) => {
      const placeholder = `___CODE_BLOCK_${index}___`;
      codeBlocks.push(match);
      index++;
      return placeholder;
    });

    result = result
      .replace(/\u200B/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/(\n[-*+]\s+[^\n]+)\n\n(?=[-*+]\s+)/g, "$1\n")
      .replace(/(\n\d+\.\s+[^\n]+)\n\n(?=\d+\.\s+)/g, "$1\n")
      .replace(/(\n>\s+[^\n]+)\n\n(?=>\s+)/g, "$1\n")
      .replace(/([^#\-*+>\d\n][^\n]*)\n\n(?=[^#\-*+>\d\s\n])/g, "$1\n");

    codeBlocks.forEach((block, i) => {
      result = result.replace(`___CODE_BLOCK_${i}___`, block);
    });

    return result.trim() + "\n";
  }

  async function buildMarkdown() {
    if (selected.size === 0) return "";

    const parts = [];
    for (const el of selected) {
      const clone = el.cloneNode(true);
      clone.querySelectorAll(".zap-hover, .zap-selected").forEach((n) => {
        n.classList.remove("zap-hover", "zap-selected");
      });
      clone.querySelectorAll("[style]").forEach((n) => n.removeAttribute("style"));
      clone.querySelectorAll("[data-zap-ignore]").forEach((n) => n.remove());

      const md = turndownService.turndown(clone);
      parts.push(md.trim());
    }
    const joined = parts.filter(Boolean).join("\n\n---\n\n");

    const { cleanupMarkdown: shouldCleanup = true } = await chrome.storage.local.get("cleanupMarkdown");
    return shouldCleanup ? cleanupMarkdown(joined) : joined;
  }

  async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
  }

  function onMouseMove(e) {
    if (!enabled) return;
    const el = e.target;
    if (el.dataset.zapIgnore) return;
    const smartEl = e.altKey ? getSmartContainer(el) : el;
    setHover(smartEl);
  }

  async function onClick(e) {
    if (!enabled) return;
    if (e.target.dataset.zapIgnore) return;

    e.preventDefault();
    e.stopPropagation();

    if (hoverEl) await toggleSelect(hoverEl, e.shiftKey);
  }

  async function onKeyDown(e) {
    if (!enabled) return;

    const handlers = {
      Escape: () => disable(),
      Enter: async () => hoverEl && (await toggleSelect(hoverEl, e.shiftKey)),
      ArrowUp: () => navigateToParent(),
      ArrowDown: () => navigateToChild(),
    };

    if (handlers[e.key]) {
      e.preventDefault();
      if (e.key === "Enter") e.stopPropagation();
      await handlers[e.key]();
      return;
    }

    if (e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      const md = lastMarkdown || (await buildMarkdown());
      if (md) {
        copyToClipboard(md).catch(() => {});
        clearSelection();
      }
    }
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    createHelpPanel();
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    clearHover();
    clearSelection();
    removeHelpPanel();
    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKeyDown, true);
  }

  function clearSelection() {
    selected.forEach((node) => node.classList.remove("zap-selected"));
    selected.clear();
    lastMarkdown = "";
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      const { type } = msg || {};

      if (type === "TOGGLE_ZAP") {
        enabled ? disable() : enable();
        return sendResponse({ ok: true, enabled });
      }

      if (type === "CLEAR_SELECTION") {
        clearSelection();
        return sendResponse({ ok: true });
      }

      if (type === "GET_MD") {
        const md = lastMarkdown || (await buildMarkdown());
        return sendResponse({ ok: true, md });
      }

      if (type === "COPY_MD") {
        const md = lastMarkdown || (await buildMarkdown());
        if (!md) return sendResponse({ ok: false, error: "Nothing selected" });
        try {
          await copyToClipboard(md);
          clearSelection();
          sendResponse({ ok: true });
        } catch {
          sendResponse({ ok: false, error: "Clipboard copy failed" });
        }
        return;
      }

      sendResponse({ ok: false, error: "Unknown command" });
    })();

    return true;
  });
})();
