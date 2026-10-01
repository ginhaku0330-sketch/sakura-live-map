import { PREFS } from './prefs.js';
import { total, covered, search, detect, cleanCounts } from './model.js';
import { connect } from './cloud.js';
const $ = id => document.getElementById(id);
let cloud, state, canEdit = false, candidates = [], sequence = 0;
let legacy = {};
try { legacy = cleanCounts(JSON.parse(localStorage.getItem('sakuraListenerMapV3') || '{}')); } catch { legacy = cleanCounts(); }
$('legacy').textContent = `このブラウザの以前の人数：${total(legacy)}人`;
function render() {
  if (state) {
    $('covered').textContent = `${covered(state.counts)} / 47`;
    $('total').textContent = `${total(state.counts)} 人`;
    $('roses').textContent = state.roses;
  }
  const q = $('q').value;
  const prefs = q.trim() ? search(q) : PREFS.filter(p => (state?.counts[p] || 0) > 0);
  $('results').replaceChildren();
  for (const p of prefs) {
    const row = document.createElement('div'); row.className = 'pref';
    const label = document.createElement('b'); label.textContent = p;
    const counter = document.createElement('div'); counter.className = 'counter';
    const count = document.createElement('strong'); count.textContent = state ? state.counts[p] : '—';
    const minus = button('−1', () => run(() => cloud.change(p, -1))); minus.setAttribute('aria-label', p + 'を1人減らす');
    const plus = button('＋1', () => run(() => cloud.change(p, 1))); plus.className = 'plus'; plus.setAttribute('aria-label', p + 'を1人増やす');
    minus.disabled = !canEdit || !state?.counts[p]; plus.disabled = !canEdit;
    counter.append(minus, count, plus); row.append(label, counter); $('results').append(row);
  }
  if (!prefs.length) $('results').textContent = q ? '該当する都道府県がありません' : '県名を入力してください 🌸';
  document.querySelectorAll('[data-rose]').forEach(b => { b.disabled = !canEdit || (b.dataset.rose === '-1' && !state?.roses); });
  $('backup').disabled = !state;
  $('import').disabled = !canEdit || !total(legacy) || state?.imported || total(state?.counts || {}) > 0;
  renderCandidates();
}
function button(text, click) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = click; return b; }
async function run(action) {
  $('message').textContent = '保存中… この画面を閉じずにお待ちください';
  try { await action(); $('message').textContent = '保存しました 🌸'; return true; }
  catch { $('message').textContent = '保存を確認できませんでした。接続・ログイン・保存先の設定を確認し、表示人数を確かめてください'; return false; }
}
function renderCandidates() {
  $('candidates').replaceChildren();
  for (const c of candidates) {
    const row = document.createElement('div'); row.className = 'candidate';
    const title = document.createElement('b'); title.textContent = `${c.name}：${c.pref} ＋1？`;
    const text = document.createElement('p'); text.textContent = c.text;
    const approve = button('承認して＋1', async () => {
      if (!canEdit || c.pending) return;
      c.pending = true; renderCandidates();
      const ok = await run(() => cloud.change(c.pref, 1));
      if (ok) candidates = candidates.filter(x => x.id !== c.id);
      else c.pending = false;
      renderCandidates();
    });
    approve.disabled = !canEdit || c.pending;
    const skip = button('見送る', () => { candidates = candidates.filter(x => x.id !== c.id); renderCandidates(); });
    skip.disabled = c.pending;
    row.append(title, text, approve, skip); $('candidates').append(row);
  }
}
$('q').addEventListener('input', render);
document.querySelectorAll('[data-rose]').forEach(b => b.onclick = () => run(() => cloud.change('roses', Number(b.dataset.rose))));
$('detect').onclick = () => {
  const text = $('comment').value.trim(), name = $('viewer').value.trim() || 'お客さま';
  const prefs = detect(text);
  for (const pref of prefs) {
    if (!candidates.some(c => c.name === name && c.text === text && c.pref === pref)) candidates.push({ id: ++sequence, name, text, pref });
  }
  $('message').textContent = prefs.length ? '候補の内容を確認して承認してください' : '都道府県名が見つかりませんでした';
  renderCandidates();
};
$('import').onclick = async () => {
  if (confirm(`以前の${total(legacy)}人を共通保存先へ引き継ぎますか？\n共通保存先が空の場合だけ、一度取り込めます。`)) await run(() => cloud.importLegacy(legacy));
};
$('backup').onclick = () => {
  const blob = new Blob([JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `さくら累計-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('login').onclick = async () => { try { await cloud.login(); } catch { $('message').textContent = 'ログインできませんでした。Safariのポップアップ許可とGoogleログインの設定を確認してください'; } };
$('logout').onclick = async () => { try { await cloud.logout(); } catch { $('message').textContent = 'ログアウトできませんでした'; } };
render();
connect({
  onState: s => { state = s; render(); },
  onAuth: (owner, loggedIn) => {
    $('login').hidden = loggedIn; $('logout').hidden = !loggedIn;
    $('account').textContent = owner ? '管理者としてログイン済み' : loggedIn ? 'このGoogleアカウントには編集権限がありません。ログアウトして管理者のアカウントを選んでください' : '人数を変更するには管理者ログインが必要です';
  },
  onStatus: s => {
    canEdit = s.canEdit;
    $('connection').textContent = s.denied ? '保存先に接続できません。アクセス設定を確認してください' :
      !s.online ? '再接続中… 接続が戻るまで変更できません' : !s.loaded ? '累計データを読み込み中…' : s.busy ? '共通保存先へ保存中…' : '● 共通保存先に接続済み';
    render();
  }
}).then(c => { cloud = c; $('login').disabled = false; }).catch(e => {
  $('connection').textContent = e.message.includes('初期設定') ? e.message : '接続できません。ネット接続を確認して再読み込みしてください';
  $('message').textContent = '設定が終わるまで人数の変更はできません。以前のブラウザ内データは残っています。';
});
