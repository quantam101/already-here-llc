'use client';

import { useState, type MouseEvent } from 'react';
import {
  formatRFQTimeline,
  validateRFQTimeline,
  type RFQTimelineMode,
  type RFQTimelineSelection
} from '@/lib/rfq-timeline';

const inputClass = 'link-ring mt-2 block w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-base text-ink';
const choiceClass = 'flex cursor-pointer items-center gap-2 rounded-xl border border-borderBrand bg-white px-3 py-3 text-sm font-medium text-navy';

const modes: { value: RFQTimelineMode; label: string }[] = [
  { value: 'exact', label: 'Specific date & time' },
  { value: 'window', label: 'Start–end period' },
  { value: 'deadline', label: 'Bid deadline' }
];

function openNativePicker(event: MouseEvent<HTMLInputElement>) {
  // showPicker opens Android/iOS/desktop native date and time pickers where supported.
  // The native input stays usable on browsers that do not implement showPicker.
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Browsers may limit programmatic picker opening; clicking the input still works.
  }
}

export function RFQTimelinePicker() {
  const [selection, setSelection] = useState<RFQTimelineSelection>({
    mode: 'exact',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: ''
  });
  const [touched, setTouched] = useState(false);
  const error = validateRFQTimeline(selection);
  const summary = formatRFQTimeline(selection);

  function update(change: Partial<RFQTimelineSelection>) {
    setSelection((previous) => ({ ...previous, ...change }));
    setTouched(true);
  }

  return (
    <fieldset className="min-w-0 rounded-2xl border border-borderBrand bg-soft p-4 sm:p-5 md:col-span-2">
      <legend className="px-2 text-sm font-semibold text-navy">
        Timeline / bid deadline <span className="text-action" aria-label="required">*</span>
      </legend>
      <p className="mb-4 text-sm text-slate-600">
        Select the date from the calendar. Choose a time, or select a start–end period for a multi-day project.
      </p>
      <div role="radiogroup" aria-label="Timeline type" className="grid gap-2 sm:grid-cols-3">
        {modes.map((mode) => (
          <label key={mode.value} className={choiceClass + (selection.mode === mode.value ? ' border-action ring-1 ring-action' : '')}>
            <input
              type="radio"
              name="timelineMode"
              value={mode.value}
              checked={selection.mode === mode.value}
              onChange={() => update({ mode: mode.value })}
              className="accent-blue-600"
            />
            {mode.label}
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-medium text-navy" htmlFor="rfq-timeline-start-date">
          {selection.mode === 'deadline' ? 'Bid due date' : selection.mode === 'window' ? 'Start date' : 'Project start date'} *
          <input
            id="rfq-timeline-start-date"
            name="timelineStartDate"
            type="date"
            required
            value={selection.startDate}
            onChange={(event) => update({ startDate: event.target.value })}
            onClick={openNativePicker}
            aria-describedby="rfq-timeline-instructions"
            className={inputClass}
          />
        </label>
        {selection.mode !== 'window' ? (
          <label className="min-w-0 text-sm font-medium text-navy" htmlFor="rfq-timeline-start-time">
            {selection.mode === 'deadline' ? 'Bid due time' : 'Project start time'} *
            <input
              id="rfq-timeline-start-time"
              name="timelineStartTime"
              type="time"
              required
              value={selection.startTime}
              onChange={(event) => update({ startTime: event.target.value })}
              onClick={openNativePicker}
              className={inputClass}
            />
          </label>
        ) : (
          <>
            <label className="min-w-0 text-sm font-medium text-navy" htmlFor="rfq-timeline-end-date">
              End date *
              <input
                id="rfq-timeline-end-date"
                name="timelineEndDate"
                type="date"
                required
                min={selection.startDate || undefined}
                value={selection.endDate}
                onChange={(event) => update({ endDate: event.target.value })}
                onClick={openNativePicker}
                className={inputClass}
              />
            </label>
            <label className="min-w-0 text-sm font-medium text-navy" htmlFor="rfq-timeline-window-start-time">
              Start time <span className="font-normal text-slate-500">(optional)</span>
              <input
                id="rfq-timeline-window-start-time"
                name="timelineStartTime"
                type="time"
                value={selection.startTime}
                onChange={(event) => update({ startTime: event.target.value })}
                onClick={openNativePicker}
                className={inputClass}
              />
            </label>
            <label className="min-w-0 text-sm font-medium text-navy" htmlFor="rfq-timeline-window-end-time">
              End time <span className="font-normal text-slate-500">(optional)</span>
              <input
                id="rfq-timeline-window-end-time"
                name="timelineEndTime"
                type="time"
                value={selection.endTime}
                onChange={(event) => update({ endTime: event.target.value })}
                onClick={openNativePicker}
                className={inputClass}
              />
            </label>
          </>
        )}
      </div>
      <p id="rfq-timeline-instructions" className="mt-3 text-xs text-slate-600">
        Dates and times are in the project/site&apos;s local time. For an all-day period, leave both time fields blank.
        Selecting a date does not book an appointment.
      </p>
      <input name="timeline" type="hidden" value={summary} readOnly />
      {summary ? (
        <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-borderBrand bg-white px-4 py-3 text-sm font-semibold text-navy">
          Selected: {summary}
        </p>
      ) : touched && error ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-amber-800">{error}</p>
      ) : null}
    </fieldset>
  );
}
