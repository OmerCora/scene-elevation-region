import { MODULE_ID } from "./config.mjs";

let _debugLogging = false;

export function setDebugLogging(enabled = true) {
  _debugLogging = enabled !== false;
  // eslint-disable-next-line no-console
  console.log(`[${MODULE_ID}] debug logging ${_debugLogging ? "enabled" : "disabled"}`);
  return _debugLogging;
}

export function isDebugLogging() {
  return _debugLogging;
}

export function debugLog(tag, ...args) {
  if (!_debugLogging) return;
  const tokenArg = args.find(value => value?.name && value?.id);
  const label = tokenArg ? `${tokenArg.name}#${tokenArg.id}` : "";
  // eslint-disable-next-line no-console
  console.log(`[${MODULE_ID}:${tag}]`, label, ...args);
}

export function debugWarn(tag, error, ...args) {
  if (!_debugLogging) return;
  // eslint-disable-next-line no-console
  console.warn(`[${MODULE_ID}:${tag}]`, ...args, error);
}