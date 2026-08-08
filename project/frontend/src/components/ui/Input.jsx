import React from "react";

export default function Input({
  label,
  hint,
  error,
  as = "input",
  className = "",
  id,
  ...props
}) {
  const fieldId = id || props.name;
  const Component = as;

  return (
    <label className="form-group" htmlFor={fieldId}>
      {label ? <span className="form-label">{label}</span> : null}
      <Component
        id={fieldId}
        className={["form-input", error ? "form-input-error" : "", className].filter(Boolean).join(" ")}
        {...props}
      />
      {error ? <span className="field-feedback field-feedback-error">{error}</span> : null}
      {!error && hint ? <span className="field-feedback">{hint}</span> : null}
    </label>
  );
}
