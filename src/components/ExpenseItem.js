import React from 'react';

function ExpenseItem({ index, expense, onDelete }) {
  return (
    <li className="expense-item">
      {expense.category}: ${expense.value}
      <button onClick={() => onDelete(index)}>Delete</button>
    </li>
  );
}

export default ExpenseItem;
