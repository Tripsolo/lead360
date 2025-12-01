import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Thermometer, Snowflake } from 'lucide-react';
import { Lead } from '@/types/lead';

interface SummaryCardsProps {
  leads: Lead[];
  onFilterChange: (rating: 'Hot' | 'Warm' | 'Cold' | null) => void;
  activeFilter: string | null;
}

export const SummaryCards = ({ leads, onFilterChange, activeFilter }: SummaryCardsProps) => {
  // Use AI rating if available (from cache), otherwise use manager rating
  const hotCount = leads.filter(l => (l.rating || l.managerRating) === 'Hot').length;
  const warmCount = leads.filter(l => (l.rating || l.managerRating) === 'Warm').length;
  const coldCount = leads.filter(l => (l.rating || l.managerRating) === 'Cold').length;
  const total = leads.length;

  const hotPercentage = total > 0 ? ((hotCount / total) * 100).toFixed(1) : '0';
  const warmPercentage = total > 0 ? ((warmCount / total) * 100).toFixed(1) : '0';
  const coldPercentage = total > 0 ? ((coldCount / total) * 100).toFixed(1) : '0';

  const cardData = [
    {
      rating: 'Hot' as const,
      count: hotCount,
      percentage: hotPercentage,
      icon: TrendingUp,
      color: 'bg-status-hot',
      hoverColor: 'hover:bg-status-hot/90',
      borderColor: activeFilter === 'Hot' ? 'border-status-hot border-2' : 'border-border'
    },
    {
      rating: 'Warm' as const,
      count: warmCount,
      percentage: warmPercentage,
      icon: Thermometer,
      color: 'bg-status-warm',
      hoverColor: 'hover:bg-status-warm/90',
      borderColor: activeFilter === 'Warm' ? 'border-status-warm border-2' : 'border-border'
    },
    {
      rating: 'Cold' as const,
      count: coldCount,
      percentage: coldPercentage,
      icon: Snowflake,
      color: 'bg-status-cold',
      hoverColor: 'hover:bg-status-cold/90',
      borderColor: activeFilter === 'Cold' ? 'border-status-cold border-2' : 'border-border'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cardData.map(({ rating, count, percentage, icon: Icon, color, hoverColor, borderColor }) => (
        <Card
          key={rating}
          className={`cursor-pointer transition-all ${borderColor} ${hoverColor}`}
          onClick={() => onFilterChange(activeFilter === rating ? null : rating)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${color} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{percentage}%</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold">{rating} Leads</h3>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
