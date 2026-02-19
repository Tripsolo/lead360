interface PpsCircleProps {
  score: number;
  size?: 'sm' | 'md';
}

const sizeConfig = {
  sm: { radius: 14, dim: 36, cx: 18, fontSize: 'text-[10px]' },
  md: { radius: 18, dim: 48, cx: 24, fontSize: 'text-xs' },
};

export const PpsCircle = ({ score, size = 'md' }: PpsCircleProps) => {
  const { radius, dim, cx, fontSize } = sizeConfig[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? 'text-status-hot' : score >= 65 ? 'text-status-warm' : 'text-status-cold';

  return (
    <svg width={dim} height={dim} className={color}>
      <circle cx={cx} cy={cx} r={radius} fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <circle cx={cx} cy={cx} r={radius} fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central"
            className={`fill-current ${fontSize} font-bold`}>{score}</text>
    </svg>
  );
};
