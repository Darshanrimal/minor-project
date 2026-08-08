import React from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  as: Component = "button",
  ...props
}) {
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
    success: "btn-success",
  }[variant] || "btn-primary";

  const componentProps = Component === "button" ? { type: "button", ...props } : props;

  return (
    <Component className={["btn", variantClass, sizeClass, className].filter(Boolean).join(" ")} {...componentProps}>
      {children}
    </Component>
  );
}
