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
    [record.tank_name, record.prawn_stage, record.food_type_primary, record.food_type_secondary, record.feed_type, record.notes]
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
          <tr><th>Tank</th><th>Stage / size</th><th>Food plan</th><th>Water changed</th><th>Last fed</th><th>Next feed</th><th>Status</th><th>Notes</th></tr>
        </thead>
        <tbody>
          ${filteredRecords.map((record) => {
            const feedState = getFeedState(record.next_feed_due);
            return `<tr>
              <th scope="row">${escapeHtml(record.tank_name)}</th>
              <td>${escapeHtml(record.prawn_stage) || 'Not set'}</td>
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
    prawnStage: document.getElementById('prawnStage').value,
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

  const headers = ['Tank', 'Prawn stage / size', 'Primary food', 'Second food', 'Water changed', 'Last fed', 'Next feed due', 'Notes'];
  const rows = tankRecords.map((record) => [
    record.tank_name,
    record.prawn_stage || '',
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
