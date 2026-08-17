/**
 * Semi-circle score gauge used on the report screen ("나의 유창성") and the
 * shadowing-practice result screen ("종합 점수"). `value` is 0-100, or
 * `undefined` for the locked "?" pre-review state.
 */
export function ScoreGauge({
  value,
  label,
  size = 160,
}: {
  value?: number;
  label?: string;
  size?: number;
}) {
  const radius = size / 2 - 10;
  const circumference = Math.PI * radius;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path
          d={`M 10 ${size / 2 + 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 2}`}
          fill="none"
          stroke="currentColor"
          className="text-ink-800"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {value != null && (
          <path
            d={`M 10 ${size / 2 + 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 2}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        )}
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ecefe9" />
            <stop offset="100%" stopColor="#35d68c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="-mt-6 text-center">
        <div className="text-2xl font-bold">{value == null ? "?" : `${value}%`}</div>
        {label && <div className="text-xs text-ink-400">{label}</div>}
      </div>
    </div>
  );
}
