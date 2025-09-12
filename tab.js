const clock=document.getElementById('clock');
function updateClock(){
  const now=new Date();
  clock.textContent=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
}
setInterval(updateClock,1000);updateClock();

// --- Fullscreen ---
const fsBtn=document.getElementById('fullscreen-btn');
fsBtn.addEventListener('click',()=>{
  if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();
  fsBtn.style.display='none';
});

// --- Панель текста и картинки ---
const textPanel=document.getElementById('text-panel');
const imgEl=document.getElementById('ai-image');

// --- Отображение текста и картинки ---
function showTextWithAnimation(text){
  textPanel.textContent=text;
  textPanel.style.opacity=1;
  textPanel.style.transform="translateX(0)";
  speakText(text); // воспроизведение текста
}
function showImageWithAnimation(src){
  imgEl.src=src;
  imgEl.style.opacity=1;
  imgEl.style.transform="translateX(0)";
}

// --- TTS ---
let ttsInProgress=false;
function speakText(text){
  if(!window.speechSynthesis) return;
  ttsInProgress=true;
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='ru-RU';
  utterance.rate=1;
  utterance.pitch=1;
  utterance.onend=()=>{
    ttsInProgress=false;
    if(recog) try{recog.start();}catch(e){console.warn(e);}
  };
  window.speechSynthesis.speak(utterance);
}

// --- OpenRouter GPT + Unsplash ---
async function getOpenRouterResponse(promptText){
  const token="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";
  const url="https://openrouter.ai/api/v1/chat/completions";
  const body={
    model:"gpt-4o-mini",temperature:0.3,max_tokens:1000,
    messages:[
      {role:"system",content:"Отвечай кратко, без смайликов. В конце ответа укажи KEYWORDS: English words for image search, но не показывай их пользователю."},
      {role:"user",content:promptText}
    ]
  };
  try{
    const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify(body)});
    const data=await res.json();
    let answer="Нет ответа", keywords=promptText;
    if(data.choices?.[0]?.message?.content){
      answer=data.choices[0].message.content;
      const match=answer.match(/KEYWORDS:\s*(.+)/i);
      if(match){keywords=match[1].trim(); answer=answer.replace(match[0],"").trim();}
    }
    showTextWithAnimation(answer);

    try{
      const u=await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keywords)}&client_id=5cNGGhySiIPu1aKITVFVoPBawvJyQSaY9RVAuu2wh4g`);
      const imgData=await u.json();
      const imgUrl=imgData?.urls?.regular || "https://via.placeholder.com/600x400?text=Картинка+не+найдена";
      showImageWithAnimation(imgUrl);
    }catch(e){showImageWithAnimation("https://via.placeholder.com/600x400?text=Ошибка");}

  }catch(e){
    console.error(e);
    showTextWithAnimation("Ошибка сети");
    showImageWithAnimation("https://via.placeholder.com/600x400?text=Ошибка");
  }
}

// --- STT с автоперезапуском ---
const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
let recog;
function startSTT(){
  if(!Rec){textPanel.textContent="Speech API не поддерживается"; return;}
  recog=new Rec();
  recog.lang="ru-RU";
  recog.interimResults=false;
  recog.continuous=true;

  recog.onresult=e=>{
    if(ttsInProgress) return; // игнорируем, пока идет TTS
    for(let i=e.resultIndex;i<e.results.length;i++){
      const r=e.results[i];
      if(r.isFinal){
        const text=r[0].transcript.trim();
        getOpenRouterResponse(text);
      }
    }
  };
  recog.onerror=ev=>{console.warn("STT error:",ev); setTimeout(()=>recog.start(),500);}
  recog.onend=()=>{
    if(!ttsInProgress) setTimeout(()=>recog.start(),500);
  };
  try{recog.start();}catch(e){console.warn(e);}
}
startSTT();
