import { formations, type SquadState, type Chemistry } from "@/lib/squad";
import { SlotChip } from "./SlotChip";

export function Pitch({
  squad,
  chem,
  onSlot,
  onDragStart,
}: {
  squad: SquadState;
  chem: Chemistry;
  onSlot: (slotId: string) => void;
  onDragStart?: (slotId: string, e: React.PointerEvent) => void;
}) {
  const nodes = formations[squad.formation];

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_50%_0%,oklch(0.32_0.07_162),oklch(0.18_0.04_162)_55%,oklch(0.12_0.03_170))] shadow-[0_30px_80px_-40px_oklch(0.72_0.16_162/0.8)]">
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 46px)",
        }}
      />
      <svg viewBox="0 0 100 133" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5">
          <rect x="3" y="3" width="94" height="127" rx="1.5" />
          <line x1="3" y1="66.5" x2="97" y2="66.5" />
          <circle cx="50" cy="66.5" r="12" />
          <rect x="22" y="3" width="56" height="18" />
          <rect x="35" y="3" width="30" height="8" />
          <rect x="22" y="112" width="56" height="18" />
          <rect x="35" y="122" width="30" height="8" />
        </g>
        <circle cx="50" cy="66.5" r="1" fill="rgba(255,255,255,0.5)" />
      </svg>

      {nodes.map((node) => {
        const pid = squad.starters[node.id] ?? null;
        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <SlotChip
              slotId={node.id}
              role={node.role}
              playerId={pid}
              chem={pid ? chem.perPlayer[pid] : undefined}
              compact
              onClick={() => onSlot(node.id)}
              {...(onDragStart ? { onDragStart } : {})}
            />
          </div>
        );
      })}
    </div>
  );
}
