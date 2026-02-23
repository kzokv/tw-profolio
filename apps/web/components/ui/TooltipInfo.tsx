"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { CircleHelp } from "lucide-react";

interface TooltipInfoProps {
  label: string;
  content: string;
  triggerTestId?: string;
  contentTestId?: string;
}

export function TooltipInfo({ label, content, triggerTestId, contentTestId }: TooltipInfoProps) {
  return (
    <Tooltip.Provider delayDuration={180}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-[#e9dcc4] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            data-testid={triggerTestId}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-[60] max-w-xs rounded-md border border-line bg-surface px-3 py-2 text-xs text-ink shadow-card"
            data-testid={contentTestId}
          >
            {content}
            <Tooltip.Arrow className="fill-surface" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
