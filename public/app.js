const form = document.getElementById('tank-form');
const recordsContainer = document.getElementById('records');

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

async function loadTankRecords() {
  try {
    const response = await fetch('/api/tanks');
    const records = await response.json();

    if (!Array.isArray(records) || records.length === 0) {
      recordsContainer.innerHTML = '<div class="empty-state">No tank maintenance has been logged yet.</div>';
      return;
    }

    recordsContainer.innerHTML = records
      .map(
        (record) => `
          <article class="record-card">
            <div class="record-header">
              <h3>${record.tank_name}</h3>
              <span>${formatDate(record.created_at)}</span>
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
                <span>${record.feed_type}</span>
              </div>
            </div>
            <p><strong>Notes:</strong> ${record.notes ? record.notes : 'No additional notes.'}</p>
          </article>
        `
      )
      .join('');
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

refreshCurrentTimes();
setDefaultDates();
loadTankRecords();
