import { Diamond } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  return (
    <span className="flex items-center gap-2">
      <span className={`flex ${box} items-center justify-center rounded-lg bg-primary text-primary-foreground`}>
        <Diamond className="h-1/2 w-1/2" strokeWidth={2.5} />
      </span>
      <span className={`font-display font-extrabold tracking-tight ${size === "sm" ? "text-sm" : "text-xl"}`}>
        PITCH<span className="text-primary">IQ</span>
      </span>
    </span>
  );
}
