(function () {
  "use strict";

  const MESSAGE_TYPE = "noctua-canvas-selection";
  const MIN_DRAG_PX = 6;

  let mode = "idle";
  let overlay = null;
  let highlight = null;
  let draft = null;
  let active = false;

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "canvas-annotate-overlay";
    overlay.setAttribute("data-annotate-overlay", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      cursor: "default",
      background: "transparent",
      pointerEvents: "none",
      touchAction: "none"
    });
    document.body.appendChild(overlay);

    highlight = document.createElement("div");
    highlight.id = "canvas-annotate-highlight";
    Object.assign(highlight.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "2147483647",
      border: "2px solid #2563eb",
      background: "rgba(37, 99, 235, 0.12)",
      borderRadius: "4px",
      display: "none"
    });
    document.body.appendChild(highlight);

    overlay.addEventListener("mousedown", onPointerDown);
    overlay.addEventListener("mousemove", onPointerMove);
    overlay.addEventListener("mouseup", onPointerUp);
    overlay.addEventListener("click", onClickPick);
  }

  function setMode(nextMode) {
    if (nextMode === "pick") {
      mode = "pick";
    } else if (nextMode === "rect") {
      mode = "rect";
    } else {
      mode = "idle";
    }
    applyModeStyles();
  }

  function applyModeStyles() {
    if (!overlay) return;
    const interactive = mode === "rect" || mode === "pick";
    overlay.style.pointerEvents = interactive ? "auto" : "none";
    overlay.style.cursor = mode === "rect" ? "crosshair" : mode === "pick" ? "pointer" : "default";
    if (!interactive) {
      active = false;
      draft = null;
      hideHighlight();
    }
  }

  function normalizeRect(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    return { left, top, width, height };
  }

  function showHighlight(rect) {
    if (!highlight || !rect) return;
    Object.assign(highlight.style, {
      display: "block",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  }

  function hideHighlight() {
    if (highlight) highlight.style.display = "none";
  }

  function isMeaningfulElement(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (el.matches("[data-annotate-overlay], script, style, link, meta, noscript")) return false;
    return true;
  }

  function nearestAttr(el, selector, attr) {
    const found = el.closest(selector);
    return found ? found.getAttribute(attr) || "" : "";
  }

  function visibleText(el) {
    if (!el) return "";
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  function buildSelector(el) {
    if (!el || el === document.body) return "body";
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node !== document.body && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part = `#${CSS.escape(node.id)}`;
        parts.unshift(part);
        break;
      }
      if (node.classList && node.classList.length) {
        const cls = Array.from(node.classList)
          .slice(0, 2)
          .map((name) => `.${CSS.escape(name)}`)
          .join("");
        part += cls;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function suggestFiles(el) {
    const files = new Set(["index.html"]);
    const view = nearestAttr(el, "[data-view]", "data-view");
    const id = el.id || "";
    const className = typeof el.className === "string" ? el.className : "";

    if (view || id || className) {
      files.add("main.js");
    }

    files.add("design-system/styles.css");
    files.add("design-system/tokens.css");

    if (className.includes("btn") || className.includes("panel") || className.includes("app-")) {
      files.add("design-system/styles.css");
    }

    return Array.from(files);
  }

  function elementRect(el) {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function buildPayload(el, rect, selectionKind) {
    const view = nearestAttr(el, "[data-view]", "data-view");
    const viewLink = nearestAttr(el, "[data-view-link]", "data-view-link");
    return {
      selectionKind,
      mode,
      pageUrl: location.href,
      hash: location.hash,
      rect,
      element: {
        tagName: el.tagName.toLowerCase(),
        id: el.id || "",
        className: typeof el.className === "string" ? el.className : "",
        selector: buildSelector(el),
        text: visibleText(el)
      },
      context: {
        dataView: view,
        dataViewLink: viewLink,
        suggestedFiles: suggestFiles(el)
      },
      timestamp: Date.now()
    };
  }

  function emitSelection(payload) {
    window.parent.postMessage({ type: MESSAGE_TYPE, payload }, "*");
    showHighlight(payload.rect);
  }

  function pickElementAt(x, y) {
    overlay.style.pointerEvents = "none";
    const target = document.elementFromPoint(x, y);
    overlay.style.pointerEvents = "auto";
    if (!isMeaningfulElement(target)) return null;
    return target;
  }

  function finalizeRectSelection(rect) {
    if (rect.width < MIN_DRAG_PX || rect.height < MIN_DRAG_PX) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const target = pickElementAt(centerX, centerY);
    if (!target) return;

    emitSelection(buildPayload(target, rect, "rect"));
  }

  function onPointerDown(event) {
    if (mode !== "rect" || event.button !== 0) return;
    active = true;
    draft = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY
    };
    showHighlight(normalizeRect(draft.startX, draft.startY, draft.currentX, draft.currentY));
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!active || mode !== "rect" || !draft) return;
    draft.currentX = event.clientX;
    draft.currentY = event.clientY;
    showHighlight(normalizeRect(draft.startX, draft.startY, draft.currentX, draft.currentY));
  }

  function onPointerUp(event) {
    if (!active || mode !== "rect" || !draft) return;
    active = false;
    const rect = normalizeRect(draft.startX, draft.startY, event.clientX, event.clientY);
    draft = null;
    finalizeRectSelection(rect);
  }

  function onClickPick(event) {
    if (mode !== "pick" || event.button !== 0) return;
    const target = pickElementAt(event.clientX, event.clientY);
    if (!target) return;
    emitSelection(buildPayload(target, elementRect(target), "pick"));
    event.preventDefault();
  }

  function onParentMessage(event) {
    const data = event.data;
    if (!data || data.type !== "noctua-canvas-set-mode") return;
    setMode(data.mode);
  }

  window.addEventListener("message", onParentMessage);

  createOverlay();
  setMode("idle");

  window.__NOCTUA_CANVAS_ANNOTATE__ = {
    setMode,
    clearHighlight: hideHighlight
  };
})();
