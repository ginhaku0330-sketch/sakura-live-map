import { firebaseConfig, ownerUid } from './firebase-config.js';
import { stateOf, adjust, migrate } from './model.js';
export async function connect({ onState, onStatus, onAuth = () => {} }) {
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !ownerUid) {
    throw Error('共通保存先の初期設定が必要です');
  }
  const [appSDK, dbSDK, authSDK] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js'),
    import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js')
  ]);
  const app = appSDK.initializeApp(firebaseConfig);
  const db = dbSDK.getDatabase(app), auth = authSDK.getAuth(app);
  auth.languageCode = 'ja';
  const ref = dbSDK.ref(db, 'sakura');
  let online = false, loaded = false, busy = false, denied = false;
  function status() {
    onStatus({ online, loaded, busy, denied, canEdit: online && loaded && !busy && !denied && auth.currentUser?.uid === ownerUid });
  }
  dbSDK.onValue(dbSDK.ref(db, '.info/connected'), snapshot => { online = snapshot.val() === true; status(); });
  dbSDK.onValue(ref, snapshot => { loaded = true; denied = false; onState(stateOf(snapshot.val())); status(); },
    () => { denied = true; loaded = false; status(); });
  authSDK.onAuthStateChanged(auth, user => { onAuth(user?.uid === ownerUid, !!user); status(); });
  async function commit(update) {
    if (!online || !loaded || busy || denied || auth.currentUser?.uid !== ownerUid) throw Error('接続と管理者ログインを確認してください');
    busy = true; status();
    try {
      const result = await dbSDK.runTransaction(ref, update, { applyLocally: false });
      if (!result.committed) throw Error('取り込みは中止されました。すでに共通保存先に人数があるか、取り込み済みです');
      return stateOf(result.snapshot.val());
    } finally { busy = false; status(); }
  }
  return {
    login: () => authSDK.signInWithPopup(auth, new authSDK.GoogleAuthProvider()),
    logout: () => authSDK.signOut(auth),
    change: (key, delta) => commit(raw => adjust(raw, key, delta)),
    importLegacy: legacy => commit(raw => migrate(raw, legacy))
  };
}
