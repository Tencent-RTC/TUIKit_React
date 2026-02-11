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

export {
  safelyParse,
  initRoomEngineLanguage
};