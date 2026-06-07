import type { ReactNode } from "react";
import { Leaf } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <Leaf className="size-7" />
        <span className="text-2xl font-semibold tracking-tight">Vital360</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
