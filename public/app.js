const form = document.getElementById('tank-form');
const recordsContainer = document.getElementById('records');
const searchInput = document.getElementById('searchInput');
let tankRecords = [];

function toLocalDateTimeString(date = new Date()) {
  const localDate = new Date(date);
  const offset = localDate.getTimezoneOffset();
  const corrected = new Date(localDate.getTime() - offset * 60 * 1000);
  return corrected.toISOString().slice(0, 16);
}

function setDefaultDates() {
  const now = toLocalDateTimeString();
  const waterChangedInput = document.getElementById('waterChangedAt');
  const lastFedInput = document.getElementById('lastFedAt');

  if (waterChangedInput && !waterChangedInput.value) {
    waterChangedInput.value = now;
  }

  if (lastFedInput && !lastFedInput.value) {
    lastFedInput.value = now;
  }
}

function refreshCurrentTimes() {
  const now = toLocalDateTimeString();
  const waterChangedInput = document.getElementById('waterChangedAt');
  const lastFedInput = document.getElementById('lastFedAt');

  if (waterChangedInput) {
    waterChangedInput.value = now;
  }

  if (lastFedInput) {
    lastFedInput.value = now;
  }
}

function formatDate(value) {
  if (!value) return 'Not set';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getFeedState(value) {
  if (!value) return { label: 'No time set', className: 'status-neutral' };

  const difference = new Date(value).getTime() - Date.now();
  if (difference < 0) return { label: 'Feed overdue', className: 'status-overdue' };
  if (difference <= 24 * 60 * 60 * 1000) return { label: 'Feed due soon', className: 'status-soon' };
  return { label: 'On schedule', className: 'status-ok' };
}

function updateMetrics(records) {
  const dueSoon = records.filter((record) => getFeedState(record.next_feed_due).className === 'status-soon').length;
  const overdue = records.filter((record) => getFeedState(record.next_feed_due).className === 'status-overdue').length;

  document.getElementById('metricTotal').textContent = records.length;
  document.getElementById('metricDue').textContent = dueSoon;
  document.getElementById('metricOverdue').textContent = overdue;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTankRecords() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const filteredRecords = tankRecords.filter((record) =>
    [record.tank_name, record.feed_type, record.notes]
      .some((value) => String(value || '').toLowerCase().includes(searchTerm))
  );

  updateMetrics(tankRecords);

  if (filteredRecords.length === 0) {
    recordsContainer.innerHTML = `<div class="empty-state">${searchTerm ? 'No tanks match that search.' : 'No tank maintenance has been logged yet.'}</div>`;
    return;
  }

  recordsContainer.innerHTML = filteredRecords
    .map((record) => {
      const feedState = getFeedState(record.next_feed_due);
      return `
        <article class="record-card">
          <div class="record-header">
            <div>
              <span class="record-kicker">Tank record</span>
              <h3>${escapeHtml(record.tank_name)}</h3>
            </div>
            <span class="record-status ${feedState.className}">${feedState.label}</span>
          </div>
          <div class="record-meta">
            <div class="meta-box">
              <strong>Water changed</strong>
              <span>${formatDate(record.water_changed_at)}</span>
            </div>
            <div class="meta-box">
              <strong>Last fed</strong>
              <span>${formatDate(record.last_fed_at)}</span>
            </div>
            <div class="meta-box">
              <strong>Next feed</strong>
              <span>${formatDate(record.next_feed_due)}</span>
            </div>
            <div class="meta-box">
              <strong>Feed type</strong>
              <span>${escapeHtml(record.feed_type)}</span>
            </div>
          </div>
          <p class="record-notes"><strong>Notes:</strong> ${escapeHtml(record.notes) || 'No additional notes.'}</p>
        </article>
      `;
    })
    .join('');
}

async function loadTankRecords() {
  try {
    const response = await fetch('/api/tanks');
    tankRecords = await response.json();
    renderTankRecords();
  } catch (error) {
    recordsContainer.innerHTML = '<div class="empty-state">Unable to load the recent tank activity.</div>';
    console.error(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    tankName: document.getElementById('tankName').value,
    waterChangedAt: document.getElementById('waterChangedAt').value,
    lastFedAt: document.getElementById('lastFedAt').value,
    nextFeedDue: document.getElementById('nextFeedDue').value,
    feedType: document.getElementById('feedType').value,
    notes: document.getElementById('notes').value,
  };

  try {
    const response = await fetch('/api/tanks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to save record.');
    }

    form.reset();
    refreshCurrentTimes();
    await loadTankRecords();
    alert(result.message);
  } catch (error) {
    alert(error.message);
  }
});

function exportCsv() {
  if (tankRecords.length === 0) {
    alert('There are no tank records to export yet.');
    return;
  }

  const headers = ['Tank', 'Water changed', 'Last fed', 'Next feed due', 'Feed type', 'Notes'];
  const rows = tankRecords.map((record) => [
    record.tank_name,
    record.water_changed_at,
    record.last_fed_at,
    record.next_feed_due || '',
    record.feed_type,
    record.notes || '',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  link.download = `prawn-tank-log-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

searchInput.addEventListener('input', renderTankRecords);
document.getElementById('exportButton').addEventListener('click', exportCsv);

refreshCurrentTimes();
setDefaultDates();
loadTankRecords();
