import React from 'react';

function MonthSelector({ selectedMonth, onMonthChange }) {
  const months = ['June', 'July', 'August']; // Add more months here

  return (
    <div className="month-selector">
      {months.map((month) => (
        <button
          key={month}
          className={selectedMonth === month ? 'selected' : ''}
          onClick={() => onMonthChange(month)}
        >
          {month}
        </button>
      ))}
    </div>
  );
}

export default MonthSelector;
