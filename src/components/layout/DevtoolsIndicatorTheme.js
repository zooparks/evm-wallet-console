"use client";

import { useEffect } from "react";

const STYLE_ID = "evm-console-devtools-theme";

const DEVTOOLS_THEME = `
  #devtools-indicator [data-next-badge] {
    background: #0d9488 !important;
    border-radius: 50% !important;
    color: #ffffff !important;
    --color-outer-border: #0f766e !important;
    --color-inner-border: rgba(255, 255, 255, 0.35) !important;
    box-shadow: 0 2px 8px rgba(15, 118, 110, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
  }

  #devtools-indicator [data-next-mark],
  #devtools-indicator [data-issues-open],
  #devtools-indicator [data-issues-collapse],
  #devtools-indicator .dev-tools-indicator-item,
  #devtools-indicator .dev-tools-indicator-label,
  #devtools-indicator .dev-tools-indicator-value {
    color: #ffffff !important;
  }

  #devtools-indicator [data-next-mark]:hover,
  #devtools-indicator [data-issues-open]:hover,
  #devtools-indicator [data-issues-collapse]:hover,
  #devtools-indicator .dev-tools-indicator-item[data-selected='true'] {
    background: #0f766e !important;
  }

  #nextjs-dev-tools-menu,
  [id^='panel-'] .panel-content-container,
  [id^='panel-'] .draggable-content {
    background: #0d9488 !important;
    border-color: #0f766e !important;
    color: #ffffff !important;
  }

  #nextjs-dev-tools-menu *,
  [id^='panel-'] .panel-content-container *,
  [id^='panel-'] .draggable-content * {
    border-color: rgba(255, 255, 255, 0.35) !important;
    color: #ffffff !important;
  }

  #nextjs-dev-tools-menu .dev-tools-indicator-footer,
  [id^='panel-'] .segment-explorer-page-route-bar,
  [id^='panel-'] .segment-explorer-footer {
    background: #0f766e !important;
  }

  #nextjs-dev-tools-menu .dev-tools-indicator-item[data-selected='true'],
  #nextjs-dev-tools-menu .dev-tools-indicator-item:hover,
  [id^='panel-'] button:hover,
  [id^='panel-'] [data-highlighted='true'] {
    background: #115e59 !important;
  }

  [id^='panel-'] .segment-explorer-item,
  [id^='panel-'] .segment-explorer-file-label,
  [id^='panel-'] .segment-explorer-footer-button,
  [id^='panel-'] .segment-boundary-dropdown {
    background: #0d9488 !important;
    color: #ffffff !important;
  }

  [id^='panel-'] .segment-explorer-item:hover,
  [id^='panel-'] .segment-explorer-file-label:hover,
  [id^='panel-'] .segment-explorer-footer-button:hover:not(:disabled),
  [id^='panel-'] .segment-boundary-dropdown-item:hover {
    background: #0f766e !important;
  }

  [id^='panel-'] .resize-line {
    background: #0f766e !important;
    border-color: #0f766e !important;
  }

  #nextjs-dev-tools-menu svg,
  [id^='panel-'] svg {
    color: #ffffff !important;
  }

  #nextjs-dev-tools-menu svg path,
  [id^='panel-'] svg path {
    fill: #ffffff !important;
    stroke: #ffffff !important;
  }
`;

function applyDevtoolsTheme() {
  const portal = document.querySelector("nextjs-portal");
  const shadowRoot = portal?.shadowRoot;
  if (!shadowRoot || shadowRoot.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = DEVTOOLS_THEME;
  shadowRoot.appendChild(style);
}

export default function DevtoolsIndicatorTheme() {
  useEffect(() => {
    applyDevtoolsTheme();
    const observer = new MutationObserver(applyDevtoolsTheme);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
