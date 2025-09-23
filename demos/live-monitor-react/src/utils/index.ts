/**
 * Safely parse JSON strings
 * @param str The string to be parsed串
 * @param defaultValue The default value when the parsing fails
 * @returns Parse the result or default value
 */
export const safelyParse = <T = any>(str: string, defaultValue: T = null as T): T => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('Failed to parse JSON:', str, error);
    return defaultValue;
  }
};
