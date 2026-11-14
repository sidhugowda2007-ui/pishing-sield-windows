// Android dashboard: render code from the extension popup; storage comes from the native bridge (window.PG).
const getScans = () => { try { return JSON.parse(PG.getScans() || '[]'); } catch { return []; } };
const activity = document.querySelector('#activity');
const esc = value => { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; };
function renderChart(scans) {
  const days = Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() - (6 - i)); return date; });
  const counts = days.map(day => scans.filter(scan => new Date(scan.time).toDateString() === day.toDateString()).length);
  const max = Math.max(1, ...counts);
  document.querySelector('#chart').innerHTML = days.map((day, i) => `<div class="day"><div class="bar" style="height:${Math.max(4, counts[i] / max * 76)}px" title="${counts[i]} checks"></div><label>${day.toLocaleDateString(undefined,{weekday:'short'})}</label></div>`).join('');
  document.querySelector('#week').textContent = counts.reduce((a,b) => a+b, 0);
}
function render(scans) {
  document.querySelector('#total').textContent = scans.length;
  document.querySelector('#caught').textContent = scans.filter(scan => scan.level !== 'low').length;
  const tally = { low: 0, medium: 0, high: 0 }; scans.forEach(scan => tally[scan.level]++);
  document.querySelector('#low-count').textContent = tally.low;
  document.querySelector('#medium-count').textContent = tally.medium;
  document.querySelector('#high-count').textContent = tally.high;
  const safe = scans.length ? Math.round(tally.low / scans.length * 100) : 100;
  document.querySelector('#safe-percent').textContent = scans.length ? `${safe}%` : '—';
  const angle1 = tally.low / Math.max(1, scans.length) * 360, angle2 = (tally.low + tally.medium) / Math.max(1, scans.length) * 360;
  document.querySelector('#donut').style.background = `conic-gradient(#3cae8a 0deg ${angle1}deg,#f2b94f ${angle1}deg ${angle2}deg,#e87562 ${angle2}deg 360deg)`;
  renderChart(scans);
  if (!scans.length) { activity.innerHTML = '<div class="empty"><strong>You’re all clear so far</strong>Checked links will appear here as you browse.</div>'; return; }
  activity.innerHTML = scans.slice(0, 4).map(scan => `<div class="row"><div class="row-icon ${scan.level}">${scan.level === 'low' ? '✓' : '!'}</div><div class="row-main"><strong>${esc(scan.host || scan.url)}</strong><small>${new Date(scan.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · ${scan.score}/100 risk score</small></div><span class="badge ${scan.level}">${scan.level === 'low' ? 'Low risk' : scan.level === 'medium' ? 'Review' : 'High risk'}</span></div>`).join('');
}
window.refresh = () => render(getScans());
window.refresh();
document.querySelector('#clear').addEventListener('click', () => { PG.clearScans(); window.refresh(); });
