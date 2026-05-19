export interface ChartData {
  id: string;
  name: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: ChartData[];
  config: {
    title: string;
  };
  className?: string;
  loading?: boolean;
}
