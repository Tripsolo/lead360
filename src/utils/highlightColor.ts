export const getHighlightColor = (value: unknown): string => {
  const v = String(value || '').toLowerCase();
  if (['a', 'a+', 'high', 'premium', 'affluent', 'hot', 'p0'].some(k => v.includes(k) || v === k)) return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (['b', 'medium', 'mid', 'moderate', 'warm', 'p1', 'popular'].some(k => v.includes(k) || v === k)) return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  if (['c', 'd', 'low', 'cold', 'p2', 'affordable'].some(k => v.includes(k) || v === k)) return 'bg-red-500/15 text-red-700 border-red-500/30';
  return 'bg-muted text-muted-foreground border-border';
};
