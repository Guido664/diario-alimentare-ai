
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './IconComponents';

interface DateNavigatorProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ currentDate, setCurrentDate }) => {
  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  }

  return (
    <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm mb-6">
      <button
        onClick={() => changeDate(-1)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 text-gray-600"
        aria-label="Previous day"
      >
        <ChevronLeftIcon />
      </button>
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-800">
          {currentDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>
        {isToday() && <p className="text-sm text-indigo-600 font-semibold">Oggi</p>}
      </div>
      <button
        onClick={() => changeDate(1)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 text-gray-600"
        aria-label="Next day"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
};

export default DateNavigator;
