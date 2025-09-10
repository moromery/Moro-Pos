// FIX: Changed React import to a namespace import to resolve "Cannot find namespace 'JSX'" error.
import * as React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: JSX.Element;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
      <div className={`p-4 rounded-full ${color}`}>
        {icon}
      </div>
    </div>
  );
};

export default StatCard;