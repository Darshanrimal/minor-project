import React from "react";

export default function Card({
  children,
  className = "",
  padding = "md",
  title,
  description,
  action,
}) {
  const paddingClass = {
    none: "",
    sm: "ui-card-pad-sm",
    md: "ui-card-pad-md",
    lg: "ui-card-pad-lg",
  }[padding] || "ui-card-pad-md";

  return (
    <section className={["card", "ui-card", paddingClass, className].filter(Boolean).join(" ")}>
      {(title || description || action) && (
        <header className="ui-card-header">
          <div>
            {title ? <h3 className="ui-card-title">{title}</h3> : null}
            {description ? <p className="ui-card-description">{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
