const canvas = document.getElementById("visualizer");
const audio = document.getElementById("audio");
const ctx = canvas.getContext("2d");
const playPauseButton = document.getElementById("playPause");
const seekBar = document.getElementById("seekBar");
const currentTimeElement = document.getElementById("currentTime");
const durationElement = document.getElementById("duration");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Configurar o contexto de áudio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioSource = audioContext.createMediaElementSource(audio);
const analyser = audioContext.createAnalyser();

// Conectando os elementos
audioSource.connect(analyser);
analyser.connect(audioContext.destination);

// Configuração do Analyser
analyser.fftSize = 2048;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Função para suavizar os dados
function smoothData(dataArray) {
  const smoothArray = [];
  const smoothingFactor = 20;

  for (let i = 0; i < dataArray.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -smoothingFactor; j <= smoothingFactor; j++) {
      if (i + j >= 0 && i + j < dataArray.length) {
        sum += dataArray[i + j];
        count++;
      }
    }
    smoothArray[i] = sum / count;
  }

  return smoothArray;
}

// Controlando a taxa de atualização (fps)
let lastTime = 0;
const fps = 12;

// Função de animação
function draw(time) {
  requestAnimationFrame(draw);

  if (time - lastTime < 1000 / fps) {
    return;
  }

  lastTime = time;

  analyser.getByteTimeDomainData(dataArray);

  const smoothedData = smoothData(dataArray);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#fff";

  ctx.beginPath();

  const sliceWidth = canvas.width / bufferLength;
  let x = 0;

  const middleY = canvas.height / 2;
  const oscAmplitude = canvas.height / 1.5;

  for (let i = 0; i < bufferLength; i++) {
    const normalizedIndex = i / bufferLength;
    const distanceFromCenter = Math.abs(normalizedIndex - 0.5);
    const oscFactor = 1 - Math.pow(distanceFromCenter, 1);

    const v = smoothedData[i] / 128.0;
    const y = middleY + Math.sin(i / 10) * oscAmplitude * (v - 1) * oscFactor;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, middleY);
  ctx.stroke();
}

// Atualizar barra de progresso e tempo
function updateSeekBar() {
  seekBar.value = (audio.currentTime / audio.duration) * 100;
  currentTimeElement.textContent = formatTime(audio.currentTime);
}

// Formatar tempo em minutos e segundos
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

// Atualizar duração do áudio
audio.addEventListener("loadedmetadata", () => {
  durationElement.textContent = formatTime(audio.duration);
});

// Atualizar barra de progresso durante a reprodução
audio.addEventListener("timeupdate", updateSeekBar);

// Controlar reprodução e pausa
playPauseButton.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
    playPauseButton.textContent = "⏸︎";
  } else {
    audio.pause();
    playPauseButton.textContent = "▶";
  }
});

// Controlar posição do áudio pela barra de progresso
seekBar.addEventListener("input", () => {
  audio.currentTime = (seekBar.value / 100) * audio.duration;
});

audio.addEventListener("play", () => {
  audioContext.resume();
  draw();
});
