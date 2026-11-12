export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
    }
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'clipboard-helper';
  document.body.append(area);
  area.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    area.remove();
  }

  return copied;
}
