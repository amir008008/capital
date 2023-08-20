import React from 'react';

function EstimatedBudget({ estimatedBudget, onBudgetChange }) {
  return (
    <div className="estimated-budget">
      <h2>Step 1: Estimated Budget</h2>
      <input
        type="number"
        value={estimatedBudget}
        onChange={(e) => onBudgetChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default EstimatedBudget;
