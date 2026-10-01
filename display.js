import { PREFS } from './prefs.js';
import { total, covered, colorFor } from './model.js';
import { connect } from './cloud.js';
let counts = null;
const status = document.getElementById('connection');
function paint() {
  if (!counts) return;
  document.getElementById('covered').textContent = covered(counts) + '/47';
  document.getElementById('total').textContent = total(counts) + '人';
  for (const p of PREFS) {
    for (const el of document.querySelectorAll(`#map [data-name="${p}"]`)) {
      el.style.fill = colorFor(counts[p]); el.style.stroke = '#fff';
    }
  }
}
fetch('./japan.svg').then(r => { if (!r.ok) throw Error(); return r.text(); }).then(svg => {
  document.getElementById('map').innerHTML = svg; paint();
}).catch(() => { document.getElementById('map').textContent = '地図を読み込めませんでした。画面を再読み込みしてください'; });
connect({
  onState: s => { counts = s.counts; document.getElementById('roses').textContent = s.roses + '本'; paint(); },
  onStatus: s => { status.textContent = s.denied ? '同期エラー：保存先の設定を確認してください' :
    !s.online ? '再接続中…（最後に受信した人数を表示）' : !s.loaded ? '人数を読み込み中…' : ''; }
}).catch(e => { status.textContent = e.message.includes('初期設定') ? e.message : '接続できません。ネット接続を確認して再読み込みしてください'; });
