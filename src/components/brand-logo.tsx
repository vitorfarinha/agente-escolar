import { GraduationCap } from "lucide-react";

export function BrandLogo({ withWordmark = true, size = "md" }: { withWordmark?: boolean; size?: "sm" | "md" }) {
  const iconBox = size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl";
  const iconSize = size === "sm" ? 18 : 22;

  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex ${iconBox} shrink-0 items-center justify-center bg-brand-900 text-white`}>
        <GraduationCap size={iconSize} aria-hidden="true" />
      </span>
      {withWordmark && <span className="text-base font-bold text-primary">Agente Escolar</span>}
    </div>
  );
}
