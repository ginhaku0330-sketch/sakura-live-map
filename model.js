import { PREFS, ALIASES } from './prefs.js';
export const LIMIT = 100000000;
export const validCount = n => Number.isInteger(n) && n >= 0 && n <= LIMIT;
export function cleanCounts(raw = {}) {
  return Object.fromEntries(PREFS.map(p => [p, validCount(raw?.[p]) ? raw[p] : 0]));
}
export function stateOf(raw) {
  return { counts: cleanCounts(raw?.counts), roses: validCount(raw?.roses) ? raw.roses : 0,
    ...(raw?.imported === true ? { imported: true } : {}) };
}
export const total = counts => PREFS.reduce((sum, p) => sum + (counts[p] || 0), 0);
export const covered = counts => PREFS.filter(p => counts[p] > 0).length;
export function adjust(raw, key, delta) {
  if (!['roses', ...PREFS].includes(key) || ![1, -1].includes(delta)) throw Error('不正な操作です');
  const state = stateOf(raw);
  if (key === 'roses') state.roses = Math.min(LIMIT, Math.max(0, state.roses + delta));
  else state.counts[key] = Math.min(LIMIT, Math.max(0, state.counts[key] + delta));
  return state;
}
export function migrate(raw, legacy) {
  const state = stateOf(raw);
  if (state.imported || total(state.counts) > 0) return undefined;
  return { ...state, counts: cleanCounts(legacy), imported: true };
}
export const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s　]/g, '').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const names = p => [p, p.replace(/[都府県]$/, ''), ...(ALIASES[p] || [])].map(norm);
export const search = q => PREFS.filter(p => names(p).some(n => n.includes(norm(q))));
// コメントは曖昧な表現も含むため、必ず人が承認します。
export const detect = text => PREFS.filter(p => names(p).some(n => norm(text).includes(n)));
export function colorFor(n) {
  if (n <= 0) return '#f7edf1'; if (n === 1) return '#f7bfd1';
  if (n === 2) return '#ef95b4'; if (n === 3) return '#e5719b';
  if (n <= 5) return '#d65383'; return '#b83f6d';
}
