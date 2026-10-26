import type { ReactNode } from "react";

export function SectionLabel({
  id,
  as: Tag = "h2",
  children,
}: {
  id?: string;
  as?: "h2" | "span";
  children: ReactNode;
}) {
  return (
    <Tag id={id} className="block text-xs font-semibold tracking-[0.04em] text-muted uppercase">
      {children}
    </Tag>
  );
}
