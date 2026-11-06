import type { PipelineStage, Priority, WebsiteStatus } from "@prisma/client";
import { STAGE_COLOR, STAGE_LABEL, WEBSITE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span
      title={`Prioritate ${p}`}
      className={cn(
        "inline-grid h-6 w-6 shrink-0 place-items-center rounded-md font-display text-xs font-extrabold",
        p === "A" && "bg-gold text-navy",
        p === "B" && "bg-gold/20 text-gold-hi",
        p === "C" && "bg-navy-700 text-ink-muted",
      )}
    >
      {p}
    </span>
  );
}

export function StageBadge({ s }: { s: PipelineStage }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold">
      <i className="h-2 w-2 rounded-full" style={{ background: STAGE_COLOR[s] }} aria-hidden />
      {STAGE_LABEL[s]}
    </span>
  );
}

export function WebsiteBadge({ w }: { w: WebsiteStatus }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded px-1.5 py-0.5 text-[15px]",
        (w === "FARA_SITE" || w === "DOAR_PLATFORME") && "bg-ok/15 text-[#7FD8B4]",
        w === "ARE_SITE_PROPRIU" && "bg-navy-700 text-ink-muted",
        w === "NECUNOSCUT" && "bg-warn/15 text-warn",
      )}
    >
      {WEBSITE_LABEL[w]}
    </span>
  );
}

export function OptOutBadge() {
  return <span className="whitespace-nowrap rounded bg-danger/15 px-1.5 py-0.5 text-[15px] text-[#F2A49D]">Nu mai contacta</span>;
}
