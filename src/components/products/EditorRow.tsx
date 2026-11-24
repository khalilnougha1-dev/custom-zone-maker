import { type ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function EditorRow({ label, children, alignTop = false, expanded = false }: {
  label: string;
  children: ReactNode;
  alignTop?: boolean;
  expanded?: boolean;
}) {
  return (
    <div className={`grid min-w-0 gap-3 py-3 ${expanded ? "grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)]" : "grid-cols-[6.5rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)]"} ${alignTop ? "items-start" : "items-center"}`}>
      <Label className="min-w-0 text-right leading-6 text-muted-foreground font-semibold">{label}</Label>
      <div className="flex min-w-0 justify-end [&>input]:min-w-0 [&>input]:max-w-full [&>textarea]:min-w-0 [&>textarea]:max-w-full">{children}</div>
    </div>
  );
}