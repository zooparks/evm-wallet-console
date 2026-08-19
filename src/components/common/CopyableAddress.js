"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function CopyableAddress({ address, className }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // 降级:老浏览器没有 clipboard API 时用临时输入框
      const el = document.createElement("textarea");
      el.value = address;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className={`group inline-flex max-w-full items-center gap-1.5 ${className || ""}`}>
      <span className="truncate font-mono text-xs text-gray-600" title={address}>
        {address}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t("Copied") : t("Copy address")}
        title={copied ? t("Copied") : t("Copy address")}
        className={`shrink-0 rounded p-1 transition-colors ${
          copied ? "text-teal-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        }`}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M9 16.2l-3.5-3.5L4 14.1l5 5 11-11-1.4-1.4L9 16.2z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
          </svg>
        )}
      </button>
    </span>
  );
}
