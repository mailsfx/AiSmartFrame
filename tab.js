// ========== Настройки ==========
const WAKE_WORD = "рамка";      // ключевое слово (lowercase)
const USE_TTS = false;         // true включить speak (для теста оставь false)
const SLIDESHOW_COUNT = 6;     // сколько фото в папке img/1.jpg..img/N.jpg
const SLIDE_MS = 15000;        // интервал слайда

// ========== Элементы UI ==========
const body = document.body;
const clock = document.getElementById('clock');
const textPanel = document.getElementById('text-panel');
const imgEl = document.getElementById('ai-image');

// индикатор состояния
let statusEl = document.getElementById('status-indicator');
if (!statusEl) {
  statusEl = document.createElement('div');
  statusEl.id = 'status-indicator';
  document.body.appendChild(statusEl);
}
statusEl.style.position = 'absolute';
statusEl.style.right = '20px';
statusEl.style.bottom = '20px';
statusEl.style.padding = '6px 10px';
statusEl.style.borderRadius = '10px';
statusEl.style.background = 'rgba(0,0,0,0.35)';
statusEl.style.color = 'white';
statusEl.style.fontSize = '14px';
statusEl.style.opacity = '0.9';
statusEl.textContent = '🟢 Готова';

// ========== ЧАСЫ ==========
function updateClock() {
  const now = new Date();
  clock.textContent =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');
}
setInterval(updateClock, 1000);
updateClock();

// ========== СЛАЙДШОУ ФОНА ==========
let images = [];
let currentImg = 0;
let slideTimer = null;

function preloadSlides() {
  images = [];
  for (let i = 1; i <= SLIDESHOW_COUNT; i++) {
    images.push(`img/${i}.jpg`);
  }
  if (images.length) {
    setBodyBackground(images[0]);
    startSlideshow();
  }
}
function setBodyBackground(url) {
  body.style.backgroundImage = url ? `url('${url}')` : '';
  body.style.backgroundSize = 'cover';
  body.style.backgroundPosition = 'center';
}
function startSlideshow() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => {
    currentImg = (currentImg + 1) % images.length;
    setBodyBackground(images[currentImg]);
  }, SLIDE_MS);
}
preloadSlides();

// ========== ВИЗУАЛЬНЫЕ ФУНКЦИИ ==========
function showTextWithAnimation(text) {
  textPanel.textContent = text;
  textPanel.style.opacity = '1';
  textPanel.style.transform = 'translateX(0)';
  // авто-скрыть через 12s
  clearTimeout(textPanel._hide);
  textPanel._hide = setTimeout(() => {
    textPanel.style.opacity = '0';
    textPanel.style.transform = 'translateX(30px)';
  }, 12000);
}
function showImageWithAnimation(src) {
  if (!src) return;
  imgEl.src = src;
  imgEl.style.opacity = '1';
  imgEl.style.transform = 'translateX(0)';
  clearTimeout(imgEl._hide);
  imgEl._hide = setTimeout(() => {
    imgEl.style.opacity = '0';
    imgEl.style.transform = 'translateX(-20px)';
  }, 12000);
}
let thinkingTimeout = null;

function setThinking(active) {
  const content = document.getElementById('content');
  clearTimeout(thinkingTimeout);

  if (active) {
    // фон + анимация
    body.style.transition = 'background 1.5s ease';
    body.style.background = 'linear-gradient(135deg, #001f3f, #003366, #4b0082, #000c40)';
    body.style.backgroundSize = '400% 400%';
    body.style.animation = 'gradientShift 10s ease infinite';
    clock.style.opacity = '0'; // убираем часы

    // стеклянный блюр под контентом
    content.style.backdropFilter = 'blur(12px) brightness(0.9)';
    content.style.background = 'rgba(0, 0, 40, 0.25)';

    statusEl.textContent = '💭 Думает...';
  } else {
    // оставляем эффект ещё на 10 секунд
    thinkingTimeout = setTimeout(() => {
      body.style.animation = '';
      setBodyBackground(images[currentImg]);
      clock.style.opacity = '0.95';

      // убираем блюр
      content.style.backdropFilter = 'none';
      content.style.background = 'transparent';

      statusEl.textContent = '🟢 Готова';
    }, 10000);
  }
}




// ========== OPENROUTER (GPT) ==========
const OPENROUTER_TOKEN = "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"; // оставлено как пример
async function getOpenRouterResponse(promptText) {
  setThinking(true);
  // простой guard
  if (!promptText || promptText.trim().length === 0) {
    showTextWithAnimation("Пожалуйста, скажи запрос.");
    setTimeout(() => setThinking(false), 800);
    return;
  }

  const url = "https://openrouter.ai/api/v1/chat/completions";
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 600,
    messages: [
      { role: "system", content: "Ты — дружелюбная фоторамка. Отвечай коротко и по существу." },
      { role: "user", content: promptText }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_TOKEN.trim()}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      showTextWithAnimation(`Ошибка ${res.status}`);
      console.warn('OpenRouter status', res.status, await res.text());
      setThinking(false);
      return;
    }

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || "Нет ответа";
    showTextWithAnimation(answer);

    // try unsplash image
    try {
      const q = encodeURIComponent(promptText.split(' ').slice(0,6).join(' '));
      const u = await fetch(`https://api.unsplash.com/photos/random?query=${q}&client_id=5cNGGhySiIPu1aKITVFVoPBawvJyQSaY9RVAuu2wh4g`);
      if (u.ok) {
        const jd = await u.json();
        const imgUrl = jd?.urls?.regular;
        if (imgUrl) showImageWithAnimation(imgUrl);
      }
    } catch (e) { /* ignore image errors */ }

  } catch (err) {
    console.error("OpenRouter error", err);
    showTextWithAnimation("Ошибка сети");
  } finally {
    // Если TTS отключён — просто снятие thinking через небольшой тайм-аут
    setTimeout(() => setThinking(false), 900);
  }
}

// ========== TTS (опционально) ==========
function speakTextLocal(text) {
  if (!USE_TTS || !window.speechSynthesis) {
    // если TTS отключён — просто пауза перед возобновлением STT
    setTimeout(() => {
      if (recog && !sttManuallyStopped) try { recog.start(); } catch (e) {}
    }, 800);
    return;
  }

  // синхронное простое TTS
  try {
    if (recog) { try { recog.stop(); } catch (e) {} sttManuallyStopped = true; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ru-RU';
    utter.rate = 1;
    utter.pitch = 1;
    utter.onstart = () => { setThinking(true); };
    utter.onend = () => {
      setThinking(false);
      sttManuallyStopped = false;
      setTimeout(() => { if (recog) try { recog.start(); } catch (e) {} }, 700);
    };
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('TTS error', e);
  }
}

// ========== STT (SpeechRecognition) - устойчивая версия ==========
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let sttManuallyStopped = false;
let sttActive = false;

function startSTT() {
  if (!Rec) {
    showTextWithAnimation('Speech API не поддерживается');
    return;
  }

  // создаём новый объект каждый раз, чтобы избежать странных состояний браузера
  try {
    if (sttActive && recog) return; // уже слушаем
  } catch {}

  recog = new Rec();
  recog.lang = 'ru-RU';
  recog.interimResults = false;
  recog.continuous = true;

  recog.onstart = () => {
    sttActive = true;
    statusEl.textContent = '🟢 Слушает';
    console.log('STT onstart');
  };

  recog.onresult = (e) => {
    // игнор во время thinking/TTS
    if (body.classList.contains('thinking-bg')) return;

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (!r.isFinal) continue;
      const raw = r[0].transcript.trim();
      const clean = raw.replace(/[^\p{L}\p{N}\s'-]/gu, '').toLowerCase();
      console.log('STT final:', raw, '->', clean);
      if (!clean) continue;
      if (!clean.startsWith(WAKE_WORD)) {
        console.log('Игнор — нет wake word');
        continue;
      }
      const cmd = clean.slice(WAKE_WORD.length).trim();
      if (!cmd) {
        console.log('Wake word — но нет команды');
        continue;
      }
      // готовим визуально
      getOpenRouterResponse(cmd);
      // опционально проигрывать голосом (если включено)
      // speakTextLocal(answer) handled inside getOpenRouterResponse after answer
    }
  };

  recog.onerror = (ev) => {
    console.warn('STT error:', ev.error || ev);
    // если aborted — это нормально при stop() вызванном нами
    if (ev.error === 'aborted') {
      sttActive = false;
      // не перезапускаем здесь
      return;
    }
    statusEl.textContent = '⚠️ STT ошибка';
    // небольшой таймаут перед рестартом
    setTimeout(() => {
      if (!body.classList.contains('thinking-bg')) try { recog.start(); } catch (e) {}
    }, 1600);
  };

  recog.onend = () => {
    sttActive = false;
    // если мы вручную останавливали (например для TTS), не рестартим автоматически
    if (sttManuallyStopped) {
      console.log('STT stopped manually (do not restart)');
      return;
    }
    // рестартим только если не в состоянии thinking
    if (!body.classList.contains('thinking-bg')) {
      setTimeout(() => {
        try { recog.start(); } catch (e) { console.warn('restart error', e); }
      }, 1200);
    }
  };

  try {
    recog.start();
  } catch (e) {
    console.warn('STT start failed', e);
  }
}

// стартуем STT по клику или автоматически (браузеры требуют user gesture иногда)
document.addEventListener('click', () => {
  try { startSTT(); } catch (e) {}
}, { once: false });

// автозапуск
startSTT();
