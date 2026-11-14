// Android warning screen: data and actions come from the native bridge (window.PG).
let data = {};
try { data = JSON.parse(PG.getWarning() || '{}'); } catch { data = {}; }
document.querySelector('#destination').textContent = data.url || '';
document.querySelector('#score').textContent = `${data.score || 0}/100`;
document.querySelector('#level').style.background = data.level === 'high' ? '#e87562' : '#f2b94b';
let indicators = Array.isArray(data.indicators) ? data.indicators : [];
const list = document.querySelector('#indicators');
if (!indicators.length) indicators = [{ label: 'No signal details were provided.', points: 0 }];
for (const indicator of indicators) {
  const item = document.createElement('li');
  item.textContent = `${indicator.label} (+${indicator.points})`;
  list.append(item);
}
document.querySelector('#back').addEventListener('click', () => PG.back());
document.querySelector('#proceed').addEventListener('click', () => PG.proceed());
