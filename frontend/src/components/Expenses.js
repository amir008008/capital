import React, { useState } from 'react';
import AddExpenseForm from './AddExpenseForm';
import ExpenseItem from './ExpenseItem';

function Expenses({ expenses, onExpenseAdd, onExpenseDelete }) {
  const [fixedExpenses, setFixedExpenses] = useState(expenses.filter(expense => expense.categoryType === 'fixed'));
  const [variableExpenses, setVariableExpenses] = useState(expenses.filter(expense => expense.categoryType === 'variable'));

  const handleExpenseAdd = (newExpense) => {
    const updatedExpenses = [...expenses, newExpense];
    if (newExpense.categoryType === 'fixed') {
      setFixedExpenses([...fixedExpenses, newExpense]);
    } else if (newExpense.categoryType === 'variable') {
      setVariableExpenses([...variableExpenses, newExpense]);
    }
    onExpenseAdd(updatedExpenses);
  };

  const handleExpenseDelete = (expenseIndex) => {
    const updatedExpenses = expenses.filter((_, index) => index !== expenseIndex);
    setFixedExpenses(updatedExpenses.filter(expense => expense.categoryType === 'fixed'));
    setVariableExpenses(updatedExpenses.filter(expense => expense.categoryType === 'variable'));
    onExpenseDelete(expenseIndex);
  };

  return (
    <div className="expenses">
      <h2>Expenses</h2>
      <div className="category">
        <h3>Fixed Expenses</h3>
        <AddExpenseForm onExpenseAdd={handleExpenseAdd} categoryType="fixed" />
        <ul>
          {fixedExpenses.map((expense, index) => (
            <ExpenseItem key={index} index={index} expense={expense} onDelete={handleExpenseDelete} />
          ))}
        </ul>
      </div>
      <div className="category">
        <h3>Variable Expenses</h3>
        <AddExpenseForm onExpenseAdd={handleExpenseAdd} categoryType="variable" />
        <ul>
          {variableExpenses.map((expense, index) => (
            <ExpenseItem key={index} index={index} expense={expense} onDelete={handleExpenseDelete} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Expenses;
