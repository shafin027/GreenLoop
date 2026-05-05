import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EarningsData {
  day: string;
  earnings: number;
}

export const CollectorEarningsChart: React.FC = () => {
  const [data, setData] = useState<EarningsData[]>([]);

  useEffect(() => {
    fetch('/api/collectors/earnings-chart', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('gl_token')}` }
    })
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold mb-4">Earnings (Last 7 Days)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="earnings" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
