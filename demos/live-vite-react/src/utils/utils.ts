import TUIRoomEngine from "@tencentcloud/tuiroom-engine-js";

/**
 * 安全执行 JSON.parse
 * @param data
 * @returns
 */
function safelyParse(data: string) {
  if (typeof data !== 'string') {
    return data;
  }
  let result;
  try {
    const tempData = JSON.parse(data);
    // 规避 JSON.parse('12345') 转化为 12345 的情况
    if (typeof tempData === 'object' && tempData) {
      result = tempData;
    } else {
      result = data;
    }
  } catch (error) {
    result = data;
  }
  return result;
}

async function initRoomEngineLanguage(language: string) {
  let lang: string = 'en';
  if (language.includes('en')) {
    lang = 'en';
  } else if (language.includes('zh')) {
    lang = 'zh-Hans';
  }
  await TUIRoomEngine.callExperimentalAPI(JSON.stringify({
    api: 'setCurrentLanguage',
    params: {
      language: lang,
    },
  }));
}

/**
 * Copy text to the system clipboard. Uses the modern Clipboard API when
 * available (requires a secure context — `https://` or `localhost`); falls
 * back to a synchronous `document.execCommand('copy')` over a hidden
 * `<textarea>` so the helper still works inside http:// dev environments
 * and browsers that do not yet expose `navigator.clipboard.writeText`.
 *
 * Throws when neither path succeeds, so callers can surface a "copy
 * failed" toast.
 */
async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined'
    && navigator.clipboard
    && typeof navigator.clipboard.writeText === 'function'
    // `navigator.clipboard` is gated on secure contexts in most
    // browsers; calling writeText() outside one rejects with
    // NotAllowedError. Detect the gating up front so we can fall
    // through to the legacy path instead of bubbling up an error.
    && (typeof window === 'undefined' || window.isSecureContext)) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Legacy fallback. `execCommand('copy')` requires the source
  // selection to live inside the document, so we briefly attach a
  // hidden textarea, select its content, copy, then detach.
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const ok = document.execCommand('copy');
    if (!ok) {
      throw new Error('document.execCommand("copy") returned false');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export {
  safelyParse,
  initRoomEngineLanguage,
  copyToClipboard,
};
