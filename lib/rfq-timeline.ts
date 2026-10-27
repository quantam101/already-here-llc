export type RFQTimelineMode = 'exact' | 'window' | 'deadline';

export interface RFQTimelineSelection {
  mode: RFQTimelineMode;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

// HTML date and time inputs return local wall-clock strings without a timezone.
// Keep them as entered: an RFQ date is the site's local time, not a UTC appointment.
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2100) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validateRFQTimeline(value: RFQTimelineSelection): string | null {
  if (!['exact', 'window', 'deadline'].includes(value.mode)) return 'Select a timeline type.';
  if (!validDate(value.startDate)) return 'Choose a valid date using the calendar.';
  if (value.mode === 'exact' && !validTime(value.startTime)) {
    return 'Choose the project start time.';
  }
  if (value.mode === 'deadline' && !validTime(value.startTime)) {
    return 'Choose the bid deadline time.';
  }
  if (value.mode === 'window') {
    if (!validDate(value.endDate)) return 'Choose the end date of your project window.';
    if (value.endDate < value.startDate) {
      return 'The project window must end on or after its start date.';
    }
    if (Boolean(value.startTime) !== Boolean(value.endTime)) {
      return 'Choose both start and end times, or leave both blank for an all-day window.';
    }
    if (value.startTime && (!validTime(value.startTime) || !validTime(value.endTime))) {
      return 'Choose valid start and end times.';
    }
    if (value.startDate === value.endDate && value.startTime &&
        value.endTime <= value.startTime) {
      return 'For a single-day project window, the end time must be after the start time.';
    }
  }
  return null;
}

function displayDate(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function displayTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return String(hour12) + ':' + String(minute).padStart(2, '0') + ' ' + suffix;
}

export function formatRFQTimeline(value: RFQTimelineSelection): string {
  if (validateRFQTimeline(value)) return '';
  const date = displayDate(value.startDate);
  if (value.mode === 'exact') {
    return 'Target project start: ' + date + ' at ' + displayTime(value.startTime) + ' (project/site local time)';
  }
  if (value.mode === 'deadline') {
    return 'Bid deadline: ' + date + ' at ' + displayTime(value.startTime) + ' (project/site local time)';
  }
  const start = date + (value.startTime ? ' at ' + displayTime(value.startTime) : '');
  const end = displayDate(value.endDate) + (value.endTime ? ' at ' + displayTime(value.endTime) : '');
  return 'Project rollout window: ' + start + ' through ' + end +
    (value.startTime ? ' (project/site local time)' : ' (all-day dates)');
}
