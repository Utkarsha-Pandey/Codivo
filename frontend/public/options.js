const statusEl = document.getElementById('status');
const requestButton = document.getElementById('request-access');

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ` ${type}` : ''}`;
}

async function requestMicrophoneAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setStatus('Microphone access is enabled. You can close this tab and use voice input.', 'success');
  } catch (error) {
    console.error('Microphone permission request failed:', error);
    setStatus('Microphone access is still blocked. Check Chrome site permissions for this page and try again.', 'error');
  }
}

requestButton.addEventListener('click', () => {
  requestMicrophoneAccess();
});

requestMicrophoneAccess();
