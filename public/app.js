const form = document.getElementById('tank-form');
const recordsContainer = document.getElementById('records');
const searchInput = document.getElementById('searchInput');
const statusMessage = document.getElementById('statusMessage');
let tankRecords = [];

function showMessage(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type === 'error' ? 'error' : ''}`;
  statusMessage.hidden = false;
}

function toLocalDateTimeString(date = new Date()) {
  const localDate = new Date(date);
  const offset = localDate.getTimezoneOffset();
  const corrected = new Date(localDate.getTime() - offset * 60 * 1000);
  return corrected.toISOString().slice(0, 16);
}

function toLocalDateString(date = new Date()) {
  return toLocalDateTimeString(date).slice(0, 10);
}

function getLifecycle(record) {
  const stockedAt = new Date(`${record.stocked_at || toLocalDateString()}T00:00:00`);
  const today = new Date(`${toLocalDateString()}T00:00:00`);
  const daysInTank = Math.max(0, Math.floor((today - stockedAt) / (24 * 60 * 60 * 1000)));

  if (daysInTank <= 1) return { daysInTank, stage: 'Nauplii (approx.)' };
  if (daysInTank <= 4) return { daysInTank, stage: 'Zoea (approx.)' };
  if (daysInTank <= 7) return { daysInTank, stage: 'Mysis (approx.)' };
  if (daysInTank <= 14) return { daysInTank, stage: 'PL1-PL7 (approx.)' };
  if (daysInTank <= 21) return { daysInTank, stage: 'PL8-PL14 (approx.)' };
  if (daysInTank <= 30) return { daysInTank, stage: 'PL15-PL23 (approx.)' };
  if (daysInTank <= 45) return { daysInTank, stage: 'PL24-PL38 (approx.)' };
  return { daysInTank, stage: 'Juvenile / grow-out (approx.)' };
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

  const stockedAtInput = document.getElementById('stockedAt');
  if (stockedAtInput && !stockedAtInput.value) {
    stockedAtInput.value = toLocalDateString();
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
    [record.tank_name, record.stocked_at, record.food_type_primary, record.food_type_secondary, record.feed_type, record.notes]
      .some((value) => String(value || '').toLowerCase().includes(searchTerm))
  );

  updateMetrics(tankRecords);

  if (filteredRecords.length === 0) {
    recordsContainer.innerHTML = `<div class="empty-state">${searchTerm ? 'No tanks match that search.' : 'No tank maintenance has been logged yet.'}</div>`;
    return;
  }

  recordsContainer.innerHTML = `
    <div class="table-wrap">
      <table class="activity-table">
        <thead>
          <tr><th>Tank</th><th>Days in tank</th><th>Auto stage / size</th><th>Food plan</th><th>Water changed</th><th>Last fed</th><th>Next feed</th><th>Status</th><th>Notes</th></tr>
        </thead>
        <tbody>
          ${filteredRecords.map((record) => {
            const feedState = getFeedState(record.next_feed_due);
            const lifecycle = getLifecycle(record);
            return `<tr>
              <th scope="row" title="${escapeHtml(record.tank_name)}">${escapeHtml(record.tank_name)}</th>
              <td>${lifecycle.daysInTank}</td>
              <td>${lifecycle.stage}</td>
              <td>${escapeHtml(record.food_type_primary || record.feed_type) || 'Not set'}${record.food_type_secondary ? ` + ${escapeHtml(record.food_type_secondary)}` : ''}</td>
              <td>${formatDate(record.water_changed_at)}</td>
              <td>${formatDate(record.last_fed_at)}</td>
              <td>${formatDate(record.next_feed_due)}</td>
              <td><span class="record-status ${feedState.className}">${feedState.label}</span></td>
              <td>${escapeHtml(record.notes) || 'No notes'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
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
    stockedAt: document.getElementById('stockedAt').value,
    foodTypePrimary: document.getElementById('foodTypePrimary').value,
    foodTypeSecondary: document.getElementById('foodTypeSecondary').value,
    waterChangedAt: document.getElementById('waterChangedAt').value,
    lastFedAt: document.getElementById('lastFedAt').value,
    nextFeedDue: document.getElementById('nextFeedDue').value,
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
    showMessage(result.message);
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

function exportCsv() {
  if (tankRecords.length === 0) {
    showMessage('There are no tank records to export yet.', 'error');
    return;
  }

  const headers = ['Tank', 'Stocked at', 'Days in tank', 'Auto stage / size', 'Primary food', 'Second food', 'Water changed', 'Last fed', 'Next feed due', 'Notes'];
  const rows = tankRecords.map((record) => [
    record.tank_name,
    record.stocked_at || '',
    getLifecycle(record).daysInTank,
    getLifecycle(record).stage,
    record.food_type_primary || record.feed_type || '',
    record.food_type_secondary || '',
    record.water_changed_at,
    record.last_fed_at,
    record.next_feed_due || '',
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
