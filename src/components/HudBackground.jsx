/**
 * Minimalist ambient background: soft dark gradient with slowly drifting blurred colour orbs.
 * Respects `prefers-reduced-motion` via CSS.
 */
export default function HudBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-orb orb-1" />
      <div className="ambient-orb orb-2" />
      <div className="ambient-orb orb-3" />
    </div>
  );
}
