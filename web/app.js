const commandInput = document.getElementById('command-input');
const runButton = document.getElementById('run-command');
const speakButton = document.getElementById('speak-result');
const voiceButton = document.getElementById('toggle-voice');
const statusLine = document.getElementById('status-line');
const output = document.getElementById('command-output');

let voiceEnabled = false;
let recognition = null;

function makeResponse(prompt) {
  const summary = prompt.toLowerCase().includes('status')
    ? 'Local-first command is active and ready to answer offline requests.'
    : 'Daily Command is answering locally with a safe fallback response.';

  return {
    ok: true,
    zeroDependency: true,
    service: 'already-here-daily-command',
    mode: 'offline_survivable',
    timestamp: new Date().toISOString(),
    message: 'Offline command fallback engaged.',
    summary,
    status: {
      system: 'degraded',
      external: 'offline',
      note: 'Local offline mode is in effect.'
    },
    modeDetail: `Prompt length ${prompt.length}.`, 
    queuedActions: [
      'Queue manual review locally',
      'Hold external actions until approval',
      'Use text and voice fallback only'
    ]
  };
}

function renderResponse(response) {
  if (!output) return;
  output.textContent = JSON.stringify(response, null, 2);
}

function setStatus(message) {
  if (!statusLine) return;
  statusLine.textContent = `Status: ${message}`;
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function fetchCommand(prompt) {
  setStatus('running');
  fetch('/api/daily-command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((payload) => {
      renderResponse(payload);
      setStatus('online response');
      if (voiceEnabled) speakText(payload.summary);
    })
    .catch(() => {
      const fallback = makeResponse(prompt);
      renderResponse(fallback);
      setStatus('offline fallback');
      if (voiceEnabled) speakText(fallback.summary);
    });
}

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceButton.textContent = 'Voice unsupported';
    voiceButton.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript;
    if (transcript && commandInput) {
      commandInput.value = transcript;
      setStatus('voice captured');
    }
  };
  recognition.onend = () => setStatus('voice ready');
  recognition.onerror = () => setStatus('voice error');
}

if (runButton && commandInput) {
  runButton.addEventListener('click', () => fetchCommand(commandInput.value));
}

if (speakButton) {
  speakButton.addEventListener('click', () => {
    const text = output?.textContent || 'No response yet.';
    speakText(text);
  });
}

if (voiceButton) {
  voiceButton.addEventListener('click', () => {
    if (!recognition) {
      initVoice();
    }
    if (recognition) {
      voiceEnabled = true;
      setStatus('listening');
      recognition.start();
    }
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/web/daily-command-sw.js').catch(() => null);
}

setStatus('ready');
renderResponse(makeResponse(commandInput?.value ?? ''));
