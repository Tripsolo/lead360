import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus, Flame, Sun, Snowflake } from 'lucide-react';
import { Lead } from '@/types/lead';

interface SummaryCardsProps {
  leads: Lead[];
  onFilterChange: (category: 'Upgraded' | 'Downgraded' | 'Unchanged' | 'Hot' | 'Warm' | 'Cold' | null) => void;
  activeFilter: string | null;
}

const ratingOrder: Record<string, number> = { 'hot': 3, 'warm': 2, 'cold': 1 };

const getRatingValue = (rating?: string) => ratingOrder[String(rating || '').toLowerCase()] || 0;

export const SummaryCards = ({ leads, onFilterChange, activeFilter }: SummaryCardsProps) => {
  const hasAiRatings = leads.some(l => l.rating);

  if (!hasAiRatings) {
    // CRM-only mode: Hot / Warm / Cold based on managerRating
    const total = leads.length;
    const hotCount = leads.filter(l => l.managerRating?.toLowerCase() === 'hot').length;
    const warmCount = leads.filter(l => l.managerRating?.toLowerCase() === 'warm').length;
    const coldCount = leads.filter(l => l.managerRating?.toLowerCase() === 'cold').length;

    const pct = (count: number) => total > 0 ? ((count / total) * 100).toFixed(1) : '0';

    const cardData = [
      {
        category: 'Hot' as const,
        count: hotCount,
        percentage: pct(hotCount),
        icon: Flame,
        color: 'bg-status-hot',
        borderColor: activeFilter === 'Hot' ? 'border-status-hot border-2' : 'border-border',
      },
      {
        category: 'Warm' as const,
        count: warmCount,
        percentage: pct(warmCount),
        icon: Sun,
        color: 'bg-status-warm',
        borderColor: activeFilter === 'Warm' ? 'border-status-warm border-2' : 'border-border',
      },
      {
        category: 'Cold' as const,
        count: coldCount,
        percentage: pct(coldCount),
        icon: Snowflake,
        color: 'bg-status-cold',
        borderColor: activeFilter === 'Cold' ? 'border-status-cold border-2' : 'border-border',
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cardData.map(({ category, count, percentage, icon: Icon, color, borderColor }) => (
          <Card
            key={category}
            className={`cursor-pointer transition-all ${borderColor} hover:shadow-md`}
            onClick={() => onFilterChange(activeFilter === category ? null : category)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">{category}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-xs text-muted-foreground ml-1">{percentage}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // AI-analyzed mode: Upgraded / Downgraded / Unchanged
  const leadsWithBoth = leads.filter(l => l.rating && l.managerRating);
  const total = leadsWithBoth.length;

  const upgradedCount = leadsWithBoth.filter(l => getRatingValue(l.rating) > getRatingValue(l.managerRating)).length;
  const downgradedCount = leadsWithBoth.filter(l => getRatingValue(l.rating) < getRatingValue(l.managerRating)).length;
  const unchangedCount = leadsWithBoth.filter(l => getRatingValue(l.rating) === getRatingValue(l.managerRating)).length;

  const pct = (count: number) => total > 0 ? ((count / total) * 100).toFixed(1) : '0';

  const cardData = [
    {
      category: 'Upgraded' as const,
      count: upgradedCount,
      percentage: pct(upgradedCount),
      icon: ArrowUp,
      color: 'bg-status-hot',
      borderColor: activeFilter === 'Upgraded' ? 'border-status-hot border-2' : 'border-border',
    },
    {
      category: 'Downgraded' as const,
      count: downgradedCount,
      percentage: pct(downgradedCount),
      icon: ArrowDown,
      color: 'bg-status-cold',
      borderColor: activeFilter === 'Downgraded' ? 'border-status-cold border-2' : 'border-border',
    },
    {
      category: 'Unchanged' as const,
      count: unchangedCount,
      percentage: pct(unchangedCount),
      icon: Minus,
      color: 'bg-status-warm',
      borderColor: activeFilter === 'Unchanged' ? 'border-status-warm border-2' : 'border-border',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cardData.map(({ category, count, percentage, icon: Icon, color, borderColor }) => (
        <Card
          key={category}
          className={`cursor-pointer transition-all ${borderColor} hover:shadow-md`}
          onClick={() => onFilterChange(activeFilter === category ? null : category)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-semibold">{category}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">{count}</span>
                <span className="text-xs text-muted-foreground ml-1">{percentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
