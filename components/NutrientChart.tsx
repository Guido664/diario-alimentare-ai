
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { NutrientAnalysis } from '../types';

interface NutrientChartProps {
  analysis: NutrientAnalysis;
}

const NutrientChart: React.FC<NutrientChartProps> = ({ analysis }) => {
  const data = [
    { name: 'Proteine (g)', value: analysis.protein, fill: '#f0fdf4' },
    { name: 'Carboidrati (g)', value: analysis.carbs, fill: '#fefce8' },
    { name: 'Grassi (g)', value: analysis.fats, fill: '#fef2f2' },
  ];

  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
          <YAxis tick={{ fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
            }}
          />
          <Bar dataKey="value" barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NutrientChart;
