(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cards = window.LOVE_CARDS;
  const types = window.LOVE_CARD_TYPES;
  const byId = new Map(cards.map(c => [c.id,c]));
  const GAME_KEY = 'do-sal-ma:session:v1';
  const FAVORITES_KEY = 'do-sal-ma:favorites:v1';
  const numberFa = number => Number(number).toLocaleString('fa-IR');
  const CHAPTERS = [
    { name:'یخ‌ها آب می‌شن',short:'بخندیم!',description:'اول از ته دل بخندیم، بعد ببینیم چقدر هم رو بلدیم.',pattern:['fun','guess','fun','mission','guess','fun']},
    { name:'ماشین زمانِ ما',short:'خاطره‌ها',description:'سفر کوتاه به روزهایی که قصه‌مون شکل گرفت.',pattern:['memory','guess','memory','mission','memory','guess']},
    { name:'حرف‌های ناتمام',short:'حرفِ دل',description:'یه کم نزدیک‌تر، با سؤال‌های مهربون و واقعی.',pattern:['romance','guess','future','mission','romance','future']},
    { name:'فصلِ بعدیِ عشق',short:'ما و فردا',description:'یه پایان شیرین، چند آرزوی تازه و کمی دل‌بری.',pattern:['romance','mission','future','romance','mission','romance'],adultPattern:['spark','romance','mission','future','spark','romance']}
  ];
  let session = null;
  let favoriteIds = readJson(FAVORITES_KEY, []);
  let toastTimer;
  if (!Array.isArray(favoriteIds)) favoriteIds = [];
  favoriteIds = favoriteIds.filter(id => byId.has(id));

  function readJson(key, fallback){try {let x=localStorage.getItem(key);return x===null?fallback:JSON.parse(x)}catch{return fallback}}
  function writeJson(key, value){try {localStorage.setItem(key,JSON.stringify(value))}catch{/* private browsing; game still works */}}
  function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
  function loadSession(){
    const s=readJson(GAME_KEY,null);
    if(!s||!Array.isArray(s.players)||s.players.length!==2||!Array.isArray(s.deck)||s.deck.length<1||!Array.isArray(s.scores)||!s.deck.every(v=>v&&byId.has(v.id)&&Number.isInteger(v.chapter)&&v.chapter>=0&&v.chapter<4))return null;
    s.cursor=Math.max(0,Math.min(s.deck.length,Number(s.cursor)||0));
    s.bond=Math.max(0,Number(s.bond)||0);s.skips=Math.max(0,Number(s.skips)||0);
    s.scores=[Math.max(0,Number(s.scores[0])||0),Math.max(0,Number(s.scores[1])||0)];
    return s;
  }
  function saveSession(){if(session)writeJson(GAME_KEY,session)}
  function categoryDeck(length, adult){
    const pools={};
    for(const type of Object.keys(types)) pools[type]=shuffle(cards.filter(card=>card.type===type).map(c=>c.id));
    const perChapter=length/4;
    const deck=[];
    CHAPTERS.forEach((chapter,chapterId)=>{
      const pattern=(chapterId===3&&adult)?chapter.adultPattern:chapter.pattern;
      for(let i=0;i<perChapter;i++){
        const wanted=pattern[i%pattern.length];
        // There are enough cards in each category even for the 60-card game.
        let cardId=pools[wanted].pop();
        if(!cardId){const fallback=Object.keys(pools).filter(type=>type!=='spark'||adult).find(type=>pools[type].length);cardId=fallback?pools[fallback].pop():null}
        if(cardId)deck.push({id:cardId,chapter:chapterId});
      }
    });
    return deck;
  }
  function showView(view){
    for(const name of ['home','setup','game','ending']) $(name+'View').hidden=name!==view;
    if(view==='home')updateHome();
    if(view==='game')renderGame();
    if(view==='ending')renderEnding();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function updateHome(){
    const s=session||loadSession();
    $('resumeBtn').hidden=!s;
    if(s)$('resumeBtn').textContent=s.cursor>=s.deck.length?'دیدن پایان بازی ♡':'ادامهٔ بازی قبلی ↶';
  }
  function showToast(message){
    $('toast').textContent=message;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);
  }
  function currentCard(){return session&&session.cursor<session.deck.length?byId.get(session.deck[session.cursor].id):null}
  function currentChapter(){return session&&session.cursor<session.deck.length?session.deck[session.cursor].chapter:3}
  function turnIndex(){return session.cursor%2}
  function toSetup(){
    const saved=session||loadSession();
    if(saved){$('playerOne').value=saved.players[0];$('playerTwo').value=saved.players[1];}
    // Adult mode is opt-in each time a new game is configured.
    $('adultToggle').checked=false;$('ageConfirmed').checked=false;$('consentConfirmed').checked=false;$('adultConsent').hidden=true;$('setupError').hidden=true;
    showView('setup');
  }
  function startGame(event){
    event.preventDefault();
    const names=[$('playerOne').value.trim().slice(0,24)||'من',$('playerTwo').value.trim().slice(0,24)||'عشق من'];
    const adult=$('adultToggle').checked;
    if(adult&&(!$('ageConfirmed').checked||!$('consentConfirmed').checked)){
      $('setupError').textContent='برای کارت‌های ۱۸+، تأیید بزرگسال بودن و رضایت هر دو نفر لازمه.';
      $('setupError').hidden=false;
      $('setupError').scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if(session&&session.cursor<session.deck.length&&!confirm('بازی قبلی هنوز تموم نشده. می‌خواین از اول شروع کنین؟'))return;
    const length=Number(document.querySelector('input[name="length"]:checked').value)||24;
    session={players:names,deck:categoryDeck(length,adult),cursor:0,scores:[0,0],bond:0,skips:0,adult,startedAt:Date.now()};
    saveSession();showView('game');showToast('قصهٔ امشب شروع شد! ♡');
  }
  function renderRail(){
    const rail=$('chapterRail');rail.replaceChildren();
    const now=currentChapter();
    const done=session.cursor>=session.deck.length;
    CHAPTERS.forEach((ch,i)=>{
      const node=document.createElement('div');
      node.className='chapter-step'+(i<now||done?' is-done':'')+(i===now&&!done?' is-current':'');
      const heading=document.createElement('div');heading.className='chapter-step-top';
      const n=document.createElement('span');n.className='chapter-step-number';n.textContent=numberFa(i+1).padStart(2,'۰');
      const title=document.createElement('span');title.className='chapter-step-title';title.textContent=ch.short;
      heading.append(n,title);
      const track=document.createElement('div');track.className='chapter-track';
      const fill=document.createElement('span');
      const all=session.deck.filter(v=>v.chapter===i).length;
      const passed=session.deck.slice(0,session.cursor).filter(v=>v.chapter===i).length;
      fill.style.width=(all?100*passed/all:0)+'%';track.append(fill);node.append(heading,track);rail.append(node);
    });
    rail.setAttribute('aria-valuemin','0');rail.setAttribute('aria-valuemax',String(session.deck.length));rail.setAttribute('aria-valuenow',String(session.cursor));
  }
  function renderGame(){
    if(!session)return showView('home');
    if(session.cursor>=session.deck.length)return showView('ending');
    const card=currentCard(),type=types[card.type],chapter=currentChapter();
    renderRail();
    $('turnLabel').textContent='نوبت '+session.players[turnIndex()]+' ـه';
    $('counterLabel').textContent='کارت '+numberFa(session.cursor+1)+' از '+numberFa(session.deck.length);
    $('cardNum').textContent=String(session.cursor+1).padStart(2,'0')+' / '+String(session.deck.length).padStart(2,'0');
    $('gameCard').className='game-card accent-'+type.accent;
    $('cardType').textContent=type.title;
    $('cardGlyph').textContent=type.emoji;
    $('cardQuestion').textContent=card.q;
    $('cardSubtitle').textContent=type.subtitle;
    $('cardChapter').textContent='فصل '+numberFa(chapter+1)+' · '+CHAPTERS[chapter].name;
    $('cardTip').textContent=type.tip;
    $('regularControls').hidden=card.type==='guess'||card.type==='mission';
    $('guessControls').hidden=card.type!=='guess';
    $('missionControls').hidden=card.type!=='mission';
    $('scoreNameOne').textContent=session.players[0];
    $('scoreNameTwo').textContent=session.players[1];
    $('scoreOne').textContent=numberFa(session.scores[0]);
    $('scoreTwo').textContent=numberFa(session.scores[1]);
    $('bondValue').textContent=numberFa(session.bond)+' ♥';
    $('bondFill').style.width=Math.min(100,session.bond/Math.max(1,Math.ceil(session.deck.length/6))*100)+'%';
    $('playedValue').textContent=numberFa(session.cursor);
    $('chapterName').textContent=CHAPTERS[chapter].name;
    $('chapterDescription').textContent=CHAPTERS[chapter].description;
    const all=session.deck.filter(v=>v.chapter===chapter).length;
    const done=session.deck.slice(0,session.cursor).filter(v=>v.chapter===chapter).length;
    $('chapterProgress').style.width=(all?done/all*100:0)+'%';
    const favored=favoriteIds.includes(card.id);
    $('favoriteCurrentBtn').classList.toggle('is-fav',favored);
    $('favoriteCurrentBtn').textContent=favored?'♥':'♡';
    $('favoriteCurrentBtn').setAttribute('aria-label',favored?'حذف از محبوب‌ها':'افزودن به محبوب‌ها');
    const el=$('gameCard');el.classList.remove('card-fresh');void el.offsetWidth;el.classList.add('card-fresh');
  }
  function advance(result){
    if(!session||session.cursor>=session.deck.length)return;
    if(result==='hit')session.scores[turnIndex()]++;
    if(result==='done')session.bond++;
    if(result==='skip')session.skips++;
    session.cursor++;
    saveSession();
    if(session.cursor>=session.deck.length){showView('ending');showToast('ماجراجویی تموم شد؛ عشق هنوز ادامه داره ♡')}
    else renderGame();
  }
  function renderEnding(){
    if(!session)return showView('home');
    $('endTotal').textContent=numberFa(session.deck.length);
    $('endBond').textContent=numberFa(session.bond);
    $('endSkips').textContent=numberFa(session.skips);
    $('wishLabelOne').textContent='آرزوی '+session.players[0];
    $('wishLabelTwo').textContent='آرزوی '+session.players[1];
  }
  async function copyText(text){
    try{
      if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text)}
      else {const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();if(!document.execCommand('copy'))throw Error('copy unsupported');field.remove()}
      showToast('کپی شد! ♡');
    }catch{showToast('کپی خودکار ممکن نشد؛ متن رو دستی انتخاب کنین.')}
  }
  function updateFavoriteCount(){
    $('favoritesCount').textContent=String(favoriteIds.length);$('favoritesCount').hidden=!favoriteIds.length;
  }
  function toggleFavorite(){
    const card=currentCard();if(!card)return;
    const exists=favoriteIds.includes(card.id);
    favoriteIds=exists?favoriteIds.filter(id=>id!==card.id):[...favoriteIds,card.id];
    writeJson(FAVORITES_KEY,favoriteIds);updateFavoriteCount();renderGame();
    showToast(exists?'از محبوب‌ها حذف شد':'رفت توی کارت‌های محبوب! ♥');
  }
  function renderFavorites(){
    const list=$('favoritesList');list.replaceChildren();
    if(!favoriteIds.length){const p=document.createElement('p');p.className='empty-fav';p.textContent='هنوز کارتی رو قلب نزدی! ♡';list.append(p);return}
    favoriteIds.forEach(id=>{
      const card=byId.get(id);if(!card)return;
      const entry=document.createElement('div');entry.className='fav-entry';
      const head=document.createElement('div');head.className='fav-entry-header';
      const title=document.createElement('strong');title.textContent=types[card.type].title;
      const remove=document.createElement('button');remove.className='fav-remove';remove.textContent='حذف ×';remove.type='button';
      remove.addEventListener('click',()=>{favoriteIds=favoriteIds.filter(x=>x!==id);writeJson(FAVORITES_KEY,favoriteIds);updateFavoriteCount();renderFavorites();if(!$('gameView').hidden)renderGame()});
      head.append(title,remove);
      const p=document.createElement('p');p.textContent=card.q;entry.append(head,p);list.append(entry);
    });
  }
  function openDialog(id){const el=$(id);if(typeof el.showModal==='function')el.showModal();else el.setAttribute('open','')}
  function closeDialog(id){const el=$(id);if(typeof el.close==='function')el.close();else el.removeAttribute('open')}
  function restart(){
    if(!confirm('این بازی از اول شروع می‌شه و امتیازهای فعلی پاک می‌شن. ادامه می‌دین؟'))return;
    session=null;try{localStorage.removeItem(GAME_KEY)}catch{}
    toSetup();
  }
  function bind(){
    $('newGameBtn').addEventListener('click',toSetup);
    $('setupBackBtn').addEventListener('click',()=>showView('home'));
    $('setupForm').addEventListener('submit',startGame);
    $('adultToggle').addEventListener('change',()=>{
      const yes=$('adultToggle').checked;$('adultConsent').hidden=!yes;$('setupError').hidden=true;
      if(!yes){$('ageConfirmed').checked=false;$('consentConfirmed').checked=false}
    });
    $('resumeBtn').addEventListener('click',()=>{session=session||loadSession();if(session)showView(session.cursor>=session.deck.length?'ending':'game')});
    $('gameHomeBtn').addEventListener('click',()=>showView('home'));
    $('brandHome').addEventListener('click',event=>{event.preventDefault();showView('home')});
    $('restartBtn').addEventListener('click',restart);
    $('nextCardBtn').addEventListener('click',()=>advance('next'));
    $('skipBtn').addEventListener('click',()=>advance('skip'));
    $('guessHitBtn').addEventListener('click',()=>advance('hit'));
    $('guessMissBtn').addEventListener('click',()=>advance('next'));
    $('missionDoneBtn').addEventListener('click',()=>advance('done'));
    $('missionSkipBtn').addEventListener('click',()=>advance('skip'));
    $('favoriteCurrentBtn').addEventListener('click',toggleFavorite);
    $('copyCardBtn').addEventListener('click',()=>{const card=currentCard();if(card)copyText('♡ دو سال، یک دنیا ما\n'+types[card.type].title+'\n'+card.q)});
    $('helpBtn').addEventListener('click',()=>openDialog('helpDialog'));
    $('favoritesBtn').addEventListener('click',()=>{renderFavorites();openDialog('favoritesDialog')});
    $('endFavoritesBtn').addEventListener('click',()=>{renderFavorites();openDialog('favoritesDialog')});
    document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeDialog(button.dataset.close)));
    document.querySelectorAll('dialog.modal').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
    $('playAgainBtn').addEventListener('click',()=>{session=null;try{localStorage.removeItem(GAME_KEY)}catch{};toSetup()});
    $('copyWishesBtn').addEventListener('click',()=>{
      const a=$('wishOne').value.trim(),b=$('wishTwo').value.trim();
      const text='♡ دو سال، یک دنیا ما ♡\nیادگاری سالگرد دوم\n\n'+session.players[0]+':\n'+(a||'به امید اتفاق‌های قشنگ‌تر...')+'\n\n'+session.players[1]+':\n'+(b||'به امید خاطرات بیشتر...')+'\n\nتا سالگرد سوم، کنار هم ♡';
      copyText(text);
    });
    // No shortcut advances the card accidentally when a text field/dialog is active.
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')return;
      if(event.key==='ArrowLeft'&&!$('gameView').hidden&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){
        const card=currentCard();if(card&&card.type!=='guess'&&card.type!=='mission')advance('next');
      }
    });
  }
  function setup(){
    session=loadSession();
    bind();updateFavoriteCount();showView('home');
    if('serviceWorker' in navigator&&location.protocol!=='file:'){
      window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
    }
  }
  setup();
})();
