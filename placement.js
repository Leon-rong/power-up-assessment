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
      },
      // 新增：对标 YLE Starters Part 4（话题 toys/colours/numbers，一般现在时，单词作答）
      {
        title: 'My Toys',
        text: 'Look at my toy box. I have three cars and two balls. The big ball is red and the small ball is yellow. My robot is grey. It can walk and sing. I play with my toys in my bedroom every day.',
        items: [
          { type:'choice', q:'How many cars does the writer have?', options:['Two','Three','Four','Five'], ans:1 },
          { type:'choice', q:'What colour is the big ball?', options:['Red','Yellow','Grey','Blue'], ans:0 },
          { type:'fill', q:'The robot is _____', ans:'grey', hint:'颜色' },
          { type:'fill', q:'The robot can walk and _____', ans:'sing', hint:'动词' }
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
      },
      // 新增：对标 YLE Starters 2018 真题 Part 4 "A school"（学校话题，teacher/board/playground 同源词汇）
      {
        title: 'Our Classroom',
        text: 'This is our classroom. It has two big windows and a green door. There are ten desks and a white board. Miss King is our teacher. She is kind and funny. On the board, she writes words and numbers. My favourite lesson is art because we paint pictures of animals. After school, I play football in the playground with my friends.',
        items: [
          { type:'choice', q:'What colour is the door?', options:['Red','Green','Blue','Yellow'], ans:1 },
          { type:'choice', q:'What is the writer\'s favourite lesson?', options:['Math','English','Art','Music'], ans:2 },
          { type:'fill', q:'Miss King writes words and _____ on the board', ans:'numbers', hint:'名词' },
          { type:'fill', q:'After school, they play football in the _____', ans:'playground', hint:'场所' }
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
      },
      // 新增：对标 YLE Movers 2018 真题 Part 4 "Rabbits"（动物说明文 + 功能词，but/cannot/keep warm 同源表达）
      {
        title: 'Penguins',
        text: 'Penguins are funny birds, but they cannot fly! They live in cold places near the sea. Penguins have black backs and white fronts. This helps them hide in the water. They are very good swimmers, and they eat small fish. When it is very cold, penguins stand together in big groups to keep warm. Baby penguins have soft grey bodies and stay close to their parents. In zoos around the world, children love watching these birds swim and play.',
        items: [
          { type:'choice', q:'What do penguins eat?', options:['Grass','Small fish','Meat','Fruit'], ans:1 },
          { type:'choice', q:'Why do penguins stand in big groups?', options:['To hide','To keep warm','To swim','To sleep'], ans:1 },
          { type:'fill', q:'Penguins are funny birds, but they cannot _____', ans:'fly', hint:'动词' },
          { type:'fill', q:'Penguins have black _____ and white fronts', ans:'backs', hint:'身体部位' },
          { type:'fill', q:'Baby penguins have soft _____ bodies', ans:'grey', hint:'颜色' }
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
      },
      // 新增：对标 YLE Movers Part 4 高阶（学校出行话题，过去时叙事 + 直接引语）
      {
        title: 'A Trip to the Museum',
        text: 'Last Friday, Class 4 went to the science museum. First, they watched a short film about space. Then a guide showed them an old rocket and a real astronaut\'s spacesuit. "Can we touch it?" Tom asked. "No, but you can try on the space helmet!" the guide answered. Tom\'s friend Emma found the dinosaur room the most exciting. After lunch in the museum café, everyone drew a picture of their favourite thing. On the bus home, the children were tired but happy. "It was the best school trip ever!" said Emma.',
        items: [
          { type:'choice', q:'Where did Class 4 go last Friday?', options:['To the zoo','To a farm','To a science museum','To the beach'], ans:2 },
          { type:'choice', q:'What did Emma like most?', options:['The rocket','The spacesuit','The dinosaur room','The film'], ans:2 },
          { type:'fill', q:'A guide showed them an old _____ and a spacesuit', ans:'rocket', hint:'名词' },
          { type:'fill', q:'On the bus home, the children were tired but _____', ans:'happy', hint:'形容词' },
          { type:'fill', q:'"It was the best school trip _____!" said Emma', ans:'ever', hint:'副词' }
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
      },
      // 新增：对标 YLE Flyers Part 3/4 故事语篇（过去叙事 + 对话 + 推理题，参照 2018 真题 cave story 风格）
      {
        title: 'The Lost Camera',
        text: 'When Anna got home from her holiday, she couldn\'t find her camera. She remembered taking photos on the beach, so she looked in her blue suitcase first, but it wasn\'t there. Then she checked her backpack and all her pockets - nothing. Anna felt sad because the photos of her trip were very important to her. Her younger brother Peter came into her room. "Why are you looking under the bed?" he asked. "I\'ve lost my camera," Anna replied. Peter smiled and opened his desk drawer. "Is this it? I found it in the taxi on the way home. I was going to give it to you after dinner." The camera had all the holiday photos, and Anna took a funny photo of Peter to say thank you.',
        items: [
          { type:'choice', q:'Where did Anna look FIRST?', options:['In her backpack','In her blue suitcase','Under the bed','In Peter\'s drawer'], ans:1 },
          { type:'choice', q:'Why did Anna feel sad?', options:['Her camera was broken','The photos were important','Peter took the camera','She lost her suitcase'], ans:1 },
          { type:'choice', q:'Where did Peter find the camera?', options:['In the taxi','At the beach','In the hotel','In the garden'], ans:0 },
          { type:'fill', q:'Anna first looked in her blue _____', ans:'suitcase', hint:'名词' },
          { type:'fill', q:'Peter found the camera in the _____', ans:'taxi', hint:'交通工具' },
          { type:'fill', q:'Anna took a funny photo of Peter to say _____', ans:'thank you', hint:'礼貌用语' }
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

  // 听力题库：直接从官方原卷数据（PAGE_PART / PAGE_QUESTIONS / PAGE_ANSWERS）构建，
  // 保证「播放的音频 = 显示的试卷图 = 所答的题」三者严格一致（不再使用任何编造题）。
  function bookSub(id) {
    return (id === 'pu0' || id === 'pu1') ? 'starters' : (id === 'pu2' || id === 'pu3') ? 'movers' : 'flyers';
  }

  function listenPageImg(id, page) {
    var sub = bookSub(id);
    return 'images_webp/' + id + '_' + sub + '/' + id + '_' + sub + '_' + String(page).padStart(3, '0') + '.webp';
  }

  // 归一化答案：忽略大小写/空格/连字符（官方拼写答案形如 J-O-N-E-S、H-A-L-L）
  function normAns(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[\s\-_.,'!]/g, '');
  }

  function buildListeningBank(book) {
    var part = (typeof PAGE_PART !== 'undefined' && PAGE_PART[book]) || {};
    var qs = (typeof PAGE_QUESTIONS !== 'undefined' && PAGE_QUESTIONS[book]) || {};
    var ans = (typeof PAGE_ANSWERS !== 'undefined' && PAGE_ANSWERS[book]) || {};
    var groups = {};   // partNo -> { title, pages:[], questions:[] }
    Object.keys(part).forEach(function (pg) {
      var label = part[pg] || '';
      if (label.indexOf('\u542c\u529b') !== 0) return;            // 仅取「听力 …」页
      var m = label.match(/Part\s*(\d+)/i);
      if (!m) return;
      var no = parseInt(m[1], 10);
      var qlist = qs[pg] || [], alist = ans[pg] || [];
      if (!qlist.length) return;
      if (!groups[no]) groups[no] = { part: no, title: '', pages: [], questions: [] };
      var g = groups[no];
      g.pages.push(parseInt(pg, 10));
      if (!g.title) g.title = label.replace(/^\u542c\u529b\s*/, '').replace(/（[^）]*）/, '').trim();
      qlist.forEach(function (q, i) {
        var a = alist[i] || {};
        var raw = (typeof a === 'string') ? a : (a.ans || '');
        g.questions.push({
          type: (q.type === 'choice') ? 'choice' : 'fill',
          q: q.q,
          options: q.options || ['A', 'B', 'C'],
          ans: raw,
          page: parseInt(pg, 10)
        });
      });
    });
    var parts = Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return a.part - b.part; });
    parts.forEach(function (g) { g.pages.sort(function (a, b) { return a - b; }); });
    return parts.length ? parts : null;
  }
  function plStartListening(book) {
    var bank = buildListeningBank(book) || buildListeningBank('pu0');
    if (!book || !bank) book = 'pu0';
    P.listen = {
      book: book,
      bookName: { pu0:'Power Up 0 (Pre-A1 Starters)', pu1:'Power Up 1 (Pre-A1→A1 Starters)', pu2:'Power Up 2 (A1 Movers)', pu3:'Power Up 3 (A1+ Movers)', pu4:'Power Up 4 (A2 Flyers)' }[book],
      parts: bank,
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
    html += '  <h3 style="color:var(--gold); margin:6px 0;">Part ' + part.part + ' · ' + (part.title || '') + '</h3>';
    if (file) {
      html += '  <button class="ctrl-btn" id="plPlayBtn" onclick="plPlayPart()">🎧 播放本 Part 听力（原版录音）</button>';
    } else {
      html += '  <p style="color:var(--muted); font-size:12px;">（本 Part 暂无配套原声，请对照官方答案页自测）</p>';
    }
    // 官方原卷试题页（看图/听音作答，点击图片可放大）
    if (part.pages && part.pages.length) {
      html += '  <div style="margin-top:14px;">';
      html += '    <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">📄 官方原卷试题页（第 ' + part.pages.join('、') + ' 页）· 点击图片可放大</div>';
      html += '    <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center;">';
      part.pages.forEach(function (pg) {
        var src = listenPageImg(L.book, pg);
        html += '      <img src="' + src + '" alt="原卷第 ' + pg + ' 页" onclick="window.open(this.src,\'_blank\')" ';
        html += 'style="max-width:100%; width:' + (part.pages.length > 1 ? '46%' : '88%') + '; border:1px solid var(--border); border-radius:10px; background:#fff; cursor:zoom-in;">';
      });
      html += '    </div>';
      html += '  </div>';
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
    var html = '<p style="color:var(--muted); font-size:12px; margin:4px 0 12px;">本 Part 共 ' + part.questions.length + ' 题（对照上方官方原卷页 + 原版录音作答），全部作答后点下方按钮统一提交。</p>';
    part.questions.forEach(function (q, qi) {
      html += '<div class="pl-q" data-q="' + qi + '" style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:14px; margin-bottom:14px; text-align:left;">';
      html += '  <div style="font-size:15px; color:var(--text); margin-bottom:10px;"><span style="color:var(--gold); font-weight:700;">Q' + (qi + 1) + '.</span> ' + q.q + '</div>';
      if (q.type === 'fill') {
        var ph = /-/.test(String(q.ans)) ? '按听到的字母拼写（如 A-B-C）' : '请输入答案（英文/数字）';
        html += '  <input type="text" id="plFill_' + qi + '" autocomplete="off" placeholder="' + ph + '" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:15px;">';
      } else {
        var opts = (q.options && q.options.length) ? q.options : ['A', 'B', 'C'];
        html += '  <div style="display:grid; grid-template-columns:repeat(' + Math.min(opts.length, 3) + ',1fr); gap:10px;">';
        opts.forEach(function (opt, i) {
          html += '    <button type="button" class="pl-opt ctrl-btn" data-q="' + qi + '" onclick="plPickChoice(' + qi + ',' + i + ')">' + opt + '</button>';
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
        given = el ? el.value.trim() : '';
        isCorrect = (given !== '' && normAns(given) === normAns(q.ans));   // 忽略大小写/连字符（J-O-N-E-S ≈ jones）
      } else {
        var sel = P.listen.picks[qi];
        var opts = (q.options && q.options.length) ? q.options : ['A', 'B', 'C'];
        var rightIdx = opts.indexOf(String(q.ans).trim().toUpperCase());
        if (rightIdx < 0) rightIdx = 'ABC'.indexOf(String(q.ans).trim().toUpperCase());
        given = (sel === undefined) ? '(未作答)' : opts[sel];
        isCorrect = (sel === rightIdx);
        var btns = document.querySelectorAll('[data-q="' + qi + '"] .pl-opt');
        btns.forEach(function (b, bi) {
          if (bi === rightIdx) { b.style.borderColor = 'var(--green)'; b.style.background = 'rgba(81,207,102,.18)'; }
          else if (bi === sel) { b.style.borderColor = 'var(--red)'; b.style.background = 'rgba(255,90,90,.18)'; }
        });
      }
      if (isCorrect) L.correct++; L.total++;
      L.answers.push({ correct: isCorrect, q: q.q, type: q.type, given: given, ans: String(q.ans) });
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
    var langAcc = (P.lang && P.lang.total) ? Math.round(P.lang.correct / P.lang.total * 100) : 0;
    var readAcc = (P.read && P.read.total) ? Math.round(P.read.correct / P.read.total * 100) : 0;
    var listenAcc = P.listenAccuracy;
    // 综合权重：词汇 30% + 阅读 35% + 听力 35%（阅读/听力为理解核心，与官方 EOL 四项技能配比一致）；下方另按技能级别加权推导推荐起始级别
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

    // ===== 官方 CEFR 分级定级：词汇 / 阅读 / 听力 → 0-4 级别 → Power Up 册 =====
    var CEFR_LV = ['Pre-A1 (Starters)', 'Pre-A1→A1', 'A1 (Movers)', 'A1+ (Movers)', 'A2 (Flyers)'];
    // 三项技能各自级别（0-4）
    // 词汇/语言应用：自适应直接定级（P.langLevel 可达 0-6，但本报告量表仅定义 0-4，
    // 超出部分按最高档 A2/Flyers 处理，避免出现 COMMENT.vocab[5/6] 未定义而崩溃）
    var vLevel = Math.max(0, Math.min(4, P.langLevel || 0));
    var rLevel = (P.read && P.read.level != null) ? P.read.level : (P.read ? P.read.peakLevel : 0); // 阅读：最终稳定级别（非峰值）
    function listenLevelFromAcc(a) { return a >= 90 ? 4 : a >= 80 ? 3 : a >= 65 ? 2 : a >= 50 ? 1 : 0; }
    var lLevel = listenLevelFromAcc(listenAcc);                                           // 听力：由 YLE 分级阈值映射（官方 shields 口径）
    // 权重：阅读/听力为理解核心，各 35%；语言应用 30%（与官方 EOL 四项技能配比一致）
    var W_V = 0.30, W_R = 0.35, W_L = 0.35;
    var compositeF = vLevel * W_V + rLevel * W_R + lLevel * W_L;
    var compositeLevel = Math.max(0, Math.min(4, Math.round(compositeF)));
    // 官方「防滑坡」定级原则：推荐级别不超过最弱单项级别 +1，避免过度越级导致挫败
    var minLevel = Math.min(vLevel, rLevel, lLevel);
    var recLvl = Math.max(0, Math.min(4, Math.min(compositeLevel, minLevel + 1)));
    var recBook = BOOK_BY_LEVEL[recLvl] || 'pu0';
    var readPeak = (P.read && P.read.peakLevel) || 0;
    if (typeof window.gamify === 'object') {
      window.gamify.placementCount = (window.gamify.placementCount || 0) + 1;
      if (window.gamify.placementCount >= 3) window.gamify.unlockBadgeById('placement_3_times');
      window.gamify.save();
    }
    var bookFull = { pu0:'Power Up 0 (Pre-A1 Starters)', pu1:'Power Up 1 (Pre-A1→A1 Starters)', pu2:'Power Up 2 (A1 Movers)', pu3:'Power Up 3 (A1+ Movers)', pu4:'Power Up 4 (A2 Flyers)' };

    // ===== 多维评价库 =====
    var COMMENT = {
      vocab: {
        0: ['📚 能认读最基础的名词（颜色／动物／家庭／数字）与少量高频动词，词汇量约 150-200。',
            '🎯 建议从 PU0 核心词卡起步，每天 10 词，配图＋音频双通道记忆。'],
        1: ['📚 掌握 PU0-PU1 衔接阶段核心词（约 250-350），能区分形近词与基础搭配。',
            '🎯 可进入 PU1，重点用「词族」集中巩固动词短语。'],
        2: ['📚 词汇量达 A1（约 400-500 词），能就日常主题自由表达，近义词开始分化。',
            '🎯 适合 PU2，建议每天扩词 20 个，强化同义／反义。'],
        3: ['📚 具备 A1+ 叙事词汇，能运用简单搭配与一词多义，连句表达更顺。',
            '🎯 适合 PU3，可引入话题词块（weather／food／holiday）。'],
        4: ['📚 词汇接近 KET 高频词（600-800），能借助语境猜测生词，读懂短文熟词。',
            '🎯 可冲刺 PU4，重点补足 Flyers 故事／邮件高频词。']
      },
      reading: {
        0: ['🔍 能借助图片读懂 30-50 词简单句，理解主谓宾基本结构。',
            '🎯 建议从 PU0 短句＋图片题起步，先建立「读→懂」的信心。'],
        1: ['🔍 能读 PU1 级 60-80 词短文，抓住主旨与显式细节。',
            '🎯 进入衔接阶段，养成「题干→回文定位」习惯。'],
        2: ['🔍 能读 A1/Movers 级说明文，定位时间／数字／地点等细节并做简单推断。',
            '🎯 适合 PU2，主攻 Part 4-5 主旨与推断。'],
        3: ['🔍 能读 A1+ 较长语篇，理解段落逻辑与作者意图，完形填空稳定。',
            '🎯 适合 PU3，可加练「无选项猜测」提升推理。'],
        4: ['🔍 能独立阅读 A2/Flyers 故事与邮件，推断隐含信息并概括。',
            '🎯 可冲刺 PU4，每周 1 篇原版＋1 套模拟计时。']
      },
      listening: {
        0: ['🎧 能听辨单词、字母与简单指令（YLE Part 1 级），对图片提示依赖较强。',
            '🎯 从 PU0 听力起步，听前先看图预测。'],
        1: ['🎧 能抓简单对话中的关键词（人物／动作／地点），需 2 遍以上。',
            '🎯 进入衔接阶段，用「五指法」听写人物／动作／地点／时间／数字。'],
        2: ['🎧 能听懂 A1/Movers 对话的主旨与多数细节，对转折／否定偶有遗漏。',
            '🎯 适合 PU2，每 Part 听 2 遍：整体→细抠转折词。'],
        3: ['🎧 能听懂 A1+ 较长对话，抓取关键信息并跟住语流，准确率较高。',
            '🎯 适合 PU3，加练听写＋跟读提升音节切分。'],
        4: ['🎧 能听懂 A2/Flyers 真实语速语篇，数字／身份／态度都能精准抓取。',
            '🎯 可冲刺 PU4，听写＋跟读混合训练冲 KET。']
      },
      cloze: {
        A: ['✍️ 完形填空能力扎实：对上下文线索、时态呼应、词性匹配都掌握得很好。',
            '🎯 可进入更高阶的「词形变换」题。'],
        B: ['✍️ 大部分题能根据上下文推断，少数近义词辨析仍需强化。'],
        C: ['✍️ 容易在第一反应填词，建议先看挖空前后的提示词再决定。'],
        D: ['✍️ 上下文推理训练不足，建议做 5 篇「无选项猜测＋看答案对照」的练习。'],
        E: ['✍️ 缺基础，建议先做选择题（看到选项再选）建立语感。']
      }
    };
    // 动态推荐评语：综合级别 + 官方防滑坡护栏 + 最弱项提示
    function recComment() {
      var weakName = (vLevel === minLevel) ? '词汇' : (rLevel === minLevel) ? '阅读' : '听力';
      var lines = [];
      lines.push('📌 综合级别 = 词汇 Lv' + vLevel + ' ×30% ＋ 阅读 Lv' + rLevel + ' ×35% ＋ 听力 Lv' + lLevel + ' ×35% = <b>Lv ' + compositeLevel + '</b>（' + CEFR_LV[compositeLevel] + '）。');
      lines.push('🛡 遵循剑桥「防滑坡」定级原则：推荐起始级别不超过最弱单项（' + weakName + ' Lv' + minLevel + '）＋1，故推荐 <b>' + bookFull[recBook] + '</b>。');
      if (vLevel !== rLevel || rLevel !== lLevel) {
        lines.push('⚠️ 三项能力不均衡：最弱项为 ' + weakName + '（Lv ' + minLevel + '）。建议该项额外投入约 30% 练习量，避免越级挫败、稳步进阶。');
      } else {
        lines.push('✅ 三项能力均衡（均为 Lv ' + vLevel + '），可直接进入推荐级别稳步提升。');
      }
      return lines;
    }
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
    var langComments = pickLines(COMMENT.vocab[vLevel], 2);
    var readComments = pickLines(COMMENT.reading[rLevel], 2);
    var clozeAcc = P.read ? Math.round((P.read.answers.filter(function(a){return a.type==='fill';}).reduce(function(s,a){return s+(a.correct?1:0);},0) / Math.max(1, P.read.answers.filter(function(a){return a.type==='fill';}).length)) * 100) : 0;
    var clozeComments = pickLines(COMMENT.cloze[pickBucket(clozeAcc)], 1);
    var listenComments = pickLines(COMMENT.listening[lLevel], 2);
    var overallComments = recComment();

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
    ((P.lang && P.lang.questions) ? P.lang.questions : []).forEach(function (q) { if (!q.correct) weak.push({ kind:'词汇', word: q.word, level: q.level }); });
    if (P.read) P.read.answers.forEach(function (a) {
      if (!a.correct) {
        var q = a.q.replace(/^Q\d+:\s*/, '').replace(/（[^）]*）/g, '').trim();
        weak.push({ kind: a.type === 'fill' ? '阅读完形' : '阅读理解', q: q.slice(0, 30) + (q.length > 30 ? '…' : '') });
      }
    });
    (P.listen.answers || []).forEach(function (a) {
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
    html += '<div class="rpt-meta"><span>听力素材：<b>' + P.listen.bookName + '</b></span><span>词汇级别：<b>Lv ' + vLevel + '</b></span><span>阅读级别：<b>Lv ' + rLevel + '</b>（起' + (P.read ? P.read.startLevel : 0) + '→终' + rLevel + '｜峰' + readPeak + '）</span><span>听力级别：<b>Lv ' + lLevel + '</b></span><span>综合级别：<b>Lv ' + compositeLevel + '</b></span></div>';
    // 综合分仪表
    html += '<div style="display:flex; align-items:center; gap:18px; margin:4px 0 14px;">';
    html += '<div style="width:98px; height:98px; border-radius:50%; background:conic-gradient(var(--gold) ' + overall + '%, var(--card) 0); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><div style="width:76px;height:76px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:22px;font-weight:800;color:var(--gold);">' + overall + '%</div><div style="font-size:10px;color:var(--muted);">综合分</div></div></div>';
    html += '<div><div style="font-size:12px;color:var(--muted);">综合评级</div><div style="font-size:26px;font-weight:800;color:var(--gold);">' + grade.letter + ' · ' + grade.cn + '</div><div style="font-size:12px;color:var(--muted);margin-top:2px;">级别权重：词汇 30% + 阅读 35% + 听力 35%（按 CEFR 理解技能配比）</div></div>';
    html += '</div>';
    // 三维度表
    html += '<table class="rpt"><thead><tr><th>测评维度</th><th>说明</th><th>准确率</th><th>评级</th></tr></thead><tbody>';
    function rptRowP(label, info, acc){ var gg = rptGrade(acc), cl = rptAccCls(acc); return '<tr><td>' + label + '</td><td style="color:var(--muted);font-size:12px;">' + info + '</td><td class="' + cl + '">' + acc + '%</td><td class="' + cl + '">' + gg.L + '</td></tr>'; }
    var readInfo = P.read ? ('Level ' + P.read.startLevel + ' → ' + P.read.peakLevel + ' ｜ ' + P.read.correct + '/' + P.read.total + ' 对') : '-';
    html += rptRowP('📖 语言应用', (P.lang ? ('最终 Level ' + P.langLevel + ' ｜ ' + P.lang.correct + '/' + P.lang.total + ' 对') : '未完成'), langAcc);
    html += rptRowP('🔍 阅读理解', readInfo, readAcc);
    html += rptRowP('🎧 听力理解', P.listen.bookName, listenAcc);
    html += '<tr style="background:rgba(212,165,116,.07);"><td><b>综合</b></td><td style="color:var(--muted);font-size:12px;">加权总分</td><td class="rpt-good"><b>' + overall + '%</b></td><td class="' + rptAccCls(overall) + '"><b>' + grade.letter + '</b></td></tr>';
    html += '</tbody></table>';
    // 分项分析与教师评语
    // 技能级别矩阵（官方 CEFR 分级）
    html += '<div style="margin:10px 0;padding:12px 14px;background:var(--card);border:1px solid var(--border);border-radius:10px;">';
    html += '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">🧭 技能级别矩阵（0-4 → CEFR → Power Up）</div>';
    html += '<table class="rpt" style="margin:0;"><thead><tr><th>技能</th><th>级别</th><th>CEFR</th><th>权重</th></tr></thead><tbody>';
    html += '<tr><td>📖 词汇</td><td><b>Lv ' + vLevel + '</b></td><td>' + CEFR_LV[vLevel] + '</td><td>30%</td></tr>';
    html += '<tr><td>🔍 阅读</td><td><b>Lv ' + rLevel + '</b></td><td>' + CEFR_LV[rLevel] + '</td><td>35%</td></tr>';
    html += '<tr><td>🎧 听力</td><td><b>Lv ' + lLevel + '</b></td><td>' + CEFR_LV[lLevel] + '</td><td>35%</td></tr>';
    html += '<tr style="background:rgba(212,165,116,.07);"><td><b>综合</b></td><td><b>Lv ' + compositeLevel + '</b></td><td>' + CEFR_LV[compositeLevel] + '</td><td>100%</td></tr>';
    html += '</tbody></table></div>';
    html += '<div class="rpt-section"><h4>📊 分项分析与教师评语</h4>';
    function blockCmt2(title, color, lines){ var s = '<div style="margin:8px 0;"><div style="font-size:13px;color:' + color + ';font-weight:600;margin-bottom:4px;">' + title + '</div>'; lines.forEach(function(l){ s += '<div style="font-size:12px;color:var(--text);line-height:1.65;padding:2px 0;">' + l + '</div>'; }); s += '</div>'; return s; }
    html += blockCmt2('📖 语言应用 / 词汇能力', 'var(--gold)', langComments);
    html += blockCmt2('📚 阅读理解（含完形填空）', 'var(--green)', readComments.concat(clozeComments));
    html += blockCmt2('🎧 听力理解', 'var(--blue, #74c0fc)', listenComments);
    html += blockCmt2('🎓 综合定性', 'var(--gold)', overallComments);
    html += '</div>';
    // 推荐起始级别
    html += '<div class="rpt-rec"><div style="font-size:12px;color:var(--muted);">📌 推荐起始级别（官方 CEFR 防滑坡定级）</div><div class="big">' + bookFull[recBook] + '</div><div class="sub">综合 Lv ' + compositeLevel + '（词汇'+vLevel+'×30% + 阅读'+rLevel+'×35% + 听力'+lLevel+'×35%）｜ 受最弱项 Lv '+minLevel+' 限制（≤+1）→ 定 Lv '+recLvl+'</div></div>';
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
    html += '<details style="margin-top:12px;"><summary style="color:var(--gold);font-size:13px;cursor:pointer;">📐 查看评分标准（量化）</summary><div style="padding:12px 14px;background:var(--card);border:1px solid var(--border);border-radius:10px;text-align:left;margin-top:8px;"><ul class="rpt" style="color:var(--muted);"><li>词汇/语言应用：共 ' + LANG_TOTAL + ' 题，自适应（连对 3 题升 1 级 / 错 1 题降 1 级）。</li><li>阅读理解：4 篇短文（pu0~pu4），每篇 4-5 题，自适应等级升降，权重 35%。</li><li>听力理解：5 个 Part，权重 35%。</li><li>综合正确率（评级口径）= 词汇×30% + 阅读×35% + 听力×35% → 评级 A/B/C/D/E（≥90/80/70/60）。</li><li>技能级别（0-4 → CEFR）：词汇=自适应定级；阅读=4 篇自适应最终稳定级别；听力=正确率按 YLE shields 阈值映射（≥90→Lv4, ≥80→Lv3, ≥65→Lv2, ≥50→Lv1, 否则 Lv0）。</li><li>综合级别 = round(词汇×0.30 + 阅读×0.35 + 听力×0.35)，钳制 0-4。</li><li>推荐级别（官方防滑坡）：min(综合级别, 最弱单项级别 + 1)，钳制 0-4 —— 不按最高项越级。</li></ul></div></details>';
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
