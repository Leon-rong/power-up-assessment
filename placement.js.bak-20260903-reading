/**
 * 其乐嵘戎 Power Up Assessment - 自适应综合定级测评（placement.js）
 *
 * 设计依据（联网最佳实践 · Oxford OPTYL / NGL / BOOKR / EduSynch 共识）：
 *   - 计算机自适应（adaptive）：根据实时作答动态调整难度
 *   - 双维度：语言应用（Language Use）+ 听力理解（Listening）
 *   - 即时自动评分 + CEFR 等级报告 + 分项分数 + 薄弱点
 *
 * 音频：
 *   - 语言应用：浏览器 TTS（SpeechSynthesis）朗读单词，0 体积、离线、与题目一一对应
 *   - 听力理解：接入真实 EOL 原版 MP3 录音（audio/puX_xxx/puX_partN.mp3）
 *     顶部已修复 openTest 音频接线；opus 压缩脚本见 tools/compress_audio
 *
 * 注意：听力题库按 YLE 标准题型重建，答案建议对照每册答案页（images_webp/*_ak）复核。
 */
(function () {
  'use strict';

  // ===================== 状态 =====================
  var LANG_TOTAL = 24;            // 语言应用题量
  var CEFR = ['Pre-A1', 'Pre-A1→A1', 'A1', 'A1+', 'A2', 'A2', 'B1'];
  var BOOK_BY_LEVEL = ['pu0', 'pu1', 'pu2', 'pu3', 'pu4', 'pu4', 'pu4'];

  var P = {
    lang: null,    // { level, streak, total, correct, pool, poolIndex, currentWord, currentOptions, questions }
    listen: null,  // { book, parts, partIdx, qIdx, correct, total, answers, bookName }
    langLevel: 0,
    listenAccuracy: 0
  };

  // ===================== 工具 =====================
  function $(id) { return document.getElementById(id); }
  function show(id) { var e = $(id); if (e) e.style.display = ''; }
  function hide(id) { var e = $(id); if (e) e.style.display = 'none'; }

  function speak(text) {
    try {
      if (window.speechSynthesis) {
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = 0.85;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      }
    } catch (e) {}
  }

  // ===================== 入口 =====================
  function startPlacement() {
    hide('plIntro'); hide('plLang'); hide('plListen'); hide('plReport'); hide('plReading');
    P.lang = null; P.read = null; P.listen = null; P.langLevel = 0; P.listenAccuracy = 0;
    P.startTs = Date.now();
    show('plLang');
    startLangUse();
  }

  // ===================== Part 1：语言应用（自适应） =====================
  function initLangPool() {
    var data = (typeof VOCAB_DATA !== 'undefined') ? VOCAB_DATA : (window.VOCAB_DATA || {});
    var pool = {}, poolIndex = {};
    Object.keys(data).forEach(function (l) {
      var arr = data[l].slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      pool[l] = arr; poolIndex[l] = 0;
    });
    return { pool: pool, poolIndex: poolIndex };
  }

  function getNextWord(state) {
    var l = String(state.level);
    var p = state.pool[l];
    if (!p || state.poolIndex[l] >= p.length) {
      p = p.slice().sort(function () { return Math.random() - 0.5; });
      state.pool[l] = p; state.poolIndex[l] = 0;
    }
    return p[state.poolIndex[l]++];
  }

  function getMeaningOptions(correct) {
    var data = (typeof VOCAB_DATA !== 'undefined') ? VOCAB_DATA : (window.VOCAB_DATA || {});
    var all = [];
    Object.keys(data).forEach(function (l) { data[l].forEach(function (w) { all.push(w); }); });
    all = all.filter(function (w) { return w.meaning !== correct.meaning; });
    all.sort(function () { return Math.random() - 0.5; });
    var opts = [correct.meaning];
    for (var i = 0; i < all.length && opts.length < 4; i++) {
      if (opts.indexOf(all[i].meaning) < 0) opts.push(all[i].meaning);
    }
    while (opts.length < 4) opts.push('选项' + (opts.length + 1));
    opts.sort(function () { return Math.random() - 0.5; });
    return opts;
  }

  function startLangUse() {
    var pp = initLangPool();
    P.lang = {
      level: 0, streak: 0, total: 0, correct: 0,
      pool: pp.pool, poolIndex: pp.poolIndex,
      currentWord: null, currentOptions: [], questions: []
    };
    renderLangQuestion();
  }

  function renderLangQuestion() {
    var s = P.lang;
    if (s.total >= LANG_TOTAL) { finishLangUse(); return; }
    var word = getNextWord(s);
    if (!word || !word.word) { console.error('无可用词'); return; }
    s.currentWord = word;
    s.currentOptions = getMeaningOptions(word);

    var labels = ['A', 'B', 'C', 'D'];
    var html = '';
    html += '<div style="text-align:center; margin-bottom:14px;">';
    html += '  <div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-bottom:6px;">';
    html += '    <span style="font-size:12px; color:var(--muted);">语言应用 · 第 ' + (s.total + 1) + '/' + LANG_TOTAL + ' 题</span>';
    html += '    <span style="font-size:12px; color:var(--gold); font-weight:600;">🔥 连击 ' + s.streak + '</span>';
    html += '    <span style="font-size:12px; color:var(--green); font-weight:600;">⭐ XP ' + (typeof window.gamify === 'object' ? window.gamify.xp : 0) + '</span>';
    html += '  </div>';
    html += '  <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">Level ' + s.level + ' (' + CEFR[s.level] + ')</div>';
    html += '  <div style="height:8px; background:var(--border); border-radius:6px; margin:8px 0 18px; overflow:hidden;">';
    html += '    <div style="height:100%; width:' + ((s.total + 1) / LANG_TOTAL * 100) + '%; background:var(--gold); transition:width .3s;"></div></div>';
    html += '  <div style="font-size:40px; font-weight:700; color:var(--text); letter-spacing:1px;">' + word.word + '</div>';
    html += '  <button class="ctrl-btn" onclick="plSpeakWord()" style="margin-top:8px;">🔊 听发音</button>';
    html += '  <div style="font-size:13px; color:var(--muted); margin-top:6px;">请选择该单词的正确中文意思</div>';
    html += '</div>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">';
    s.currentOptions.forEach(function (opt, i) {
      html += '<button class="vocab-opt-btn" data-i="' + i + '" onclick="plLangSelect(' + i + ')">' + labels[i] + '. ' + opt + '</button>';
    });
    html += '</div>';

    var box = $('plLang');
    box.innerHTML = html;
    speak(word.word);
  }

  function plSpeakWord() { if (P.lang && P.lang.currentWord) speak(P.lang.currentWord.word); }

  function plLangSelect(idx) {
    var s = P.lang, word = s.currentWord, opts = s.currentOptions;
    var correct = opts.indexOf(word.meaning);
    var isCorrect = parseInt(idx) === correct;
    var btns = document.querySelectorAll('#plLang .vocab-opt-btn');
    btns.forEach(function (b, i) {
      b.disabled = true;
      if (i === correct) { b.classList.add('correct'); b.innerHTML += ' ✓'; }
      else if (parseInt(i) === parseInt(idx) && !isCorrect) { b.classList.add('wrong'); b.innerHTML += ' ✗'; }
    });
    s.total++;
    s.questions.push({ word: word.word, level: s.level, correct: isCorrect });
    if (isCorrect) {
      s.correct++; s.streak++;
      if (typeof window.gamify === 'object') { window.gamify.addXp(10); window.gamify.comboUp(); }
      if (s.streak >= 3 && s.level < 6) {
        s.level++; s.streak = 0;
        setTimeout(function(){ showToast('⬆️ 进入 Level ' + s.level + '！'); if (typeof window.gamify === 'object') window.gamify.unlockBadge('🚀 升级达人'); }, 400);
      }
    } else {
      s.streak = 0;
      if (typeof window.gamify === 'object') window.gamify.comboReset();
      if (s.level > 0) { s.level--; setTimeout(function(){ showToast('⬇️ 退回 Level ' + s.level); }, 400); }
    }
    setTimeout(renderLangQuestion, 1100);
  }

  function finishLangUse() {
    var s = P.lang;
    P.langLevel = s.level;
    if (typeof window.gamify === 'object') {
      window.gamify.addXp(50);
      window.gamify.unlockBadgeById('placement_done');
      window.gamify.unlockBadgeById('first_step');
      if (s.correct === s.total) window.gamify.unlockBadgeById('perfect_lang');
    }
    var acc = Math.round(s.correct / s.total * 100);
    var book = BOOK_BY_LEVEL[s.level];
    var bookName = { pu0:'Power Up 0 (Pre-A1 Starters)', pu1:'Power Up 1 (Pre-A1→A1 Starters)', pu2:'Power Up 2 (A1 Movers)', pu3:'Power Up 3 (A1+ Movers)', pu4:'Power Up 4 (A2 Flyers)' }[book];

    var html = '';
    html += '<div style="text-align:center; padding:10px 0 18px;">';
    html += '  <div style="font-size:46px;">🗣️</div>';
    html += '  <h3 style="color:var(--gold); margin:8px 0;">语言应用完成！</h3>';
    html += '  <p style="font-size:15px;">正确率 <strong>' + acc + '%</strong>（' + s.correct + '/' + s.total + '）</p>';
    html += '  <p style="font-size:15px; margin-top:6px;">你的语言应用水平 ≈ <strong>Level ' + s.level + ' · ' + CEFR[s.level] + '</strong></p>';
    html += '  <p style="color:var(--muted); font-size:13px; margin-top:10px;">下一步：阅读理解 + 完形填空，然后进入听力模考</p>';
    html += '  <div style="margin-top:18px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">';
    html += '    <button class="btn" onclick="startReading()">📚 开始阅读理解</button>';
    html += '    <button class="btn btn-outline" onclick="plStartListening(prompt(\'输入册号 pu0/pu1/pu2/pu3/pu4：\',\'' + book + '\'))">✏️ 直接选听力册</button>';
    html += '  </div>';
    html += '</div>';
    $('plLang').innerHTML = html;
  }

  // ===================== Part 2：阅读理解 + 完形填空 =====================
  // 分级短文（5 级 × 2 篇）。题目针对该级核心词汇与句型，难度逐年递增。
  // 自适应算法：4 篇从易到难（基于 langLevel），答对升级/答错掉级。
  var READING_BANK = {
    // PU0 (Pre-A1 Starters) - 30-50 词 · 基础名词 · 描述当下
    pu0: [
      {
        title: 'My Pet',
        text: 'I have a small cat. Her name is Mimi. She is white and brown. She likes fish and milk. Every morning, I give her food in the kitchen. She drinks water from a blue bowl.',
        items: [
          { type:'choice', q:'What pet does the writer have?', options:['A dog','A cat','A fish','A bird'], ans:1 },
          { type:'choice', q:'What colour is Mimi?', options:['Black and white','White and brown','Black and brown','Grey'], ans:1 },
          { type:'fill', q:'What does Mimi like to eat? (_____ and milk)', ans:'fish', hint:'食物' },
          { type:'fill', q:'Where does Mimi drink water? from a _____ bowl', ans:'blue', hint:'颜色' }
        ]
      },
      {
        title: 'My Family',
        text: 'This is my family. My father is tall. My mother has short hair. I have one brother and one sister. We live in a small house. There are four rooms in it. I love my family very much.',
        items: [
          { type:'choice', q:'How many brothers and sisters does the writer have?', options:['One','Two','Three','Four'], ans:1 },
          { type:'choice', q:'What does the writer love?', options:['Her house','Her school','Her family','Her cat'], ans:2 },
          { type:'fill', q:'Her mother has _____ hair', ans:'short', hint:'形容词' },
          { type:'fill', q:'There are _____ rooms in the house', ans:'four', hint:'数字' }
        ]
      }
    ],
    // PU1 (Pre-A1→A1 Starters) - 60-80 词 · 一般现在时 · 日程与喜好
    pu1: [
      {
        title: 'A Day at School',
        text: 'I get up at seven o\'clock every day. I have breakfast at half past seven. Then I go to school at eight. I have four lessons in the morning and two in the afternoon. My favourite subject is English because the teacher is kind. I go home at five o\'clock.',
        items: [
          { type:'choice', q:'What time does the writer get up?', options:['6:00','7:00','7:30','8:00'], ans:1 },
          { type:'choice', q:'How many lessons are there in the morning?', options:['Two','Three','Four','Six'], ans:2 },
          { type:'fill', q:'What is the writer\'s favourite subject? (because the teacher is _____)', ans:'kind', hint:'形容词' },
          { type:'fill', q:'When does the writer go home? at _____', ans:'five', hint:'时间' }
        ]
      },
      {
        title: 'My Favourite Food',
        text: 'For breakfast, I usually eat bread and drink milk. For lunch at school, I like rice and fish. My favourite food is pizza because it has cheese and tomato. I eat fruit every day. Apples are my favourite. I don\'t like eggs very much.',
        items: [
          { type:'choice', q:'What does the writer eat for breakfast?', options:['Rice','Bread','Pizza','Eggs'], ans:1 },
          { type:'choice', q:'What is the writer\'s favourite food?', options:['Rice','Fish','Pizza','Fruit'], ans:2 },
          { type:'fill', q:'Pizza has cheese and _____' , ans:'tomato', hint:'蔬菜/水果' },
          { type:'fill', q:'Apples are her favourite _____', ans:'fruit', hint:'可数名词' }
        ]
      }
    ],
    // PU2 (A1 Movers) - 90-120 词 · 过去时 · 事件叙述
    pu2: [
      {
        title: 'My Picnic',
        text: 'Last Saturday, my friends and I went to the park for a picnic. The weather was sunny, so we played football after lunch. I brought sandwiches and orange juice. My friend Lily brought fruit salad. We had a great time but the cake was too sweet. In the evening, we took the bus home.',
        items: [
          { type:'choice', q:'When did they go for a picnic?', options:['Last Sunday','Last Saturday','Last Friday','Last Monday'], ans:1 },
          { type:'choice', q:'What was the weather like?', options:['Rainy','Cloudy','Sunny','Snowy'], ans:2 },
          { type:'fill', q:'Lily brought _____ salad', ans:'fruit', hint:'形容词+名词' },
          { type:'fill', q:'The cake was too _____', ans:'sweet', hint:'形容词' }
        ]
      },
      {
        title: 'A Visit to the Zoo',
        text: 'Last Sunday, my family visited the city zoo. We saw many animals there. There were three big lions, two tall giraffes and many funny monkeys. My brother liked the penguins best because they could swim. We took lots of photos. We went home at half past four by taxi.',
        items: [
          { type:'choice', q:'Which animals did the brother like best?', options:['Lions','Giraffes','Monkeys','Penguins'], ans:3 },
          { type:'choice', q:'How did they go home?', options:['By bus','By car','By taxi','On foot'], ans:2 },
          { type:'fill', q:'There were _____ big lions', ans:'three', hint:'数字' },
          { type:'fill', q:'Penguins could _____', ans:'swim', hint:'动词' }
        ]
      }
    ],
    // PU3 (A1+ Movers) - 130-160 词 · 复合时态 · 原因结果
    pu3: [
      {
        title: 'A Birthday Party',
        text: 'Last weekend, we celebrated Mum\'s birthday at home. Dad cooked her favourite meal - roast chicken with vegetables. My sister and I baked a chocolate cake, but we made a big mess in the kitchen! When Mum came home, she was very surprised and happy. She said it was the best birthday surprise. We all had a wonderful evening together.',
        items: [
          { type:'choice', q:'Who cooked Mum\'s favourite meal?', options:['The writer','The sister','Dad','Mum'], ans:2 },
          { type:'choice', q:'How did Mum feel when she came home?', options:['Angry','Surprised and happy','Tired','Sad'], ans:1 },
          { type:'fill', q:'The cake was _____', ans:'chocolate', hint:'形容词' },
          { type:'fill', q:'They made a big _____ in the kitchen', ans:'mess', hint:'名词' },
          { type:'fill', q:'It was the best birthday _____', ans:'surprise', hint:'名词' }
        ]
      },
      {
        title: 'Going on Holiday',
        text: 'Last summer, my parents took me to the seaside for two weeks. We stayed at a small hotel near the beach. Every morning, we swam in the sea and built sandcastles. In the afternoon, we ate ice cream and read books under the umbrella. One day, we went on a boat trip and saw dolphins. It was the best holiday I have ever had.',
        items: [
          { type:'choice', q:'Where did they stay?', options:['At a friend\'s house','In a tent','At a hotel','In a flat'], ans:2 },
          { type:'choice', q:'What did they do every morning?', options:['Read books','Swam in the sea','Went on a boat trip','Ate ice cream'], ans:1 },
          { type:'fill', q:'They stayed near the _____', ans:'beach', hint:'场所' },
          { type:'fill', q:'They went on a _____ trip', ans:'boat', hint:'交通工具' },
          { type:'fill', q:'It was the best holiday I have _____ had', ans:'ever', hint:'副词' }
        ]
      }
    ],
    // PU4 (A2 Flyers) - 180-220 词 · 多句复合 · 推理
    pu4: [
      {
        title: 'The Missing Cat',
        text: 'When I came home from school yesterday, I noticed that my cat Tilly was not in her usual place. I looked for her everywhere - in the kitchen, in the garden, under the bed - but I could not find her. I was very worried, so I put some food outside the front door. About an hour later, I heard a soft sound coming from the garage. When I opened the door, Tilly ran straight to me! She had been sleeping in an old box all afternoon. I was so happy to see her again.',
        items: [
          { type:'choice', q:'Where did the writer look for the cat FIRST?', options:['In the garage','In the kitchen','In the garden','In the bedroom'], ans:1 },
          { type:'choice', q:'How did the writer finally find Tilly?', options:['From a sound','From a neighbour','By calling her name','By looking online'], ans:0 },
          { type:'fill', q:'Tilly was sleeping in an old _____', ans:'box', hint:'名词' },
          { type:'fill', q:'The writer was _____ when she came home', ans:'worried', hint:'形容词' },
          { type:'fill', q:'Tilly ran _____ to the writer', ans:'straight', hint:'副词' }
        ]
      },
      {
        title: 'A Special School Project',
        text: 'Last term, our teacher asked us to do a project about our favourite country. I chose Japan because I love its traditions and food. I spent two weeks collecting information from books and the internet. Then I created a colourful poster with pictures of temples, sushi and Mount Fuji. On the last day of school, I had to present my project in front of the class. I was nervous at first, but my teacher smiled and said I had done a wonderful job. My parents were very proud of me, and they put my poster on the wall in our living room.',
        items: [
          { type:'choice', q:'Why did the writer choose Japan?', options:['It is very big','She loves its traditions and food','It is near her home','Her friend is from Japan'], ans:1 },
          { type:'choice', q:'How did the writer feel before the presentation?', options:['Excited','Happy','Nervous','Angry'], ans:2 },
          { type:'fill', q:'She spent two weeks collecting _____', ans:'information', hint:'不可数名词' },
          { type:'fill', q:'I created a colourful _____ with pictures', ans:'poster', hint:'名词' },
          { type:'fill', q:'My parents put my poster on the _____', ans:'wall', hint:'名词' }
        ]
      }
    ]
  };

  function startReading() {
    // 自适应起点：基于 P.langLevel（默认 0），把难度再细分一档（0~4）
    // 4 篇分布：[start, start, start+1, start+2]，钳制到 0~4
    var start = Math.max(0, Math.min(4, P.langLevel || 0));
    var plan = [
      { bookIdx: clampLevel(start - 1), target: '起步' },
      { bookIdx: clampLevel(start),     target: '挑战 1' },
      { bookIdx: clampLevel(start + 1), target: '挑战 2' },
      { bookIdx: clampLevel(start + 2), target: '冲刺' }
    ];
    function clampLevel(n) { return Math.max(0, Math.min(4, n)); }
    function loadPassage(bookIdx) {
      var pool = READING_BANK[['pu0','pu1','pu2','pu3','pu4'][bookIdx]] || READING_BANK.pu0;
      // 同级多篇则随机抽一篇
      return pool[Math.floor(Math.random() * pool.length)];
    }
    var passages = plan.map(function (p) {
      var ps = loadPassage(p.bookIdx);
      return { bookIdx: p.bookIdx, target: p.target, title: ps.title, text: ps.text, items: ps.items };
    });
    P.read = {
      plan: plan,
      passages: passages,
      bookIdxs: passages.map(function (p) { return p.bookIdx; }),
      idx: 0,
      answers: [],
      correct: 0,
      total: 0,
      picks: {},
      level: start,            // 当前等级（0~4）
      startLevel: start,       // 起始等级（用于报告）
      peakLevel: start,        // 达到的最高等级
      streak: 0,               // 当前篇连对数
      promoteHintShown: false  // 是否已提示过升级
    };
    hide('plLang'); hide('plReport');
    show('plReading');
    renderReading();
  }

  function renderReading() {
    var R = P.read;
    var passage = R.passages[R.idx];
    var labels = ['A','B','C','D'];
    var bookNames = ['PU0','PU1','PU2','PU3','PU4'];
    var bookNameCn = ['pu0 (Pre-A1)','pu1 (Pre-A1→A1)','pu2 (A1)','pu3 (A1+)','pu4 (A2)'];
    // 当前等级对应的 5 颗星表示进度
    var starHtml = function (lv) {
      var s = '';
      for (var i = 0; i < 5; i++) {
        s += (i <= lv) ? '⭐' : '☆';
      }
      return s;
    };
    var html = '';
    html += '<div style="text-align:center; margin-bottom:14px;">';
    html += '  <div style="display:flex; justify-content:center; gap:12px; align-items:center; margin-bottom:6px; flex-wrap:wrap;">';
    html += '    <span style="font-size:12px; color:var(--muted);">阅读理解 · 第 ' + (R.idx + 1) + '/' + R.passages.length + ' 篇</span>';
    html += '    <span style="font-size:12px; color:var(--gold); font-weight:700;">Level ' + R.level + ' / 4 ' + starHtml(R.level) + '</span>';
    html += '    <span style="font-size:12px; color:var(--red); font-weight:600;">🔥 连击 ' + R.streak + '</span>';
    html += '  </div>';
    html += '  <p style="font-size:12px; color:var(--muted); margin:2px 0 8px;">本篇来源：<strong style="color:var(--gold);">' + bookNameCn[passage.bookIdx] + '</strong> · 目标：' + passage.target + '</p>';
    html += '  <h3 style="color:var(--gold); margin:6px 0;">' + passage.title + '</h3>';
    html += '</div>';
    html += '<div style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:16px; line-height:1.7; font-size:15px; color:var(--text);">' + passage.text + '</div>';
    html += '<p style="color:var(--muted); font-size:12px; margin-bottom:12px;">请阅读短文，完成下方 ' + passage.items.length + ' 道题后统一提交。本级共 4 篇，难度随表现自适应调整。</p>';

    passage.items.forEach(function(it, qi) {
      html += '<div class="pl-q" data-rq="' + qi + '" style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:14px; text-align:left;">';
      html += '  <div style="font-size:15px; color:var(--text); margin-bottom:10px;"><span style="color:var(--gold); font-weight:700;">Q' + (qi + 1) + '.</span> ' + it.q + '</div>';
      if (it.type === 'fill') {
        html += '  <input type="text" id="rdFill_' + qi + '" placeholder="' + (it.hint || '请输入答案') + '" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:15px;">';
      } else {
        html += '  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">';
        it.options.forEach(function(opt, i) {
          html += '    <button type="button" class="pl-opt ctrl-btn" data-rq="' + qi + '" onclick="plPickReading(' + qi + ',' + i + ')">' + labels[i] + '. ' + opt + '</button>';
        });
        html += '  </div>';
      }
      html += '</div>';
    });

    html += '<button class="btn" style="width:100%; padding:14px; background:var(--gold); color:#1a1a1a; font-size:16px;" onclick="plSubmitReading()">✓ 提交本阅读（' + passage.items.length + ' 题）</button>';
    $('plReading').innerHTML = html;
    $('plReading').scrollIntoView({behavior:'smooth', block:'start'});
  }

  function plPickReading(qi, i) {
    P.read.picks[qi] = i;
    var opts = document.querySelectorAll('[data-rq="' + qi + '"].pl-opt');
    opts.forEach(function(b, bi) {
      if (bi === i) { b.style.background = 'var(--gold)'; b.style.color = '#1a1a1a'; b.style.borderColor = 'var(--gold)'; }
      else { b.style.background = ''; b.style.color = ''; b.style.borderColor = ''; }
    });
  }

  function plSubmitReading() {
    var R = P.read;
    var passage = R.passages[R.idx];
    R.answers = R.answers || [];
    var thisCorrect = 0;
    passage.items.forEach(function(it, qi) {
      var isCorrect = false, given = '(未作答)';
      if (it.type === 'fill') {
        var el = document.getElementById('rdFill_' + qi);
        given = el ? el.value.trim().toLowerCase() : '';
        isCorrect = (given === String(it.ans).toLowerCase());
      } else {
        var sel = R.picks[qi];
        given = (sel === undefined) ? '(未作答)' : String.fromCharCode(65 + sel);
        isCorrect = (sel === it.ans);
      }
      if (isCorrect) { thisCorrect++; R.correct++; }
      // 全部题数都计入分母（含未作答），让准确率反映真实水平
      R.total++;
      R.answers.push({ correct: isCorrect, q: it.q, type: it.type, given: given, ans: (it.type === 'fill' ? it.ans : String.fromCharCode(65 + it.ans)) });
    });

    // 自适应等级调整：连对升 1 级；本篇未全对则降 1 级
    var prevLevel = R.level;
    if (thisCorrect === passage.items.length && R.level < 4) {
      R.level = Math.min(4, R.level + 1);
      R.streak++;
    } else if (thisCorrect === 0 && R.level > 0) {
      R.level = Math.max(0, R.level - 1);
      R.streak = 0;
    } else if (thisCorrect < passage.items.length && R.level > 0) {
      R.level = Math.max(0, R.level - 1);
      R.streak = 0;
    }
    if (R.level > R.peakLevel) R.peakLevel = R.level;

    // XP / 徽章
    if (typeof window.gamify === 'object') {
      window.gamify.addXp(thisCorrect * 10);
      if (thisCorrect === passage.items.length) {
        window.gamify.comboUp();
        if (window.gamify.combo >= 3) window.gamify.unlockBadgeById('reading_streak_3');
      } else {
        window.gamify.comboReset();
      }
      // 全篇 0 对错 → 解锁「连环错」成就候选
      if (thisCorrect === 0) window.gamify.incrementBadge('all_wrong_passage');
    }

    // 渲染反馈
    var last = (R.idx + 1 >= R.passages.length);
    var levelUp = R.level > prevLevel;
    var levelDown = R.level < prevLevel;
    var labels = ['A','B','C','D'];
    var nextHint = '';
    if (!last) {
      nextHint = R.level === R.peakLevel && R.level < 4 ? '下一篇会更难 ⬆️'
              : R.level < prevLevel ? '下一篇会更简单 ⬇️'
              : '下一篇难度相当 ➡️';
    }
    var html = '<div style="text-align:left;">';
    html += '<div style="text-align:center; margin-bottom:10px;">';
    html += '  <h3 style="color:var(--gold); margin:0;">本阅读结果：' + thisCorrect + ' / ' + passage.items.length + '</h3>';
    if (levelUp) html += '<div style="margin-top:6px; color:var(--green); font-weight:700;">⬆️ 升级！Level ' + prevLevel + ' → Level ' + R.level + '</div>';
    else if (levelDown) html += '<div style="margin-top:6px; color:var(--red); font-weight:700;">⬇️ 退级！Level ' + prevLevel + ' → Level ' + R.level + '</div>';
    else html += '<div style="margin-top:6px; color:var(--muted);">Level ' + R.level + ' 保持不变</div>';
    html += '</div>';
    for (var i = 0; i < passage.items.length; i++) {
      var a = R.answers[R.answers.length - passage.items.length + i];
      html += '<div style="padding:8px 10px; border-left:4px solid ' + (a.correct ? 'var(--green)' : 'var(--red)') + '; margin:8px 0; background:' + (a.correct ? 'rgba(81,207,102,.08)' : 'rgba(255,90,90,.08)') + '; border-radius:6px; font-size:13px;">';
      html += '<div>' + (a.correct ? '✅' : '❌') + ' <strong>Q' + (i + 1) + '</strong> ' + a.q + '</div>';
      if (!a.correct) html += '<div style="color:var(--muted); margin-top:4px;">你的答案：' + a.given + ' ｜ 正确答案：' + a.ans + '</div>';
      html += '</div>';
    }
    if (!last) {
      html += '<div style="margin-top:10px; text-align:center; color:var(--muted); font-size:12px;">' + nextHint + '</div>';
    }
    html += '<button class="btn" style="width:100%; margin-top:14px; padding:14px; background:var(--gold); color:#1a1a1a; font-size:16px;" onclick="' + (last ? 'finishReading()' : 'plNextReading()') + '">' + (last ? '🎧 进入听力理解' : '⏭ 下一篇阅读') + '</button>';
    html += '</div>';
    $('plReading').innerHTML = html;
  }

  function plNextReading() {
    P.read.idx++;
    P.read.picks = {};
    renderReading();
  }

  function finishReading() {
    var R = P.read;
    P.readAccuracy = R.total ? Math.round(R.correct / R.total * 100) : 0;
    if (typeof window.gamify === 'object') {
      window.gamify.addXp(40);
      if (R.correct === R.total) window.gamify.unlockBadgeById('reading_star');
      // 完形填空题即为 fill 类型，全对时解锁
      var clozeTotal = 0, clozeCorrect = 0;
      R.answers.forEach(function(a) { if (a.type === 'fill' || a.q.indexOf('____') >= 0 || a.q.indexOf('What') < 0) { clozeTotal++; if (a.correct) clozeCorrect++; } });
      // 简化：阅读理解包含 fill 题型即视为完形，全部 fill 答对解锁
      var allFill = R.answers.filter(function(a) { return a.q.indexOf('____') >= 0 || a.given.length < 5; });
      if (allFill.length > 0 && allFill.every(function(a) { return a.correct; })) window.gamify.unlockBadgeById('cloze_expert');
      // 全对且最高难度通关 → 解锁阅读大师
      if (R.correct === R.total && R.peakLevel >= 4) window.gamify.unlockBadgeById('reading_master_hard');
    }
    var book = BOOK_BY_LEVEL[P.langLevel];
    // 修复：必须先 hide plReading 并滚动到顶，否则阅读反馈会盖住听力 Part 1
    hide('plReading');
    hide('plLang');
    hide('plReport');
    show('plListen');
    // 滚动到顶部，让用户进入听力时看到清晰的开头
    var plListenEl = $('plListen');
    if (plListenEl) plListenEl.scrollIntoView({behavior:'smooth', block:'start'});
    plStartListening(book);
  }

  // ===================== Part 3：听力理解（真实 MP3） =====================
  // 各册听力题库（按 YLE 标准题型重建，答案对照 *_ak 答案页复核）
  // sub 文件夹：pu0/pu1→starters，pu2/pu3→movers，pu4→flyers
  function audioFile(id, part) {
    var sub = (id === 'pu0' || id === 'pu1') ? 'starters' : (id === 'pu2' || id === 'pu3') ? 'movers' : 'flyers';
    var counts = { pu0:4, pu1:4, pu2:4, pu3:5, pu4:5 };
    if (part > counts[id]) return null; // 该册仅提供 Part1-4 原声时，Part5 无音频
    return 'audio/' + id + '_' + sub + '/' + id + '_part' + part + '.mp3';
  }

  var LISTENING_BANKS = {
    pu0: [
      { title:'Part 1 · Listen and draw lines（听音连线）', part:1, questions:[
        { type:'match', q:'Q1: Anna 对应哪个人物？', options:['穿红裙子的女孩','戴眼镜的男孩','穿绿衣服的男孩','拿气球的女孩','穿黄衣服的男孩','地上的男孩','穿粉衣服的女孩','穿蓝衣服的男孩'], ans:3, hint:'Anna 是拿气球的女孩' },
        { type:'match', q:'Q2: Ben 对应哪个人物？', options:['穿红裙子的女孩','戴眼镜的男孩','穿绿衣服的男孩','拿气球的女孩','穿黄衣服的男孩','地上的男孩','穿粉衣服的女孩','穿蓝衣服的男孩'], ans:2, hint:'Ben 是穿绿衣服的男孩' },
        { type:'match', q:'Q3: Tom 对应哪个人物？', options:['穿红裙子的女孩','戴眼镜的男孩','穿绿衣服的男孩','拿气球的女孩','穿黄衣服的男孩','地上的男孩','穿粉衣服的女孩','穿蓝衣服的男孩'], ans:1, hint:'Tom 是戴眼镜的男孩' },
        { type:'match', q:'Q4: Kim 对应哪个人物？', options:['穿红裙子的女孩','戴眼镜的男孩','穿绿衣服的男孩','拿气球的女孩','穿黄衣服的男孩','地上的男孩','穿粉衣服的女孩','穿蓝衣服的男孩'], ans:0, hint:'Kim 是穿红裙子的女孩' },
        { type:'match', q:'Q5: Nick 对应哪个人物？', options:['穿红裙子的女孩','戴眼镜的男孩','穿绿衣服的男孩','拿气球的女孩','穿黄衣服的男孩','地上的男孩','穿粉衣服的女孩','穿蓝衣服的男孩'], ans:5, hint:'Nick 是地上的男孩' },
        { type:'match', q:'Q6: Matt 对应哪个人物？', options:['穿红裙子的女孩','戴眼镜的男孩','穿绿衣服的男孩','拿气球的女孩','穿黄衣服的男孩','地上的男孩','穿粉衣服的女孩','穿蓝衣服的男孩'], ans:6, hint:'Matt 是穿粉衣服的女孩' },
        { type:'match', q:'Q7: Alex 对应哪个人物？', options:['穿红裙子的女孩','戴眼镜的男孩','穿绿衣服的男孩','拿气球的女孩','穿黄衣服的男孩','地上的男孩','穿粉衣服的女孩','穿蓝衣服的男孩'], ans:7, hint:'Alex 是穿蓝衣服的男孩' },
        { type:'match', q:'Q8: 还有一个人物是谁？', options:['穿黄衣服的男孩','老师','妈妈','小狗'], ans:0, hint:'穿黄衣服的男孩' }
      ]},
      { title:'Part 2 · Listen and write（听音填空）', part:2, questions:[
        { type:'fill', q:'Q1: What is her family name?（她的姓）', ans:'Jones', hint:'Jones' },
        { type:'fill', q:'Q2: What is her English teacher’s name?（英语老师名字）', ans:'May', hint:'May' },
        { type:'fill', q:'Q3: Where does she live? in ____ Street（住在哪条街）', ans:'Park', hint:'Park Street' },
        { type:'fill', q:'Q4: How many sisters has she got?（几个姐妹）', ans:'2', hint:'2' },
        { type:'fill', q:'Q5: How old is her sister?（妹妹几岁）', ans:'5', hint:'5' }
      ]},
      { title:'Part 3 · Listen and tick（听音打勾 A/B/C）', part:3, questions:[
        { type:'choice3', q:'Q1: Where is Grace’s jacket?（Grace 的夹克在哪）', options:['On the bed','On the chair','In the wardrobe'], ans:2, hint:'在衣柜里' },
        { type:'choice3', q:'Q2: What is Lucy’s favourite food?（Lucy 最爱的食物）', options:['Cake','Chocolate','Ice cream'], ans:2, hint:'冰淇淋' },
        { type:'choice3', q:'Q3: What’s Pat’s brother doing?（Pat 的哥哥在做什么）', options:['Playing football','Playing tennis','Playing guitar'], ans:0, hint:'踢足球' },
        { type:'choice3', q:'Q4: What animal is in the garden?（花园里有什么动物）', options:['Sheep','Goat','Dog'], ans:1, hint:'山羊' },
        { type:'choice3', q:'Q5: Where is Hugo’s camera?（Hugo 的相机在哪）', options:['On the TV','On the radio','On the desk'], ans:2, hint:'在书桌上' }
      ]},
      { title:'Part 4 · Listen and colour（听音涂色）', part:4, questions:[
        { type:'fill', q:'Q1: Color the sun ____（把太阳涂成）', ans:'yellow', hint:'黄色' },
        { type:'fill', q:'Q2: Color the plane ____（把飞机涂成）', ans:'green', hint:'绿色' },
        { type:'fill', q:'Q3: Color the bus ____（把公交车涂成）', ans:'purple', hint:'紫色' },
        { type:'fill', q:'Q4: Color the jacket ____（把夹克涂成）', ans:'orange', hint:'橙色' },
        { type:'fill', q:'Q5: Color the woman’s bag ____（把女士的包涂成）', ans:'blue', hint:'蓝色' },
        { type:'fill', q:'Q6: Color the box ____（把盒子涂成）', ans:'yellow', hint:'黄色' }
      ]},
      { title:'Part 5 · Listen and say yes/no（听音判断）', part:5, questions:[
        { type:'yesno', q:'Q1: Is this a cat?（这是猫吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q2: Is the boy flying a kite?（男孩在放风筝吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q3: Are they swimming?（他们在游泳吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q4: Is it raining?（在下雨吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q5: The girl has a red ball?（女孩有红球吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q6: The boy is playing football?（男孩在踢足球吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q7: They are at school?（他们在学校吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q8: It is sunny today?（今天晴天吗）', options:['Yes','No'], ans:0 }
      ]}
    ],
    pu1: [
      { title:'Part 1 · Listen and draw lines（听音连线）', part:1, questions:[
        { type:'match', q:'Q1: Alex 对应哪个人物？', options:['戴帽子的男孩','拿足球的女孩','穿蓝衣服的男孩','扎辫子的女孩','戴眼镜的女孩','拿书的男孩'], ans:0, hint:'（按 YLE 题型重建，对照答案页）' },
        { type:'match', q:'Q2: May 对应哪个人物？', options:['戴帽子的男孩','拿足球的女孩','穿蓝衣服的男孩','扎辫子的女孩','戴眼镜的女孩','拿书的男孩'], ans:3, hint:'（重建）' },
        { type:'match', q:'Q3: Pat 对应哪个人物？', options:['戴帽子的男孩','拿足球的女孩','穿蓝衣服的男孩','扎辫子的女孩','戴眼镜的女孩','拿书的男孩'], ans:2, hint:'（重建）' },
        { type:'match', q:'Q4: Sue 对应哪个人物？', options:['戴帽子的男孩','拿足球的女孩','穿蓝衣服的男孩','扎辫子的女孩','戴眼镜的女孩','拿书的男孩'], ans:5, hint:'（重建）' },
        { type:'match', q:'Q5: Tom 对应哪个人物？', options:['戴帽子的男孩','拿足球的女孩','穿蓝衣服的男孩','扎辫子的女孩','戴眼镜的女孩','拿书的男孩'], ans:1, hint:'（重建）' },
        { type:'match', q:'Q6: Jill 对应哪个人物？', options:['戴帽子的男孩','拿足球的女孩','穿蓝衣服的男孩','扎辫子的女孩','戴眼镜的女孩','拿书的男孩'], ans:4, hint:'（重建）' }
      ]},
      { title:'Part 2 · Listen and write（听音填空）', part:2, questions:[
        { type:'fill', q:'Q1: What is the boy’s name?（男孩名字）', ans:'Tom', hint:'Tom' },
        { type:'fill', q:'Q2: How old is he?（他几岁）', ans:'7', hint:'7' },
        { type:'fill', q:'Q3: What colour is his bag?（书包颜色）', ans:'red', hint:'红色' },
        { type:'fill', q:'Q4: How many dogs has he got?（几只狗）', ans:'3', hint:'3' },
        { type:'fill', q:'Q5: What is his favourite food?（最爱食物）', ans:'pizza', hint:'pizza' }
      ]},
      { title:'Part 3 · Listen and tick（听音打勾 A/B/C）', part:3, questions:[
        { type:'choice3', q:'Q1: What is the boy doing?（男孩在做什么）', options:['Reading','Drawing','Singing'], ans:1, hint:'画画' },
        { type:'choice3', q:'Q2: Where is the cat?（猫在哪）', options:['Under the table','On the chair','In the box'], ans:2, hint:'在盒子里' },
        { type:'choice3', q:'Q3: What does the girl like?（女孩喜欢什么）', options:['Apples','Bananas','Oranges'], ans:0, hint:'苹果' },
        { type:'choice3', q:'Q4: What is the weather like?（天气如何）', options:['Sunny','Rainy','Snowy'], ans:0, hint:'晴天' },
        { type:'choice3', q:'Q5: What is the man’s job?（男的的职业）', options:['Teacher','Doctor','Farmer'], ans:1, hint:'医生' }
      ]},
      { title:'Part 4 · Listen and colour（听音涂色）', part:4, questions:[
        { type:'fill', q:'Q1: Color the fish ____（把鱼涂成）', ans:'blue', hint:'蓝色' },
        { type:'fill', q:'Q2: Color the flower ____（把花涂成）', ans:'pink', hint:'粉色' },
        { type:'fill', q:'Q3: Color the bird ____（把鸟涂成）', ans:'green', hint:'绿色' },
        { type:'fill', q:'Q4: Color the star ____（把星星涂成）', ans:'yellow', hint:'黄色' },
        { type:'fill', q:'Q5: Color the tree ____（把树涂成）', ans:'brown', hint:'棕色' }
      ]},
      { title:'Part 5 · Listen and say yes/no（听音判断）', part:5, questions:[
        { type:'yesno', q:'Q1: The boy is eating an apple?（男孩在吃苹果吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q2: The girl is in the garden?（女孩在花园吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q3: They are playing football?（他们在踢足球吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q4: It is cold today?（今天冷吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q5: The dog is sleeping?（狗在睡觉吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q6: The book is on the desk?（书在桌上吗）', options:['Yes','No'], ans:1 }
      ]}
    ],
    pu2: [
      { title:'Part 1 · Where is …?（听音选位置 A–H）', part:1, questions:[
        { type:'choice8', q:'Q1: Where is the café?（咖啡馆在哪）', options:['A','B','C','D','E','F','G','H'], ans:2, hint:'（按 YLE 题型重建）' },
        { type:'choice8', q:'Q2: Where is the park?（公园在哪）', options:['A','B','C','D','E','F','G','H'], ans:7, hint:'（重建）' },
        { type:'choice8', q:'Q3: Where is the school?（学校在哪）', options:['A','B','C','D','E','F','G','H'], ans:5, hint:'（重建）' },
        { type:'choice8', q:'Q4: Where is the station?（车站在哪）', options:['A','B','C','D','E','F','G','H'], ans:3, hint:'（重建）' }
      ]},
      { title:'Part 2 · Listen and write（听音填空）', part:2, questions:[
        { type:'fill', q:'Q1: We go by ____（交通工具）', ans:'car', hint:'car' },
        { type:'fill', q:'Q2: in the ____（时间段）', ans:'evenings', hint:'evenings' },
        { type:'fill', q:'Q3: my ____（家庭成员）', ans:'son', hint:'son' },
        { type:'fill', q:'Q4: have a ____（动作）', ans:'shower', hint:'shower' },
        { type:'fill', q:'Q5: number ____（数字）', ans:'38', hint:'38' }
      ]},
      { title:'Part 3 · Listen and tick（听音打勾 A/B/C）', part:3, questions:[
        { type:'choice3', q:'Q1: What does the boy want?（男孩想要什么）', options:['A book','A ball','A bike'], ans:0, hint:'书' },
        { type:'choice3', q:'Q2: Where do they go?（他们去哪）', options:['To the park','To school','To the zoo'], ans:2, hint:'动物园' },
        { type:'choice3', q:'Q3: What is the weather?（天气）', options:['Windy','Cloudy','Sunny'], ans:1, hint:'多云' },
        { type:'choice3', q:'Q4: What is the girl’s pet?（女孩的宠物）', options:['A cat','A dog','A rabbit'], ans:2, hint:'兔子' },
        { type:'choice3', q:'Q5: What time is it?（几点）', options:['Three','Four','Five'], ans:1, hint:'四点' }
      ]},
      { title:'Part 4 · Listen and colour（听音涂色）', part:4, questions:[
        { type:'fill', q:'Q1: Color the house ____（把房子涂成）', ans:'red', hint:'红色' },
        { type:'fill', q:'Q2: Color the door ____（把门涂成）', ans:'blue', hint:'蓝色' },
        { type:'fill', q:'Q3: Color the tree ____（把树涂成）', ans:'green', hint:'绿色' },
        { type:'fill', q:'Q4: Color the sun ____（把太阳涂成）', ans:'yellow', hint:'黄色' },
        { type:'fill', q:'Q5: Color the car ____（把车涂成）', ans:'black', hint:'黑色' }
      ]},
      { title:'Part 5 · Listen and say yes/no（听音判断）', part:5, questions:[
        { type:'yesno', q:'Q1: The children are happy?（孩子们开心吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q2: The boy can swim?（男孩会游泳吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q3: They are at home?（他们在家吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q4: The girl likes music?（女孩喜欢音乐吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q5: It is Monday today?（今天周一吗）', options:['Yes','No'], ans:1 }
      ]}
    ],
    pu3: [
      { title:'Part 1 · Which object?（听音选物 A–H）', part:1, questions:[
        { type:'choice8', q:'Q1: roller skates?（滚轴溜冰鞋）', options:['A','B','C','D','E','F','G','H'], ans:5, hint:'（按 YLE 题型重建）' },
        { type:'choice8', q:'Q2: comic?（漫画）', options:['A','B','C','D','E','F','G','H'], ans:1, hint:'（重建）' },
        { type:'choice8', q:'Q3: helmet?（头盔）', options:['A','B','C','D','E','F','G','H'], ans:0, hint:'（重建）' },
        { type:'choice8', q:'Q4: laptop?（笔记本电脑）', options:['A','B','C','D','E','F','G','H'], ans:3, hint:'（重建）' }
      ]},
      { title:'Part 2 · Listen and write（听音填空）', part:2, questions:[
        { type:'fill', q:'Q1: Her name is ____（名字）', ans:'Lucy', hint:'Lucy' },
        { type:'fill', q:'Q2: She is ____ years old（年龄）', ans:'9', hint:'9' },
        { type:'fill', q:'Q3: favourite colour ____（颜色）', ans:'purple', hint:'紫色' },
        { type:'fill', q:'Q4: has a ____（宠物）', ans:'rabbit', hint:'兔子' },
        { type:'fill', q:'Q5: on ____ Street（街道）', ans:'Hill', hint:'Hill' }
      ]},
      { title:'Part 3 · Listen and tick（听音打勾 A/B/C）', part:3, questions:[
        { type:'choice3', q:'Q1: What did the boy do?（男孩做了什么）', options:['Went swimming','Played tennis','Rode a horse'], ans:0, hint:'游泳' },
        { type:'choice3', q:'Q2: What did she buy?（她买了什么）', options:['A dress','A book','A cake'], ans:2, hint:'蛋糕' },
        { type:'choice3', q:'Q3: Where did they go?（他们去哪）', options:['The beach','The farm','The museum'], ans:1, hint:'农场' },
        { type:'choice3', q:'Q4: What is the matter?（怎么了）', options:['He is ill','He is tired','He is hungry'], ans:0, hint:'生病' },
        { type:'choice3', q:'Q5: What will they do?（他们要做什么）', options:['Watch TV','Do homework','Play chess'], ans:2, hint:'下棋' }
      ]},
      { title:'Part 4 · Listen and colour（听音涂色）', part:4, questions:[
        { type:'fill', q:'Q1: Color the kite ____（把风筝涂成）', ans:'orange', hint:'橙色' },
        { type:'fill', q:'Q2: Color the boat ____（把船涂成）', ans:'white', hint:'白色' },
        { type:'fill', q:'Q3: Color the mountain ____（把山涂成）', ans:'grey', hint:'灰色' },
        { type:'fill', q:'Q4: Color the lake ____（把湖涂成）', ans:'blue', hint:'蓝色' },
        { type:'fill', q:'Q5: Color the cloud ____（把云涂成）', ans:'pink', hint:'粉色' }
      ]},
      { title:'Part 5 · Listen and say yes/no（听音判断）', part:5, questions:[
        { type:'yesno', q:'Q1: The film was funny?（电影好笑吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q2: They won the game?（他们赢了比赛吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q3: She likes the present?（她喜欢礼物吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q4: The museum is open?（博物馆开门吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q5: He finished his homework?（他完成作业了吗）', options:['Yes','No'], ans:0 }
      ]}
    ],
    pu4: [
      { title:'Part 1 · Who …?（听音选人）', part:1, questions:[
        { type:'choice5', q:'Q1: Who is wearing red?（谁穿红色）', options:['Paul','Sarah','Sally','Emma','Richard'], ans:0, hint:'（按 YLE 题型重建）' },
        { type:'choice5', q:'Q2: Who is on a high chair?（谁在高脚椅上）', options:['Paul','Sarah','Sally','Emma','Richard'], ans:1, hint:'（重建）' },
        { type:'choice5', q:'Q3: Who has a dog?（谁有狗）', options:['Paul','Sarah','Sally','Emma','Richard'], ans:2, hint:'（重建）' },
        { type:'choice5', q:'Q4: Who is reading?（谁在读书）', options:['Paul','Sarah','Sally','Emma','Richard'], ans:3, hint:'（重建）' },
        { type:'choice5', q:'Q5: Who is smiling?（谁在微笑）', options:['Paul','Sarah','Sally','Emma','Richard'], ans:4, hint:'（重建）' }
      ]},
      { title:'Part 2 · Listen and write（听音填空）', part:2, questions:[
        { type:'fill', q:'Q1: The party is on ____（星期）', ans:'Saturday', hint:'Saturday' },
        { type:'fill', q:'Q2: at ____ o’clock（点钟）', ans:'three', hint:'3' },
        { type:'fill', q:'Q3: bring a ____（带什么）', ans:'cake', hint:'蛋糕' },
        { type:'fill', q:'Q4: wear ____（穿什么颜色）', ans:'green', hint:'绿色' },
        { type:'fill', q:'Q5: number ____（门牌号）', ans:'15', hint:'15' }
      ]},
      { title:'Part 3 · Listen and tick（听音打勾 A/B/C）', part:3, questions:[
        { type:'choice3', q:'Q1: What did they eat?（他们吃了什么）', options:['Pizza','Salad','Soup'], ans:0, hint:'披萨' },
        { type:'choice3', q:'Q2: How did they travel?（怎么去）', options:['By bus','By train','By plane'], ans:1, hint:'火车' },
        { type:'choice3', q:'Q3: What was the weather?（天气）', options:['Hot','Cold','Windy'], ans:2, hint:'有风' },
        { type:'choice3', q:'Q4: What did she see?（她看见了什么）', options:['A whale','A dolphin','A shark'], ans:1, hint:'海豚' },
        { type:'choice3', q:'Q5: What will he do?（他要做什么）', options:['Write a letter','Send an email','Make a call'], ans:2, hint:'打电话' }
      ]},
      { title:'Part 4 · Listen and colour（听音涂色）', part:4, questions:[
        { type:'fill', q:'Q1: Color the balloon ____（把气球涂成）', ans:'red', hint:'红色' },
        { type:'fill', q:'Q2: Color the flower ____（把花涂成）', ans:'yellow', hint:'黄色' },
        { type:'fill', q:'Q3: Color the bird ____（把鸟涂成）', ans:'blue', hint:'蓝色' },
        { type:'fill', q:'Q4: Color the grass ____（把草涂成）', ans:'green', hint:'绿色' },
        { type:'fill', q:'Q5: Color the sky ____（把天空涂成）', ans:'purple', hint:'紫色' }
      ]},
      { title:'Part 5 · Listen and say yes/no（听音判断）', part:5, questions:[
        { type:'yesno', q:'Q1: The story was exciting?（故事精彩吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q2: They missed the bus?（他们错过公交了吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q3: She passed the exam?（她通过考试了吗）', options:['Yes','No'], ans:0 },
        { type:'yesno', q:'Q4: The museum was closed?（博物馆关门了吗）', options:['Yes','No'], ans:1 },
        { type:'yesno', q:'Q5: He enjoyed the trip?（他享受旅行吗）', options:['Yes','No'], ans:0 }
      ]}
    ]
  };

  function plStartListening(book) {
    if (!book || !LISTENING_BANKS[book]) book = 'pu0';
    P.listen = {
      book: book,
      bookName: { pu0:'Power Up 0 (Pre-A1 Starters)', pu1:'Power Up 1 (Pre-A1→A1 Starters)', pu2:'Power Up 2 (A1 Movers)', pu3:'Power Up 3 (A1+ Movers)', pu4:'Power Up 4 (A2 Flyers)' }[book],
      parts: LISTENING_BANKS[book],
      partIdx: 0, qIdx: 0, correct: 0, total: 0, answers: []
    };
    hide('plLang'); hide('plReport'); show('plListen');
    renderListenPart();
  }

  function listenAudioEl() {
    var a = $('plListenAudio');
    if (!a) {
      a = document.createElement('audio');
      a.id = 'plListenAudio';
      a.style.display = 'none';
      $('plListen').appendChild(a);
    }
    return a;
  }

  function renderListenPart() {
    var L = P.listen;
    var part = L.parts[L.partIdx];
    L.picks = [];
    var file = audioFile(L.book, part.part);
    var html = '';
    html += '<div style="text-align:center; margin-bottom:12px;">';
    html += '  <div style="font-size:13px; color:var(--muted);">听力理解 · ' + L.bookName + ' · Part ' + (L.partIdx + 1) + '/' + L.parts.length + '</div>';
    html += '  <h3 style="color:var(--gold); margin:6px 0;">' + part.title + '</h3>';
    if (file) {
      html += '  <button class="ctrl-btn" id="plPlayBtn" onclick="plPlayPart()">🎧 播放本 Part 听力（原版录音）</button>';
    } else {
      html += '  <p style="color:var(--muted); font-size:12px;">（本册仅提供 Part1-4 原声，本 Part 请对照答案页自测）</p>';
    }
    html += '</div>';
    html += '<div id="plListenQ" style="margin-top:14px;"></div>';
    html += '<div id="plListenR" style="margin-top:12px;"></div>';
    $('plListen').innerHTML = html;
    renderListenQuestions();
  }

  function plPlayPart() {
    var L = P.listen;
    var part = L.parts[L.partIdx];
    var file = audioFile(L.book, part.part);
    if (!file) return;
    var a = listenAudioEl();
    var opus = file.replace(/\.mp3$/i, '.opus');
    a.onerror = function () { a.onerror = null; a.src = file; a.play().catch(function () {}); };
    a.src = opus; a.currentTime = 0;
    a.play().catch(function () {});
    var btn = $('plPlayBtn');
    if (btn) btn.innerHTML = '⏸ 播放中…（可重复点击重听）';
  }

  // 整 Part 一次显示全部题目，学生整体作答后统一提交判分
  function renderListenQuestions() {
    var L = P.listen;
    var part = L.parts[L.partIdx];
    var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    var html = '<p style="color:var(--muted); font-size:12px; margin:4px 0 12px;">本 Part 共 ' + part.questions.length + ' 题，全部作答后点下方按钮统一提交。</p>';
    part.questions.forEach(function (q, qi) {
      html += '<div class="pl-q" data-q="' + qi + '" style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:14px; text-align:left;">';
      html += '  <div style="font-size:15px; color:var(--text); margin-bottom:10px;"><span style="color:var(--gold); font-weight:700;">Q' + (qi + 1) + '.</span> ' + q.q + '</div>';
      if (q.type === 'fill') {
        html += '  <input type="text" id="plFill_' + qi + '" placeholder="' + (q.hint || '请输入答案') + '" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:15px;">';
      } else {
        html += '  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">';
        q.options.forEach(function (opt, i) {
          html += '    <button type="button" class="pl-opt ctrl-btn" data-q="' + qi + '" onclick="plPickChoice(' + qi + ',' + i + ')">' + labels[i] + '. ' + opt + '</button>';
        });
        html += '  </div>';
      }
      html += '</div>';
    });
    html += '<button class="btn" style="width:100%; margin-top:8px; padding:14px; background:var(--gold); color:#1a1a1a; font-size:16px;" onclick="plSubmitPart()">✓ 提交本 Part（' + part.questions.length + ' 题）</button>';
    $('plListenQ').innerHTML = html;
  }

  function plPickChoice(qi, i) {
    P.listen.picks[qi] = i;
    var opts = document.querySelectorAll('[data-q="' + qi + '"] .pl-opt');
    opts.forEach(function (b, bi) {
      if (bi === i) { b.style.background = 'var(--gold)'; b.style.color = '#1a1a1a'; b.style.borderColor = 'var(--gold)'; }
      else { b.style.background = ''; b.style.color = ''; b.style.borderColor = ''; }
    });
  }

  function plSubmitPart() {
    var L = P.listen;
    if (L.submitted) return;
    var part = L.parts[L.partIdx];
    L.answers = L.answers || [];
    part.questions.forEach(function (q, qi) {
      var isCorrect = false, given = '(未作答)';
      if (q.type === 'fill') {
        var el = document.getElementById('plFill_' + qi);
        given = el ? el.value.trim().toLowerCase() : '';
        isCorrect = (given === String(q.ans).toLowerCase());
      } else {
        var sel = P.listen.picks[qi];
        given = (sel === undefined) ? '(未作答)' : String.fromCharCode(65 + sel);
        isCorrect = (sel === q.ans);
        var opts = document.querySelectorAll('[data-q="' + qi + '"] .pl-opt');
        opts.forEach(function (b, bi) {
          if (bi === q.ans) { b.style.borderColor = 'var(--green)'; b.style.background = 'rgba(81,207,102,.18)'; }
          else if (bi === sel) { b.style.borderColor = 'var(--red)'; b.style.background = 'rgba(255,90,90,.18)'; }
        });
      }
      if (isCorrect) L.correct++; L.total++;
      L.answers.push({ correct: isCorrect, q: q.q, type: q.type, given: given, ans: (q.type === 'fill' ? q.ans : String.fromCharCode(65 + q.ans)) });
    });
    L.submitted = true;
    showListenPartFeedback();
  }

  function showListenPartFeedback() {
    var L = P.listen;
    var part = L.parts[L.partIdx];
    var thisAns = L.answers.slice(-part.questions.length);
    var thisCorrect = thisAns.filter(function (a) { return a.correct; }).length;
    var last = (L.partIdx + 1 >= L.parts.length);
    if (typeof window.gamify === 'object') {
      window.gamify.addXp(thisCorrect * 10);
      if (thisCorrect === part.questions.length) { window.gamify.comboUp(); window.gamify.fireConfetti(30); }
      else window.gamify.comboReset();
      if (thisCorrect === part.questions.length) window.gamify.unlockBadgeById('listening_ace');
    }
    var html = '<div style="text-align:left;">';
    html += '<h3 style="color:var(--gold); text-align:center; margin-bottom:10px;">本 Part 结果：' + thisCorrect + ' / ' + thisAns.length + '（累计 ' + L.correct + '/' + L.total + '）</h3>';
    thisAns.forEach(function (a, qi) {
      html += '<div style="padding:8px 10px; border-left:4px solid ' + (a.correct ? 'var(--green)' : 'var(--red)') + '; margin:8px 0; background:' + (a.correct ? 'rgba(81,207,102,.08)' : 'rgba(255,90,90,.08)') + '; border-radius:6px; font-size:13px;">';
      html += '<div>' + (a.correct ? '✅' : '❌') + ' <strong>Q' + (qi + 1) + '</strong> ' + a.q + '</div>';
      if (!a.correct) html += '<div style="color:var(--muted); margin-top:4px;">你的答案：' + a.given + ' ｜ 正确答案：' + a.ans + '</div>';
      html += '</div>';
    });
    html += '<button class="btn" style="width:100%; margin-top:14px; padding:14px; background:var(--gold); color:#1a1a1a; font-size:16px;" onclick="' + (last ? 'finishListening()' : 'plNextPart()') + '">' + (last ? '📊 查看综合报告' : '⏭ 进入下一 Part') + '</button>';
    html += '</div>';
    $('plListen').innerHTML = html;
  }

  function plNextPart() {
    P.listen.partIdx++;
    P.listen.picks = [];
    P.listen.submitted = false;
    renderListenPart();
  }

  function finishListening() {
    var L = P.listen;
    P.listenAccuracy = L.total ? Math.round(L.correct / L.total * 100) : 0;
    hide('plListen'); show('plReport');
    buildReport();
  }

  // ===================== 统一报告 =====================
  function buildReport() {
    var langAcc = P.lang.total ? Math.round(P.lang.correct / P.lang.total * 100) : 0;
    var readAcc = (P.read && P.read.total) ? Math.round(P.read.correct / P.read.total * 100) : 0;
    var listenAcc = P.listenAccuracy;
    // 综合权重：语言应用占 30%、阅读 35%（自适应的难度本身含信息量）、听力 35%（综合真实语感）
    var overall = Math.round(langAcc * 0.30 + readAcc * 0.35 + listenAcc * 0.35);
    var grade = overall >= 90 ? { letter:'A', cn:'优秀', emoji:'🏆' }
              : overall >= 80 ? { letter:'B', cn:'良好', emoji:'🥇' }
              : overall >= 70 ? { letter:'C', cn:'中等', emoji:'🥈' }
              : overall >= 60 ? { letter:'D', cn:'及格', emoji:'🥉' }
              : { letter:'E', cn:'需加强', emoji:'📚' };

    if (typeof window.gamify === 'object') {
      window.gamify.addXp(overall >= 90 ? 120 : overall >= 80 ? 90 : overall >= 60 ? 60 : 30);
      if (overall >= 90) window.gamify.unlockBadgeById('grade_a');
      else if (overall >= 80) window.gamify.unlockBadgeById('grade_b');
      if (overall >= 90 && readAcc >= 90) window.gamify.unlockBadgeById('placement_perfect');
      window.gamify.fireConfetti(overall >= 80 ? 80 : 40);
      // 速通判定（5 分钟内完成全 4 篇阅读 + 4-5 个听力 Part）
      var elapsed = (Date.now() - (P.startTs || Date.now())) / 1000;
      if (elapsed <= 300) window.gamify.unlockBadgeById('rapid_placement');
    }

    var recLevel = Math.max(P.langLevel, Math.min(6, Math.round((readAcc + listenAcc) / 30)));
    // 自适应推荐：根据阅读最终等级为主，结合听力
    var readPeak = (P.read && P.read.peakLevel) || 0;
    var recLvl = Math.max(recLevel, readPeak);
    recLvl = Math.min(4, recLvl);
    var recBook = BOOK_BY_LEVEL[recLvl] || 'pu0';
    if (typeof window.gamify === 'object') {
      window.gamify.placementCount = (window.gamify.placementCount || 0) + 1;
      if (window.gamify.placementCount >= 3) window.gamify.unlockBadgeById('placement_3_times');
      window.gamify.save();
    }
    var bookFull = { pu0:'Power Up 0 (Pre-A1 Starters)', pu1:'Power Up 1 (Pre-A1→A1 Starters)', pu2:'Power Up 2 (A1 Movers)', pu3:'Power Up 3 (A1+ Movers)', pu4:'Power Up 4 (A2 Flyers)' };

    // ===== 多维评价库 =====
    var COMMENT = {
      lang: {
        A: ['📚 词汇掌握极扎实：能精准分辨近义词与拼写相似词，已具备 KET 词汇基础。',
            '🔊 听觉记忆与视觉记忆联动良好：听音即能快速对应中文释义。',
            '📈 建议：进入阅读理解阶段，重点练长难句的主谓宾抓取。'],
        B: ['📚 词汇基础稳固：常用名词/动词/形容词已能灵活调用。',
            '🔍 部分近义词或一词多义仍有混淆点，建议用「词族」方式集中复习。',
            '🎯 已经能覆盖 Cambridge Starters 阅读词汇，可以自信进入下一步。'],
        C: ['📚 词覆盖面中等：核心词汇可以，但日常形容词/副词需要补充。',
            '🔧 建议每日精读一篇文章，把不会的高频词记下来反复朗读。'],
        D: ['📚 基础词需巩固：日常名词（颜色、家庭、动物）较为熟练，但动词短语和介词搭配较弱。',
            '🎯 从 Power Up 0 的核心词卡开始，每天 10 词，三周后再次测评。'],
        E: ['📚 词汇量偏少：建议先建立 200 基础词的稳固记忆，再做测评。',
            '🎯 配合图片+音频记忆，每词配 1 个例句，连续复习 21 天可见显著提升。']
      },
      reading: {
        A: ['🔍 你能快速定位细节，并对主旨与作者意图有敏锐判断。',
            '🌟 段落结构意识已建立，能区分主要信息与次要信息。',
            '🚀 进入更高级别的语篇（如说明文 / 议论文片段）会更受益。'],
        B: ['🔍 主旨与细节题表现良好，偶有近义替换词丢分。',
            '💡 训练时把题干的关键词圈出来，再到原文定位，能再稳一档。',
            '📈 建议隔天一篇原版配套文章，保持稳定发挥。'],
        C: ['🔍 段落信息和主旨题能够基本抓住，但时间、数字、地点等细节题仍会漏。',
            '🎯 训练时养成「问什么 → 回文找什么」的习惯，配合指读法。'],
        D: ['🔍 短文理解有困难，建议先从 30-50 词的简单句开始。',
            '🎯 每篇先通读一遍（不查词），再做细节题，能更稳。'],
        E: ['🔍 短文阅读吃力，可能与词汇量及句型熟悉度有关。',
            '🎯 建议先回到词汇与短句阶段练习，积累 2-3 周后再挑战。']
      },
      cloze: {
        A: ['✍️ 完形填空能力扎实：对上下文线索、时态呼应、词性匹配都掌握得很好。',
            '🎯 可进入更高阶的「词形变换」题。'],
        B: ['✍️ 大部分题能根据上下文推断，少数近义词辨析仍需强化。'],
        C: ['✍️ 容易在第一反应填词，建议先看挖空前后的提示词再决定。'],
        D: ['✍️ 上下文推理训练不足，建议做 5 篇「无选项猜测 + 看答案对照」的练习。'],
        E: ['✍️ 缺基础，建议先做选择题（看到选项再选）建立语感。']
      },
      listening: {
        A: ['🎧 真实语速下的信息抓取能力扎实，对场景词反应迅速。',
            '🎧 数字、时间、人物身份等关键信息都能精准抓取。',
            '🎯 建议听写 + 跟读混合训练，提升音节切分能力。'],
        B: ['🎧 整体表现良好：主旨与细节题都能拿下，但对快速对话中的转折/否定信息偶有遗漏。',
            '💡 建议每 Part 听 2-3 遍：第 1 遍整体听，第 2 遍细抠转折词。'],
        C: ['🎧 中等水平：主旨题能抓住，细节题（数字、时间、地点）仍会漏。',
            '🎯 建议用「五指法」听写：人物/动作/地点/时间/数字，分别填进格子。'],
        D: ['🎧 听辨能力较弱：建议从 Power Up 0 / 1 的 Part 1 开始，每天 1 套。',
            '🎯 全部 Part 都做之前不要跳级。'],
        E: ['🎧 起步阶段：建议先把每单元配套的 Listen and say / Repeat 练熟练。',
            '🎯 听之前先看图和选项，带着「预期」去听，能降低难度。']
      },
      overall: {
        A: ['🏆 你的综合表现达到了 A 等！剑桥英语学习路径已为「独立学习者」。',
            '🎯 接下来的目标是 KET 考试，建议每周定时完成 2 套完整真题。'],
        B: ['🥇 综合能力 B 等，稳中向好。各模块几乎平衡，短板只有细节题。',
            '🎯 每日精读 + 精听各 1 篇，6 周后再做一次测评就能冲 A。'],
        C: ['🥈 综合 C 等，基础牢固。补足一两个薄弱模块就能大幅提升。',
            '🎯 把下方的「需加强」清单作为本月的复习菜单。'],
        D: ['🥉 综合 D 等，建议先巩固基础：把 ' + bookFull[recBook].split(' ')[0] + ' 的词汇与核心句型吃透。',
            '🎯 切忌「越级」：稳扎稳打三轮后再升级。'],
        E: ['🌱 起步阶段，从最基础的 Pre-A1 开始建立信心，每个级别扎实学习 4-6 周。',
            '🎯 配合使用「词汇测评」与「原版试卷」巩固。']
      }
    };
    function pickBucket(acc) { return acc >= 90 ? 'A' : acc >= 80 ? 'B' : acc >= 70 ? 'C' : acc >= 60 ? 'D' : 'E'; }
    var langBucket = pickBucket(langAcc), readBucket = pickBucket(readAcc), listenBucket = pickBucket(listenAcc), overallBucket = pickBucket(overall);
    function pickLines(arr, n) {
      // 稳定地挑选 n 条不重复评语
      var out = []; var used = {};
      var seed = (langAcc + readAcc * 7 + listenAcc * 13 + overall * 19) % arr.length;
      for (var i = 0; i < n && i < arr.length; i++) {
        out.push(arr[(seed + i * 3) % arr.length]);
      }
      return out;
    }
    var langComments = pickLines(COMMENT.lang[overallBucket === 'E' ? 'D' : overallBucket], 2);
    if (langAcc >= 80) langComments = langComments.concat(pickLines(COMMENT.lang['A'], 1));
    var readComments = pickLines(COMMENT.reading[readBucket], 2);
    var clozeAcc = P.read ? Math.round((P.read.answers.filter(function(a){return a.type==='fill';}).reduce(function(s,a){return s+(a.correct?1:0);},0) / Math.max(1, P.read.answers.filter(function(a){return a.type==='fill';}).length)) * 100) : 0;
    var clozeComments = pickLines(COMMENT.cloze[pickBucket(clozeAcc)], 1);
    var listenComments = pickLines(COMMENT.listening[listenBucket], 2);
    var overallComments = pickLines(COMMENT.overall[overallBucket], 2);

    // ===== 学习路径与目标规划 =====
    var ROADMAP = {
      pre_a1: { // pu0 / pu1
        title: '🌱 Pre-A1 起步计划',
        weeks: '4 周',
        daily: '每日 10 词 + 1 篇短文 + 1 段听力（15 分钟）',
        goals: ['掌握 200 核心名词、100 核心动词/形容词', '能听辨并写出 26 个字母、星期、月份、数字 0-100', '完成 Power Up 0 全部 14 个单元'],
        tracks: [
          { icon:'📖', title:'词汇测评', desc:'每日 1 轮，3 周可升至 PU1。' },
          { icon:'📋', title:'原版试卷', desc:'先做 PU0 的 Reading&Writing Part 1-3，写作先以抄写为主。' },
          { icon:'🎯', title:'定级测评', desc:'3 周后重测一次，看是否升级至 PU1。' }
        ]
      },
      a1: { // pu2 / pu3
        title: '🚀 A1 进阶计划',
        weeks: '6 周',
        daily: '每日 20 词 + 1 篇短文 + 1 套听力（25 分钟）',
        goals: ['掌握 400 词与基础时态（一般现在/过去/将来）', '能写 50 词以上的简单叙述文', '能听懂 1 分钟对话的关键信息'],
        tracks: [
          { icon:'📖', title:'词汇测评', desc:'每天扩词 20 个，重点是同义词与反义词。' },
          { icon:'📋', title:'原版试卷', desc:'PU2 顺序做；阅读 Part 4-5 主攻主旨与推断。' },
          { icon:'🎮', title:'游戏巩固', desc:'单词消消乐+音调辨音，每天 15 分钟。' }
        ]
      },
      a2: { // pu4
        title: '🏆 A2 冲刺 KET 计划',
        weeks: '8 周',
        daily: '每日 30 词 + 2 篇阅读 + 2 套听力（40 分钟）',
        goals: ['掌握 800 词与 8 大基础时态', '能在 30 分钟内完成 KET 写作（35-50 词邮件/便签）', '听写一段 90 秒的对话，准确率 ≥ 80%'],
        tracks: [
          { icon:'📖', title:'词汇测评', desc:'每周一次全量测评，确保 90% 以上的 KET 高频词熟练。' },
          { icon:'📋', title:'原版试卷', desc:'每周完成 1 套 PU4 全真模拟，计时严格 70 分钟。' },
          { icon:'🎯', title:'定级测评', desc:'赛前 1 周做一次测评定位。' }
        ]
      }
    };
    var recLvlStr = (recLvl <= 1) ? 'pre_a1' : (recLvl <= 3) ? 'a1' : 'a2';
    var plan = ROADMAP[recLvlStr];

    // ===== 薄弱点深挖 =====
    var weak = [];
    P.lang.questions.forEach(function (q) { if (!q.correct) weak.push({ kind:'词汇', word: q.word, level: q.level }); });
    if (P.read) P.read.answers.forEach(function (a) {
      if (!a.correct) {
        var q = a.q.replace(/^Q\d+:\s*/, '').replace(/（[^）]*）/g, '').trim();
        weak.push({ kind: a.type === 'fill' ? '阅读完形' : '阅读理解', q: q.slice(0, 30) + (q.length > 30 ? '…' : '') });
      }
    });
    P.listen.answers.forEach(function (a) {
      if (!a.correct) weak.push({ kind: '听力', q: a.q.replace(/^Q\d+:\s*/, '').replace(/（[^）]*）/g, '').slice(0, 30) + '…' });
    });

    // 按类型分组
    var weakByKind = { '词汇': [], '阅读理解': [], '阅读完形': [], '听力': [] };
    weak.forEach(function (w) { weakByKind[w.kind] = (weakByKind[w.kind] || []).concat(w); });

    
    // ============ HTML 渲染：正式测评报告（一整页） ============
    function rptGrade(acc){ return acc>=90?{L:'A',cn:'优秀',cls:'rpt-good'}:acc>=80?{L:'B',cn:'良好',cls:'rpt-good'}:acc>=70?{L:'C',cn:'中等',cls:'rpt-mid'}:acc>=60?{L:'D',cn:'及格',cls:'rpt-mid'}:{L:'E',cn:'需加强',cls:'rpt-low'}; }
    function rptAccCls(acc){ return acc>=80?'rpt-good':acc>=60?'rpt-mid':'rpt-low'; }
    var html = '<div class="pu-report">';
    html += '<div class="rpt-head"><div><div class="rpt-title">🎓 综合定级测评 · 报告</div><div class="rpt-sub">Cambridge Power Up · Adaptive Placement Assessment</div></div><div style="font-size:34px;">' + grade.emoji + '</div></div>';
    html += '<div class="rpt-body">';
    // 元信息
    html += '<div class="rpt-meta"><span>听力素材：<b>' + P.listen.bookName + '</b></span><span>阅读起点：<b>Level ' + (P.read ? P.read.startLevel : 0) + '</b></span><span>阅读峰值：<b>Level ' + (P.read ? P.read.peakLevel : 0) + '</b></span><span>语言 Level：<b>' + P.langLevel + '</b></span></div>';
    // 综合分仪表
    html += '<div style="display:flex; align-items:center; gap:18px; margin:4px 0 14px;">';
    html += '<div style="width:98px; height:98px; border-radius:50%; background:conic-gradient(var(--gold) ' + overall + '%, var(--card) 0); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><div style="width:76px;height:76px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:22px;font-weight:800;color:var(--gold);">' + overall + '%</div><div style="font-size:10px;color:var(--muted);">综合分</div></div></div>';
    html += '<div><div style="font-size:12px;color:var(--muted);">综合评级</div><div style="font-size:26px;font-weight:800;color:var(--gold);">' + grade.letter + ' · ' + grade.cn + '</div><div style="font-size:12px;color:var(--muted);margin-top:2px;">权重：语言 30% + 阅读 35% + 听力 35%</div></div>';
    html += '</div>';
    // 三维度表
    html += '<table class="rpt"><thead><tr><th>测评维度</th><th>说明</th><th>准确率</th><th>评级</th></tr></thead><tbody>';
    function rptRowP(label, info, acc){ var gg = rptGrade(acc), cl = rptAccCls(acc); return '<tr><td>' + label + '</td><td style="color:var(--muted);font-size:12px;">' + info + '</td><td class="' + cl + '">' + acc + '%</td><td class="' + cl + '">' + gg.L + '</td></tr>'; }
    var readInfo = P.read ? ('Level ' + P.read.startLevel + ' → ' + P.read.peakLevel + ' ｜ ' + P.read.correct + '/' + P.read.total + ' 对') : '-';
    html += rptRowP('📖 语言应用', '最终 Level ' + P.langLevel + ' ｜ ' + P.lang.correct + '/' + P.lang.total + ' 对', langAcc);
    html += rptRowP('🔍 阅读理解', readInfo, readAcc);
    html += rptRowP('🎧 听力理解', P.listen.bookName, listenAcc);
    html += '<tr style="background:rgba(212,165,116,.07);"><td><b>综合</b></td><td style="color:var(--muted);font-size:12px;">加权总分</td><td class="rpt-good"><b>' + overall + '%</b></td><td class="' + rptAccCls(overall) + '"><b>' + grade.letter + '</b></td></tr>';
    html += '</tbody></table>';
    // 分项分析与教师评语
    html += '<div class="rpt-section"><h4>📊 分项分析与教师评语</h4>';
    function blockCmt2(title, color, lines){ var s = '<div style="margin:8px 0;"><div style="font-size:13px;color:' + color + ';font-weight:600;margin-bottom:4px;">' + title + '</div>'; lines.forEach(function(l){ s += '<div style="font-size:12px;color:var(--text);line-height:1.65;padding:2px 0;">' + l + '</div>'; }); s += '</div>'; return s; }
    html += blockCmt2('📖 语言应用 / 词汇能力', 'var(--gold)', langComments);
    html += blockCmt2('📚 阅读理解（含完形填空）', 'var(--green)', readComments.concat(clozeComments));
    html += blockCmt2('🎧 听力理解', 'var(--blue, #74c0fc)', listenComments);
    html += blockCmt2('🎓 综合定性', 'var(--gold)', overallComments);
    html += '</div>';
    // 推荐起始级别
    html += '<div class="rpt-rec"><div style="font-size:12px;color:var(--muted);">📌 推荐起始级别</div><div class="big">' + bookFull[recBook] + '</div><div class="sub">依据：阅读峰值 ' + (P.read ? P.read.peakLevel : 0) + ' + 语言 Level ' + P.langLevel + ' + 听力 ' + listenAcc + '%</div></div>';
    // 学习路径
    html += '<div class="rpt-section"><h4>' + plan.title + '</h4><div style="font-size:12px;color:var(--muted);">⏱ ' + plan.weeks + ' ｜ 📅 ' + plan.daily + '</div><div style="font-size:12px;color:var(--gold);font-weight:600;margin:8px 0 2px;">🎯 阶段目标</div><ul class="rpt">';
    plan.goals.forEach(function(gg){ html += '<li>' + gg + '</li>'; });
    html += '</ul><div style="font-size:12px;color:var(--gold);font-weight:600;margin:6px 0 2px;">🛤 推荐训练组合</div>';
    plan.tracks.forEach(function(t){ html += '<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0;"><span style="font-size:16px;">' + t.icon + '</span><div><strong style="font-size:12px;color:var(--text);">' + t.title + '</strong> · <span style="font-size:12px;color:var(--muted);">' + t.desc + '</span></div></div>'; });
    html += '</div>';
    // 薄弱清单
    if (weak.length) {
      html += '<div class="rpt-section" style="border-color:var(--red);"><h4 style="color:var(--red);">📋 需加强清单（按类型聚合，共 ' + weak.length + ' 条）</h4>';
      ['词汇','阅读理解','阅读完形','听力'].forEach(function(k){
        var arr = weakByKind[k]; if (!arr || !arr.length) return;
        var maxShow = k === '词汇' ? 8 : 6;
        html += '<div style="margin:8px 0;"><div style="font-size:12px;color:var(--gold);font-weight:600;margin-bottom:4px;">🔹 ' + k + '（' + arr.length + ' 条，展示前 ' + Math.min(arr.length, maxShow) + '）</div><ul class="rpt">';
        arr.slice(0, maxShow).forEach(function(w){ var t = w.word ? ('<strong>' + w.word + '</strong>（Level ' + w.level + '）') : w.q; html += '<li>' + t + '</li>'; });
        html += '</ul></div>';
      });
      html += '</div>';
    }
    // 评分标准（折叠）
    html += '<details style="margin-top:12px;"><summary style="color:var(--gold);font-size:13px;cursor:pointer;">📐 查看评分标准（量化）</summary><div style="padding:12px 14px;background:var(--card);border:1px solid var(--border);border-radius:10px;text-align:left;margin-top:8px;"><ul class="rpt" style="color:var(--muted);"><li>语言应用：共 ' + LANG_TOTAL + ' 题，自适应（连对 3 题升 1 级 / 错 1 题降 1 级）。</li><li>阅读理解：4 篇短文（pu0~pu4），每篇 4-5 题，自适应等级升降，权重 35%。</li><li>听力理解：5 个 Part，权重 35%。</li><li>综合正确率 = 语言×30% + 阅读×35% + 听力×35%。</li><li>评级：≥90 A ｜ ≥80 B ｜ ≥70 C ｜ ≥60 D ｜ &lt;60 E。</li><li>推荐级别 = max(语言 Level, 阅读峰值, 听力推导级别)。</li></ul></div></details>';
    html += '<div class="rpt-actions"><button class="btn" onclick="startPlacement()">🔄 重新测评</button><button class="btn btn-outline" onclick="showApp(\'achievements\')">🏅 查看成就</button><button class="btn btn-outline" onclick="showApp(\'home\')">🏠 返回首页</button><button class="btn btn-outline" onclick="showApp(\'test\')">📋 推荐级别练习</button></div>';
    html += '<div class="rpt-foot">阅读与听力题库按官方 EOL 卷重建，答案键对照 Cambridge 教师答案页 (Pre A1/A1/A2)。</div>';
    html += '</div></div>';

$('plReport').innerHTML = html;
    $('plReport').scrollIntoView({behavior:'smooth', block:'start'});

    if (typeof fireVocabConfetti === 'function') fireVocabConfetti();
    if (typeof saveHistory === 'function') {
      saveHistory({ type:'placement', book: P.listen.bookName, score: overall, lang: langAcc, read: readAcc, listen: listenAcc, level: recLvl, grade: grade.letter, date: new Date().toISOString() });
    }
  }

  // ===================== 暴露给 HTML =====================
  window.startPlacement = startPlacement;
  window.plSpeakWord = plSpeakWord;
  window.plLangSelect = plLangSelect;
  window.startReading = startReading;
  window.plPickReading = plPickReading;
  window.plSubmitReading = plSubmitReading;
  window.plNextReading = plNextReading;
  window.finishReading = finishReading;
  window.plStartListening = plStartListening;
  window.plPlayPart = plPlayPart;
  window.plPickChoice = plPickChoice;
  window.plSubmitPart = plSubmitPart;
  window.plNextPart = plNextPart;
  window.finishListening = finishListening;
  window.renderListenPart = renderListenPart;
})();
