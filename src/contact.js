import { copyText } from './clipboard.js';

const button = document.getElementById('copyTemplate');
const template = document.getElementById('feedbackTemplate');
const status = document.getElementById('copyStatus');

if (button && template && status) {
  let statusTimer = null;

  button.addEventListener('click', async () => {
    const copied = await copyText(template.textContent.trim());
    status.textContent = copied
      ? 'Template copied. Paste it into a GitHub issue or email.'
      : 'Could not copy automatically. Select the template text instead.';
    status.classList.toggle('is-error', !copied);
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      status.textContent = '';
      status.classList.remove('is-error');
    }, 6000);
  });
}
