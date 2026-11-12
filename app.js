(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cards = window.LOVE_CARDS;
  const types = window.LOVE_CARD_TYPES;
  const byId = new Map(cards.map(card => [card.id, card]));
  const GAME_KEY = 'do-sal-ma:session:v2';
  const FAVORITES_KEY = 'do-sal-ma:favorites:v2';
  const START_TURNS = 12;
  const MAX_TURNS = 20;
  const fa = value => Number(value).toLocaleString('fa-IR');
  let session = null;
  let favorites = readJson(FAVORITES_KEY, []);
  let toastTimer;
  if (!Array.isArray(favorites)) favorites = [];
  favorites = favorites.filter(id => byId.has(id));

  function readJson(key, fallback) {
    try {const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw)}
    catch {return fallback}
  }
  function saveJson(key, value) {try {localStorage.setItem(key, JSON.stringify(value))} catch {}}
  function save() {if (session) saveJson(GAME_KEY, session)}
  function load() {
    const data = readJson(GAME_KEY, null);
    if (!data || data.version !== 2 || !Array.isArray(data.players) || data.players.length !== 2 ||
        !Array.isArray(data.done) || !Array.isArray(data.seen) ||
        !data.done.every(entry => byId.has(entry.id)) || !data.seen.every(id => byId.has(id)) ||
        (data.current && !byId.has(data.current)) || !Number.isInteger(data.target)) return null;
    data.target = Math.max(START_TURNS, Math.min(MAX_TURNS, data.target));
    data.players = data.players.map((name, i) => String(name || (i ? 'تو' : 'من')).slice(0, 20));
    data.seen = [...new Set(data.seen)];
    data.stars = Math.max(0, Number(data.stars) || 0);
    data.missions = Math.max(0, Number(data.missions) || 0);
    data.ended = Boolean(data.ended);
    return data;
  }
  function showView(view) {
    for (const name of ['home', 'setup', 'game', 'ending']) $(name + 'View').hidden = name !== view;
    if (view === 'home') updateHome();
    if (view === 'game') renderGame();
    if (view === 'ending') renderEnding();
    window.scrollTo({top:0, behavior:'instant'});
  }
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2300);
  }
  function isFinished() {
    return session && (session.ended || session.done.length >= session.target || !hasRemaining() && !session.current);
  }
  function hasRemaining(type) {return cards.some(c => (!type || c.type === type) && !session.seen.includes(c.id))}
  function currentCard() {return session && session.current ? byId.get(session.current) : null}
  function whoseTurn() {return session.done.length % 2}
  function updateHome() {
    const saved = session || load();
    $('resumeBtn').hidden = !saved;
    if (saved) $('resumeBtn').textContent = saved.ended || saved.done.length >= saved.target ? 'دیدن پایان ♡' : 'ادامهٔ بازی ↶';
  }
  function toSetup() {
    const saved = session || load();
    if (saved) {
      $('playerOne').value = saved.players[0];
      $('playerTwo').value = saved.players[1];
    }
    showView('setup');
  }
  function startGame(e) {
    e.preventDefault();
    if (session && !isFinished() && !confirm('بازی فعلی از اول شروع بشه؟')) return;
    const names = [
      $('playerOne').value.trim().slice(0, 20) || 'من',
      $('playerTwo').value.trim().slice(0, 20) || 'تو'
    ];
    session = {version:2, players:names, target:START_TURNS, done:[], seen:[], current:null,
               stars:0, missions:0, ended:false, startedAt:Date.now()};
    save();
    showView('game');
  }
  function draw(type) {
    if (!session || isFinished()) return;
    const available = cards.filter(c => c.type === type && !session.seen.includes(c.id));
    if (!available.length) {toast('این دسته دیگه کارت نداره ♡'); return}
    const card = available[Math.floor(Math.random() * available.length)];
    session.current = card.id;
    session.seen.push(card.id);
    save();
    renderGame(true);
  }
  function redraw() {
    const card = currentCard();
    if (!card) return;
    if (hasRemaining(card.type)) draw(card.type);
    else toast('این دسته تموم شد؛ یه دستهٔ دیگه بزن');
  }
  function renderCategories() {
    const picker = $('categoryPicker');
    picker.replaceChildren();
    Object.entries(types).forEach(([type, meta]) => {
      const button = document.createElement('button');
      const remaining = cards.filter(c => c.type === type && !session.seen.includes(c.id)).length;
      button.type = 'button';
      button.className = 'category-choice category-' + type + (currentCard()?.type === type ? ' is-selected' : '');
      button.disabled = remaining === 0 && currentCard()?.type !== type;
      button.setAttribute('aria-pressed', String(currentCard()?.type === type));
      button.setAttribute('aria-label', meta.title + (remaining ? '' : '، بدون کارت تازه'));
      const glyph = document.createElement('span'); glyph.className = 'choice-glyph'; glyph.textContent = meta.emoji;
      const label = document.createElement('span'); label.textContent = meta.title;
      button.append(glyph, label);
      button.addEventListener('click', () => {
        if (currentCard()?.type === type) return;
        draw(type);
      });
      picker.append(button);
    });
  }
  function renderGame(animate = false) {
    if (!session) {showView('home'); return}
    if (isFinished()) {showView('ending'); return}
    const card = currentCard();
    $('turnLabel').textContent = 'نوبت ' + session.players[whoseTurn()];
    $('counterLabel').textContent = fa(session.done.length + 1) + ' از ' + fa(session.target);
    $('turnProgress').style.width = (session.done.length / session.target * 100) + '%';
    $('starStat').textContent = '✦ ' + fa(session.stars) + ' حدس درست';
    $('missionStat').textContent = '♥ ' + fa(session.missions) + ' مأموریت';
    renderCategories();
    $('emptyState').hidden = !!card;
    $('activeCardArea').hidden = !card;
    if (!card) return;
    const meta = types[card.type];
    $('gameCard').className = 'game-card accent-' + meta.accent;
    $('cardType').textContent = meta.title;
    $('cardNum').textContent = fa(session.done.length + 1).padStart(2, '۰') + ' / ' + fa(session.target);
    $('cardGlyph').textContent = meta.emoji;
    $('cardQuestion').textContent = card.q;
    $('cardCue').textContent = meta.cue;
    $('regularControls').hidden = card.type === 'guess' || card.type === 'mission';
    $('guessControls').hidden = card.type !== 'guess';
    $('missionControls').hidden = card.type !== 'mission';
    $('redrawBtn').disabled = !hasRemaining(card.type);
    $('redrawBtn').title = hasRemaining(card.type) ? '' : 'کارت‌های این دسته تموم شده';
    $('favoriteCurrentBtn').classList.toggle('is-fav', favorites.includes(card.id));
    $('favoriteCurrentBtn').textContent = favorites.includes(card.id) ? '♥' : '♡';
    if (animate) {
      const element = $('gameCard');
      element.classList.remove('card-fresh');
      void element.offsetWidth;
      element.classList.add('card-fresh');
    }
  }
  function complete(result) {
    const card = currentCard();
    if (!card) return;
    if (card.type === 'guess' && result === 'hit') session.stars++;
    if (card.type === 'mission' && result === 'done') session.missions++;
    session.done.push({id:card.id, who:whoseTurn(), result});
    session.current = null;
    save();
    showView(isFinished() ? 'ending' : 'game');
  }
  function finishEarly() {
    if (!session) return;
    if (!session.done.length && !session.current) {showView('home'); return}
    if (!confirm('بازی رو همین‌جا تموم کنیم؟')) return;
    session.ended = true;
    save(); showView('ending');
  }
  function renderEnding() {
    if (!session) return showView('home');
    $('endTotal').textContent = fa(session.done.length);
    $('endStars').textContent = fa(session.stars);
    $('endMissions').textContent = fa(session.missions);
    $('wishLabelOne').textContent = session.players[0];
    $('wishLabelTwo').textContent = session.players[1];
    const canExtend = session.done.length < MAX_TURNS && hasRemaining();
    $('extendBtn').hidden = !canExtend;
  }
  function extend() {
    if (!session || !hasRemaining()) return;
    session.target = Math.min(MAX_TURNS, Math.max(session.target, session.done.length) + 4);
    session.ended = false;
    save(); showView('game');
  }
  function updateFavoritesCount() {
    $('favoritesCount').textContent = fa(favorites.length);
    $('favoritesCount').hidden = favorites.length === 0;
  }
  function toggleFavorite() {
    const card = currentCard(); if (!card) return;
    favorites = favorites.includes(card.id) ? favorites.filter(id => id !== card.id) : [...favorites, card.id];
    saveJson(FAVORITES_KEY, favorites);
    updateFavoritesCount(); renderGame();
  }
  function renderFavorites() {
    const list = $('favoritesList'); list.replaceChildren();
    if (!favorites.length) {const p = document.createElement('p'); p.className='empty-fav'; p.textContent='هنوز کارتی رو انتخاب نکردین ♡'; list.append(p); return}
    favorites.forEach(id => {
      const card = byId.get(id); if (!card) return;
      const wrap = document.createElement('div'); wrap.className='fav-entry';
      const head = document.createElement('div'); head.className='fav-entry-header';
      const title = document.createElement('strong'); title.textContent=types[card.type].title;
      const remove = document.createElement('button'); remove.type='button'; remove.className='fav-remove'; remove.textContent='حذف ×';
      remove.addEventListener('click', () => {favorites=favorites.filter(item => item !== id); saveJson(FAVORITES_KEY, favorites); updateFavoritesCount(); renderFavorites(); if (!$('gameView').hidden) renderGame()});
      head.append(title, remove);
      const question = document.createElement('p'); question.textContent=card.q;
      wrap.append(head, question); list.append(wrap);
    });
  }
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const el=document.createElement('textarea'); el.value=text; el.style.position='fixed'; el.style.opacity='0'; document.body.append(el); el.select();
        if (!document.execCommand('copy')) throw Error('copy failed'); el.remove();
      }
      toast('کپی شد ♡');
    } catch {toast('کپی نشد؛ می‌تونی متن رو انتخاب کنی')}
  }
  function openDialog(id) {const dialog=$(id); if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '')}
  function closeDialog(id) {const dialog=$(id); if (dialog.close) dialog.close(); else dialog.removeAttribute('open')}
  function bind() {
    $('newGameBtn').addEventListener('click', toSetup);
    $('setupBackBtn').addEventListener('click', () => showView('home'));
    $('setupForm').addEventListener('submit', startGame);
    $('resumeBtn').addEventListener('click', () => {session=session||load(); if(session) showView(isFinished()?'ending':'game')});
    $('gameHomeBtn').addEventListener('click', () => showView('home'));
    $('brandHome').addEventListener('click', e => {e.preventDefault(); showView('home')});
    $('endEarlyBtn').addEventListener('click', finishEarly);
    $('redrawBtn').addEventListener('click', redraw);
    $('nextCardBtn').addEventListener('click', () => complete('done'));
    $('skipBtn').addEventListener('click', () => complete('skip'));
    $('guessHitBtn').addEventListener('click', () => complete('hit'));
    $('guessMissBtn').addEventListener('click', () => complete('miss'));
    $('missionDoneBtn').addEventListener('click', () => complete('done'));
    $('missionSkipBtn').addEventListener('click', () => complete('skip'));
    $('favoriteCurrentBtn').addEventListener('click', toggleFavorite);
    $('copyCardBtn').addEventListener('click', () => {const card=currentCard(); if (card) copy(types[card.type].title + '\n' + card.q)});
    $('favoritesBtn').addEventListener('click', () => {renderFavorites(); openDialog('favoritesDialog')});
    $('helpBtn').addEventListener('click', () => openDialog('helpDialog'));
    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));
    document.querySelectorAll('dialog.modal').forEach(dialog => dialog.addEventListener('click', e => {if(e.target===dialog)dialog.close()}));
    $('playAgainBtn').addEventListener('click', () => {session=null; try {localStorage.removeItem(GAME_KEY)} catch{}; toSetup()});
    $('extendBtn').addEventListener('click', extend);
    $('copyWishesBtn').addEventListener('click', () => {
      if (!session) return;
      const left=$('wishOne').value.trim(), right=$('wishTwo').value.trim();
      copy('♡ دو سال، یک دنیا ما\n\n' + session.players[0] + ': ' + (left||'…') + '\n' + session.players[1] + ': ' + (right||'…'));
    });
  }
  function init() {
    session=load();
    bind(); updateFavoritesCount(); showView('home');
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
  }
  init();
})();
