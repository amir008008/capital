import React, { useState } from 'react';

function AddExpenseForm({ onExpenseAdd }) {
  const [category, setCategory] = useState('');
  const [value, setValue] = useState('');

  const handleAddExpense = () => {
    if (category && value) {
      const newExpense = { category, value: parseFloat(value) };
      onExpenseAdd(newExpense);
      setCategory('');
      setValue('');
    }
  };

  return (
    <div className="add-expense-form">
      <input
        type="text"
        placeholder="Expense Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <input
        type="number"
        placeholder="Expense Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button onClick={handleAddExpense}>Add Expense</button>
    </div>
  );
}

export default AddExpenseForm;
