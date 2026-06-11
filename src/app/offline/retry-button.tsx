"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <Button
      type="button"
      size="lg"
      className="h-11"
      onClick={() => window.location.reload()}
    >
      <RotateCw /> Reintentar
    </Button>
  );
}
