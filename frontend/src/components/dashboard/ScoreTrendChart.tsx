import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card } from '../ui/Card';

export type ScoreTrendChartProps = {
  data: Array<{ date: string; score: number }>;
};

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <div className="flex h-64 items-center justify-center">
          <p className="text-[13px] text-ink-3">Not enough data for a trend chart.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-[15px] font-medium text-ink-0">Score trend</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.45)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="rgba(255,255,255,0.45)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0B0B0B', borderColor: 'rgba(255,255,255,0.16)', color: '#FFFFFF' }}
              itemStyle={{ color: '#22D3EE' }}
              cursor={{ stroke: 'rgba(255,255,255,0.16)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Overall Score"
              stroke="#06B6D4"
              strokeWidth={2}
              dot={{ r: 3, fill: '#000000', stroke: '#22D3EE', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#22D3EE' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
