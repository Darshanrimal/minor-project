import React from "react";

export function Spinner({ label = "Loading..." }) {
  return (
    <div className="loader-wrap" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span className="loader-label">{label}</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card ui-card ui-card-pad-md">
      <div className="skeleton" style={{ height: 18, width: "42%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 24, width: "72%", marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 10, width: "100%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 10, width: "64%" }} />
    </div>
  );
}

export default function Loader({ rows = 3, label = "Loading..." }) {
  return (
    <div className="loader-stack" aria-live="polite">
      <Spinner label={label} />
      <div className="grid-cards">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
