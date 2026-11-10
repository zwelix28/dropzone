import { GENRES } from "../constants/genres.js";

/**
 * Same genre control as registration: horizontal chip slider on mobile,
 * native <select> on desktop (see .auth-genre CSS).
 */
export default function GenrePicker({
  value,
  onChange,
  label = "Genre",
  name = "genre",
  id = "genre-picker",
}) {
  return (
    <fieldset className="auth-genre">
      <legend className="auth-label">{label}</legend>
      <div className="auth-genre-slider" role="radiogroup" aria-label={label}>
        {GENRES.map((g) => {
          const selected = value === g;
          return (
            <label key={g} className={`auth-genre-chip${selected ? " is-on" : ""}`}>
              <input
                type="radio"
                name={name}
                value={g}
                checked={selected}
                onChange={() => onChange?.(g)}
              />
              <span>{g}</span>
            </label>
          );
        })}
      </div>
      <select
        id={id}
        className="inp auth-genre-select"
        value={value}
        aria-label={label}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {GENRES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </fieldset>
  );
}
