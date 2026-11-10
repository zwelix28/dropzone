import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOOR_TIMES = [
  { label: "8:00 pm", h: 20, m: 0 },
  { label: "9:00 pm", h: 21, m: 0 },
  { label: "10:00 pm", h: 22, m: 0 },
  { label: "11:00 pm", h: 23, m: 0 },
  { label: "12:00 am", h: 0, m: 0 },
  { label: "1:00 am", h: 1, m: 0 },
  { label: "2:00 am", h: 2, m: 0 },
];

const END_PRESETS = [
  { id: "none", label: "No end" },
  { id: "4h", label: "+4 hrs" },
  { id: "6h", label: "+6 hrs" },
  { id: "8h", label: "+8 hrs" },
  { id: "6am", label: "Until 6 am" },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

export function toLocalDateTimeValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseLocalDateTimeValue(value) {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function withTime(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function nextWeekday(from, weekday, { allowToday = true } = {}) {
  const d = startOfDay(from);
  let delta = (weekday - d.getDay() + 7) % 7;
  if (delta === 0 && !allowToday) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function formatDayLabel(date) {
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(date) {
  if (!date) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSummary(start, end) {
  if (!start) return "Pick a night and door time";
  const day = formatDayLabel(start);
  const time = formatTimeLabel(start);
  if (!end) return `${day} · doors ${time}`;
  const endDay = sameDay(start, end) ? "" : `${formatDayLabel(end)} · `;
  return `${day} · ${time} → ${endDay}${formatTimeLabel(end)}`;
}

function buildQuickDays(now = new Date()) {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const thisFri = nextWeekday(today, 5, { allowToday: true });
  const thisSat = nextWeekday(today, 6, { allowToday: true });
  const nextFri = new Date(thisFri);
  nextFri.setDate(thisFri.getDate() + 7);
  const nextSat = new Date(thisSat);
  nextSat.setDate(thisSat.getDate() + 7);

  const items = [
    { id: "tonight", label: "Tonight", date: today },
    { id: "tomorrow", label: "Tomorrow", date: tomorrow },
  ];

  if (!sameDay(thisFri, today) && !sameDay(thisFri, tomorrow)) {
    items.push({ id: "fri", label: "This Fri", date: thisFri });
  }
  if (!sameDay(thisSat, today) && !sameDay(thisSat, tomorrow)) {
    items.push({ id: "sat", label: "This Sat", date: thisSat });
  }

  items.push(
    { id: "next-fri", label: "Next Fri", date: nextFri },
    { id: "next-sat", label: "Next Sat", date: nextSat },
  );

  return items;
}

function monthMatrix(viewMonth) {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    const days = [];
    for (let d = 0; d < 7; d += 1) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      days.push(cell);
    }
    weeks.push(days);
  }
  return weeks;
}

function applyEndPreset(start, presetId) {
  if (!start || presetId === "none") return null;
  if (presetId === "6am") {
    const end = withTime(start, 6, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
    return end;
  }
  const hours = presetId === "4h" ? 4 : presetId === "6h" ? 6 : presetId === "8h" ? 8 : 0;
  if (!hours) return null;
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

function inferEndPreset(start, end) {
  if (!end) return "none";
  for (const preset of END_PRESETS) {
    if (preset.id === "none") continue;
    const candidate = applyEndPreset(start, preset.id);
    if (candidate && Math.abs(candidate.getTime() - end.getTime()) < 60_000) return preset.id;
  }
  return "custom";
}

/**
 * Club-night date/time picker.
 * Value format matches datetime-local: YYYY-MM-DDTHH:mm (local).
 */
export default function EventDateTimePicker({
  startValue = "",
  endValue = "",
  onChange,
  disabled = false,
  optionalEnd = true,
}) {
  const start = parseLocalDateTimeValue(startValue);
  const end = parseLocalDateTimeValue(endValue);
  const today = useMemo(() => startOfDay(new Date()), []);
  const quickDays = useMemo(() => buildQuickDays(), []);

  const [viewMonth, setViewMonth] = useState(() => startOfDay(start || new Date()));
  const [endPreset, setEndPreset] = useState(() => inferEndPreset(start, end));

  useEffect(() => {
    if (start) setViewMonth(startOfDay(start));
  }, [startValue]);

  useEffect(() => {
    setEndPreset(inferEndPreset(start, end));
  }, [startValue, endValue]);

  const weeks = useMemo(() => monthMatrix(viewMonth), [viewMonth]);

  const emit = (nextStart, nextEnd) => {
    onChange?.({
      startsAt: nextStart ? toLocalDateTimeValue(nextStart) : "",
      endsAt: nextEnd ? toLocalDateTimeValue(nextEnd) : "",
    });
  };

  const setStartDate = (date) => {
    if (disabled) return;
    const next = withTime(date, start?.getHours() ?? 22, start?.getMinutes() ?? 0);
    let nextEnd = end;
    if (endPreset !== "none" && endPreset !== "custom") {
      nextEnd = applyEndPreset(next, endPreset);
    } else if (nextEnd && nextEnd <= next) {
      nextEnd = null;
      setEndPreset("none");
    }
    emit(next, nextEnd);
  };

  const setStartTime = (h, m) => {
    if (disabled) return;
    const base = start || today;
    const next = withTime(base, h, m);
    let nextEnd = end;
    if (endPreset !== "none" && endPreset !== "custom") {
      nextEnd = applyEndPreset(next, endPreset);
    } else if (nextEnd && nextEnd <= next) {
      nextEnd = null;
      setEndPreset("none");
    }
    emit(next, nextEnd);
  };

  const setEndFromPreset = (presetId) => {
    if (disabled) return;
    setEndPreset(presetId);
    if (!start) {
      emit("", "");
      return;
    }
    emit(start, applyEndPreset(start, presetId));
  };

  const shiftMonth = (delta) => {
    const next = new Date(viewMonth);
    next.setMonth(next.getMonth() + delta);
    setViewMonth(startOfDay(next));
  };

  const activeTime = start
    ? DOOR_TIMES.find((t) => t.h === start.getHours() && t.m === start.getMinutes())
    : null;

  return (
    <div className={`event-dt${disabled ? " is-disabled" : ""}`}>
      <div className="event-dt-summary" aria-live="polite">
        {formatSummary(start, end)}
      </div>

      <div className="event-dt-block">
        <div className="event-dt-label">Night</div>
        <div className="event-dt-chips" role="list">
          {quickDays.map((day) => {
            const on = start && sameDay(start, day.date);
            return (
              <button
                key={day.id}
                type="button"
                role="listitem"
                className={`event-dt-chip${on ? " is-on" : ""}`}
                disabled={disabled}
                onClick={() => setStartDate(day.date)}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="event-dt-calendar">
        <div className="event-dt-cal-head">
          <button
            type="button"
            className="event-dt-nav"
            aria-label="Previous month"
            disabled={disabled}
            onClick={() => shiftMonth(-1)}
          >
            ‹
          </button>
          <div className="event-dt-cal-title">
            {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </div>
          <button
            type="button"
            className="event-dt-nav"
            aria-label="Next month"
            disabled={disabled}
            onClick={() => shiftMonth(1)}
          >
            ›
          </button>
        </div>
        <div className="event-dt-cal-weekdays" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="event-dt-cal-grid">
          {weeks.flat().map((day) => {
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const isPast = day < today;
            const isToday = sameDay(day, today);
            const isSelected = start && sameDay(start, day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={[
                  "event-dt-day",
                  inMonth ? "" : " is-out",
                  isToday ? " is-today" : "",
                  isSelected ? " is-on" : "",
                ].join("")}
                disabled={disabled || isPast}
                onClick={() => setStartDate(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="event-dt-block">
        <div className="event-dt-label">Doors</div>
        <div className="event-dt-chips" role="list">
          {DOOR_TIMES.map((slot) => {
            const on = Boolean(activeTime && activeTime.h === slot.h && activeTime.m === slot.m);
            return (
              <button
                key={slot.label}
                type="button"
                role="listitem"
                className={`event-dt-chip${on ? " is-on" : ""}`}
                disabled={disabled}
                onClick={() => setStartTime(slot.h, slot.m)}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
        <div className="event-dt-custom-time">
          <label>
            <span>Hour</span>
            <select
              className="inp"
              disabled={disabled}
              value={start ? String(start.getHours()) : "22"}
              onChange={(e) => setStartTime(Number(e.target.value), start?.getMinutes() ?? 0)}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {pad(h)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Min</span>
            <select
              className="inp"
              disabled={disabled}
              value={start ? String(start.getMinutes()) : "0"}
              onChange={(e) => setStartTime(start?.getHours() ?? 22, Number(e.target.value))}
            >
              {Array.from(
                new Set([0, 15, 30, 45, start ? start.getMinutes() : 0]),
              )
                .sort((a, b) => a - b)
                .map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      {optionalEnd ? (
        <div className="event-dt-block">
          <div className="event-dt-label">Ends</div>
          <div className="event-dt-chips" role="list">
            {END_PRESETS.map((preset) => {
              const on = endPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="listitem"
                  className={`event-dt-chip${on ? " is-on" : ""}`}
                  disabled={disabled || (!start && preset.id !== "none")}
                  onClick={() => setEndFromPreset(preset.id)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
