type WaterSurfaceVariant = 'soft' | 'painterly' | 'animated';

interface HubWaterBackgroundProps {
  variant?: WaterSurfaceVariant;
}

export function HubWaterBackground({ variant = 'painterly' }: HubWaterBackgroundProps) {
  return (
    <div className={`hub-water-bg hub-water-bg--${variant}`} aria-hidden="true">
      <div className="hub-water-bg__wash hub-water-bg__wash--base" />
      <div className="hub-water-bg__wash hub-water-bg__wash--mist" />
      <div className="hub-water-bg__wash hub-water-bg__wash--depth" />
      <div className="hub-water-bg__wave-layer hub-water-bg__wave-layer--near" />
      <div className="hub-water-bg__wave-layer hub-water-bg__wave-layer--far" />
      {variant !== 'soft' && (
        <div className="hub-water-bg__paper">
          <div className="hub-water-bg__paper-grain" />
          <div className="hub-water-bg__paper-fade" />
        </div>
      )}
      {variant === 'animated' && (
        <>
          <div className="hub-water-bg__drift hub-water-bg__drift--one" />
          <div className="hub-water-bg__drift hub-water-bg__drift--two" />
        </>
      )}
    </div>
  );
}
