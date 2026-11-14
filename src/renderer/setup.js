// Desktop-only setup strip: default-browser registration, safe-link browser, clipboard protection.
(function () {
  let s = {};
  try { s = JSON.parse(PG.getSettings()); } catch { s = { browsers: [] }; }
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach(k => n.append(k)); return n; };

  const box = el('section', { className: 'panel setup' }, el('h2', { textContent: 'Protection settings' }));

  const defBtn = el('button', { className: 'primary', textContent: 'Open Default apps' });
  defBtn.addEventListener('click', () => PG.openDefaultApps());
  box.append(el('div', { className: 'line' },
    el('span', { textContent: 'Check links clicked in other apps (mail, chat, documents): choose PhishGuard as a browser option.' }), defBtn));

  const select = el('select');
  (s.browsers || []).forEach(b => select.append(el('option', { value: b.id, textContent: b.label, selected: b.id === s.browser })));
  if (!select.options.length) select.append(el('option', { textContent: 'No browser found', disabled: true }));
  select.addEventListener('change', () => PG.setBrowser(select.value));
  box.append(el('div', { className: 'line' }, el('span', { textContent: 'Open safe links with' }), select));

  const check = el('input', { type: 'checkbox', checked: s.clipboard !== false });
  check.addEventListener('change', () => PG.setClipboard(check.checked));
  box.append(el('div', { className: 'line' },
    el('label', {}, check, ' Check links I copy (runs in the background)'),
    el('small', { textContent: 'Clipboard text is checked on this PC only and never sent anywhere.' })));

  document.querySelector('main').prepend(box);
})();
