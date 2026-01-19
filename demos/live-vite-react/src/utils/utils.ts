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

export {
  safelyParse
};