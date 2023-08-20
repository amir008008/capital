import React, { useRef,useState, useCallback ,useEffect } from 'react';
import Header from './components/Header';
import SwipeableViews from 'react-swipeable-views';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import './App.css';
import 'react-tabs/style/react-tabs.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import whyDidYouRender from '@welldone-software/why-did-you-render';
import Modal from 'react-modal';

Modal.setAppElement('#root'); // Assuming your app root element has the id 'root'
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const YEAR = 2023;
const userId = 1;


function App() {

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
 
if (process.env.NODE_ENV === 'development') {
    whyDidYouRender(React, {
        trackAllPureComponents: true,
        logOwnerReasons: true, // log more info about the rerender
        onlyLogs: true, // Don't use the default notifications but only logs
    });
}
 
function TransactionLogger({ userId, isOpen, onClose }) {
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseValue, setExpenseValue] = useState('');

  const populateExpensesDropdown = async (userId, monthYear) => {
    try {
      const response = await fetch(`${BASE_URL}/get-expenses?user_id=${userId}&month=${monthYear}`);
      const data = await response.json();

      // Log the data returned from the API
      console.log("API Response Data:", data);

      if (data && data.expenses && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
      } else {
        console.error("Invalid data format returned from API");
        setExpenses([]);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setExpenses([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log("Fetching expenses...");
      const monthYear = getYearMonth(selectedMonthIndex);
      const userId = 1; // Replace with dynamic user ID later on
      populateExpensesDropdown(userId, monthYear);
    }
  }, [isOpen, selectedMonthIndex]);

  const handleSave = () => {
    if (selectedExpense && expenseValue) {
      const usedAlreadyValue = parseFloat(expenseValue); // Parse as float
      const newUsedAlready = selectedExpense.used_already + usedAlreadyValue; // Accumulate the new value
      console.log("Saving expense:", selectedExpense.id, selectedExpense.expense_name, selectedExpense.expense_amount, newUsedAlready);
      editExpense(userId, selectedExpense.id, selectedExpense.expense_name, selectedExpense.expense_amount, newUsedAlready);
      onClose(); // Close the modal
      window.location.reload();

    }
  };

  console.log("Rendering TransactionLogger...");

  return (
    <Modal className="modal" isOpen={isOpen} contentLabel="Log Transaction">
      {expenses?.length > 0 && (
        <select className="modal-select" onChange={(e) => {
          const selectedOption = expenses.find(exp => exp.id === parseInt(e.target.value));
          setSelectedExpense(selectedOption);
          console.log("Selected Expense:", selectedOption);
        }}>
          <option value="">Select an expense</option>
          {expenses.map(exp => (
            <option key={exp.id} value={exp.id}>{exp.expense_name}</option>
          ))}
        </select>
      )}

      {selectedExpense && (
        <div className="input-group">
          <span className="expense-name">{selectedExpense.expense_name}</span>
          <span className="used-already right">{selectedExpense.used_already}</span> {/* Display used already */}
          <input className="number-input" type="number" step="0.01" value={expenseValue} onChange={(e) => setExpenseValue(e.target.value)} />
        </div>
      )}
      <p></p>
      <button className="button save-button" onClick={handleSave}>Save</button>
      <button className="button cancel-button" onClick={onClose}>Cancel</button>
    </Modal>
  );
}


const openAgain = () => {
  const monthYear = getYearMonth(selectedMonthIndex);
  const userId = 1; // Replace with the user ID later on
  const newStatus = 'waiting';

  fetch(`${BASE_URL}/edit-budget-status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      month: monthYear,
      newStatus: newStatus,
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update the monthStatuses state to reflect the new status
        setMonthStatuses(prevStatus => ({
          ...prevStatus,
          [monthYear]: newStatus,
        }));
      } else {
        console.error('Error editing budget:', data.error || data.message);
      }
    })
    .catch(error => {
      console.error('Error editing budget:', error);
    });
};
const displayExpensesForTesting = () => {
  const variableExpenses = getExpensesOfType('Variable', currentMonthStatus);
  const fixedExpenses = getExpensesOfType('Fixed', currentMonthStatus);

  console.log('Variable Expenses:', variableExpenses);
  console.log('Fixed Expenses:', fixedExpenses);
};


  const closeBudget = () => {
    const monthYear = getYearMonth(selectedMonthIndex);
    const userId = 1; // Replace with the user ID later on
    const newStatus = 'closed';

    fetch(`${BASE_URL}/edit-budget-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        month: monthYear,
        newStatus: newStatus,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Update the monthStatuses state to reflect the new status
          setMonthStatuses(prevStatus => ({
            ...prevStatus,
            [monthYear]: newStatus,
          }));
        } else {
          console.error('Error closing budget:', data.error || data.message);
        }
      })
      .catch(error => {
        console.error('Error closing budget:', error);
      });
  };
  const approveBudget = () => {
    const monthYear = getYearMonth(selectedMonthIndex);
    const userId = 1; // Replace with the user ID later on
    const newStatus = 'ongoing';

    fetch(`${BASE_URL}/edit-budget-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        month: monthYear,
        newStatus: newStatus,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Update the monthStatuses state to reflect the new status
          setMonthStatuses(prevStatus => ({
            ...prevStatus,
            [monthYear]: newStatus,
          }));
        } else {
          console.error('Error approving budget:', data.error || data.message);
        }
      })
      .catch(error => {
        console.error('Error approving budget:', error);
      });
  };
  const [monthStatuses, setMonthStatuses] = useState({});
  const [estimatedBudget, setEstimatedBudget] = useState(1000);
  const [expenses, setExpenses] = useState([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(7); // August index
  const [showTransactionLogger, setShowTransactionLogger] = useState(false);
const handleMonthChange = (index) => {
  // Calculate the difference between the clicked tab's index and the currently selected month index
  const indexDiff = index - selectedMonthIndex;
  
  // Update the selectedMonthIndex with the calculated difference
  setSelectedMonthIndex(selectedMonthIndex + indexDiff);
};


  function getYearMonth(index) {
    const month = index + 1; // Month index is 0-based, so add 1
    return `${YEAR}-${month.toString().padStart(2, '0')}`;
  }

  useEffect(() => {
    // Fetch budget status for all months
    months.forEach((_, monthIndex) => {
      const monthYear = getYearMonth(monthIndex);
      const userId = 1; // Replace with the user ID later on
      fetch(`${BASE_URL}/get-budget-status?user_id=${userId}&month=${monthYear}`)
        .then(response => response.json())
        .then(data => {
          setMonthStatuses(prevStatus => ({
            ...prevStatus,
            [monthYear]: data.status,
          }));
        })
        .catch(error => {
          console.error('Error fetching budget status for month', monthYear, error);
        });
    });

    // Fetch expenses and budget status for the selected month
    const monthYear = getYearMonth(selectedMonthIndex);
    const userId = 1; // Replace with the user ID later on
    fetch(`${BASE_URL}/get-expenses?user_id=${userId}&month=${monthYear}`)
      .then(response => response.json())
      .then(data => {
        setExpenses(data.expenses);
      })
      .catch(error => {
        console.error('Error fetching expenses:', error);
      });

  }, [selectedMonthIndex]);

  const formatExpenseName = (name) => {
    const maxChars = 20;  // Set this to your desired character limit
    if (name.length > maxChars) {
        return `${name.slice(0, maxChars - 3)}...`;
    } else {
        return name.padEnd(maxChars, ' ');
    }
};
const populateExpensesDropdown = async (userId, monthYear) => {
  try {
    const response = await fetch(`${BASE_URL}/get-expenses?user_id=${userId}&month=${monthYear}`);
    const data = await response.json();

    // Log the data returned from the API
    console.log("API Response Data:", data);

    if (data && data.expenses && Array.isArray(data.expenses)) {
      setExpenses(data.expenses);
    } else {
      console.error("Invalid data format returned from API");
      setExpenses([]);
    }
  } catch (error) {
    console.error("Error fetching expenses:", error);
    setExpenses([]);
  }
};


useEffect(() => {
  const monthYear = getYearMonth(selectedMonthIndex);
  const userId = 1; // Replace with dynamic user ID later on
  populateExpensesDropdown(userId, monthYear);
}, [selectedMonthIndex]);

const calculateExpenseProgress = (totalAmount, usedAmount) => {
  const remainingAmount = totalAmount - usedAmount;
  const progress = (remainingAmount / totalAmount) * 100;
  return Math.min(Math.max(progress, 0), 100); // ensures it's between 0 and 100
};

const ProgressBar = ({ totalAmount, usedAmount }) => {
  const progress = calculateExpenseProgress(totalAmount, usedAmount);
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
    </div>
  );
};



const getExpensesOfType = (expenseType, status) => {
  return expenses
    .filter(expense => expense.expense_type === expenseType)
    .map((expense, expenseIndex) => (
      <li key={expenseIndex} className="expense-item">
        {editingExpenseId === expense.id ? (
          <>
            <input 
              value={editingExpenseName}
              onChange={(e) => setEditingExpenseName(e.target.value)}
            />
            <input 
              value={editingExpenseValue}
              onChange={(e) => setEditingExpenseValue(e.target.value)}
            />
            <button className="button-submit" onClick={() => setEditingExpenseId(null)}>Save</button>
          </>
        ) : (
          <>
            <span className="expense-name">{formatExpenseName(expense.expense_name)}</span>
            <span className="expense-amount">{expense.expense_amount.toFixed(2)}</span>

            {(status !== 'waiting' && status !== 'expected' ) && (
              <span className={`used-already ${expense.expense_amount - expense.used_already >= 0 ? 'positive' : 'negative'}`}>
                {expense.expense_amount - expense.used_already >= 0 ? (
                  <span className="positive">{(expense.expense_amount - expense.used_already).toFixed(2)}</span>
                ) : (
                  <span className="negative">({Math.abs(expense.expense_amount - expense.used_already).toFixed(2)})</span>
                )}
              </span>
            )}

            {/* Uncomment the following if you wish to have an edit button in the future */}
            {/* 
            <button className="button-submit" onClick={() => {
              setEditingExpenseId(expense.id);
              setEditingExpenseName(expense.expense_name);
              setEditingExpenseValue(expense.expense_amount);
            }}>
              Edit
            </button>
            */}
            {(currentMonthStatus !== 'closed' && currentMonthStatus !== 'ongoing') && (
              <FontAwesomeIcon 
                icon={faTimes} 
                className="custom-icon-class" 
                onClick={() => deleteExpense(1, expense.id)}
              />
            )}
          </>
        )}
      </li>
    ));
};


  

  
  
  
  const addCategory = (userId, category, expenseName, expenseAmount, expenseType, expenseMonth) => {
    fetch(`${BASE_URL}/add-expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        category: category,
        expenseName: expenseName,
        expenseAmount: expenseAmount,
        expenseType: expenseType,
        expenseMonth: expenseMonth
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Successfully added expense:', data.expenseId);
        } else {
          console.error('Error adding expense:', data.error || data.message);
        }
      })
      .catch(error => {
        console.error('Error adding expense:', error);
      });
  };
  
 
  const [isAddingCategoryFixed, setIsAddingCategoryFixed] = useState(false);
  const [newCategoryNameFixed, setNewCategoryNameFixed] = useState('');
  const [newCategoryValueFixed, setNewCategoryValueFixed] = useState('');

  

  const [isAddingCategoryVariable, setIsAddingCategoryVariable] = useState(false);
  const [newCategoryNameVariable, setNewCategoryNameVariable] = useState('');
  const [newCategoryValueVariable, setNewCategoryValueVariable] = useState('');
  
  const handleAddCategory = (type, name, value) => {
    if (type === 'Fixed') {
      if (isAddingCategoryFixed) {
        // Extract the current month from selectedMonthYear
        const currentMonth = parseInt(selectedMonthYear.split('-')[1], 10);
        const currentYear = selectedMonthYear.split('-')[0];
  
        // Loop through the months starting from the current month till December
        for (let month = currentMonth; month <= 12; month++) {
          const formattedMonth = month < 10 ? `0${month}` : `${month}`; // Ensure the month is in the format 'MM'
          const expenseMonth = `${currentYear}-${formattedMonth}-01`;
          
          const payload = {
            user_id: 1, // Get user ID from appropriate source
            category: 1,
            expenseName: name,
            expenseAmount: value,
            expenseType: type,
            expenseMonth
          };
          console.log(payload);  // Add this line
    
          // Send the payload for each month
          addCategory(
            payload.user_id,
            payload.category,
            payload.expenseName,
            payload.expenseAmount,
            payload.expenseType,
            payload.expenseMonth
          );
        }
    
        // Reset the state after adding for all months
        setNewCategoryNameFixed('');
        setNewCategoryValueFixed('');
        setIsAddingCategoryFixed(false);
         window.location.reload();

      } else {
        // If not in adding state, switch to the adding state
        setIsAddingCategoryFixed(true);
      }
    }
    if (type === 'Variable') {
      if (isAddingCategoryVariable) {
          // For 'Variable', you only need to add for the current month
          const expenseMonth = `${selectedMonthYear}-01`;

          const payload = {
              user_id: 1, // Get user ID from appropriate source
              category: 1,
              expenseName: name,
              expenseAmount: value,
              expenseType: type,
              expenseMonth
          };

          // Send the payload
          addCategory(
              payload.user_id,
              payload.category,
              payload.expenseName,
              payload.expenseAmount,
              payload.expenseType,
              payload.expenseMonth
          );
          console.log(payload);  // Add this line
          
          // Reset the state after adding
          setNewCategoryNameVariable('');
          setNewCategoryValueVariable('');
          setIsAddingCategoryVariable(false);
           window.location.reload();

        } else {
          setIsAddingCategoryVariable(true);


      }
  }

};

const refreshTabContent = () => {
  // Increment the tabDataChangeToken to trigger a re-render.
  setTabDataChangeToken(prevToken => prevToken + 1);
};

const [editingExpenseId, setEditingExpenseId] = useState(null);
const [editingExpenseName, setEditingExpenseName] = useState('');
const [editingExpenseValue, setEditingExpenseValue] = useState('');

// Function to edit an expense
const editExpense = (userId, expenseId, updatedName, updatedValue, usedAlready) => {
  fetch(`${BASE_URL}/edit-expense`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      expenseId: expenseId,
      updatedName: updatedName, // New expense name
      updatedValue: updatedValue, // New expense value
      usedAlready: usedAlready
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Successfully updated expense.');
      } else {
        console.error('Error updating expense:', data.error || data.message);
      }
    })
    .catch(error => {
      console.error('Error updating expense:', error);
    });
};
const [isDialogOpen, setIsDialogOpen] = useState(false);

// Function to delete an expense
const deleteExpense = (userId, expenseId) => {
  fetch(`${BASE_URL}/delete-expense`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      expenseId: expenseId,
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Successfully deleted expense.');
        goToNextMonth();
        
      } else {
        console.error('Error deleting expense:', data.error || data.message);
      }
    })
    .catch(error => {
      console.error('Error deleting expense:', error);
    });
    goToPreviousMonth();
  };

  const addValue = (userId, expenseId, usedAlready) => {
    fetch(`${BASE_URL}/edit-expense`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        expenseId: expenseId,
        usedAlready: usedAlready
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Successfully updated expense value.');
        } else {
          console.error('Error updating expense value:', data.error || data.message);
        }
      })
      .catch(error => {
        console.error('Error updating expense value:', error);
      });
  };

  const populateDropdown = () => {
    if (!expenses || expenses.length === 0) return null; // Guard clause to ensure expenses are present
    
    return expenses.map(exp => (
        <option key={exp.id} value={exp.id}>{exp.name}</option>
    ));
};

  const CategoryInputForm = ({ categoryName, setCategoryName, categoryValue, setCategoryValue, handleSubmit, handleCancel }) => {
    return (
        <>
            <input 
                type="text"
                placeholder="Category"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
            />
            <input 
                type="text"
                placeholder="Value"
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
            />
            <div className="add-category button-submit" onClick={handleSubmit}>Submit</div>
            <div className="add-category button-close" onClick={handleCancel}>Cancel</div>
        </>
    );
}

  function calculateTotalExpenses() {
    return expenses.reduce((acc, curr) => acc + parseFloat(curr.expense_amount), 0);
  }
  function calculateActualUsed() {
    return expenses.reduce((acc, curr) => {
      const usedAlready = parseFloat(curr.used_already);
      if (!isNaN(usedAlready)) {
        return acc + usedAlready;
      }
      return acc;
    }, 0);
  }

  const [forceUpdate, setForceUpdate] = useState(0);

useEffect(() => {
    console.log('Component updated!');
});

  
function CustomInput(props) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (props.autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [props.autoFocus]);

  return (
    <input 
        ref={inputRef}
        type={props.type || "text"}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
    />
  );
}


  const categoryNameRef = useRef(null);
const categoryValueRef = useRef(null);

const handleCategoryChange = useCallback((e) => {
  setNewCategoryNameFixed(e.target.value);
}, []);

const handleValueChange = useCallback((e) => {
  setNewCategoryValueFixed(e.target.value);
}, []);

function ExpenseInput({ isAddingCategory, handleAdd, handleCancel }) {
  const [categoryName, setCategoryName] = useState('');
  const [categoryValue, setCategoryValue] = useState('');

  const handleSubmit = () => {
    if (categoryName && categoryValue) {
      handleAdd(categoryName, categoryValue);
      
      // Reset the fields after submitting
      setCategoryName('');
      setCategoryValue('');
    }
  };

  if (isAddingCategory) {
    return (
      <>
        <input
          type="text"
          className="category-input"
          placeholder="Category"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Value"
          className="number-input"
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
        />

        <div className="add-category button-submit" onClick={handleSubmit}>Submit</div>
        {handleCancel && 
          <div className="add-category button-close" onClick={handleCancel}>Cancel</div>}
      </>
    );
  } else {
    return (
      <div className="add-category" onClick={handleAdd}>Add category</div>
    );
  }
}


  
  const selectedMonthYear = getYearMonth(selectedMonthIndex);
  const currentMonthStatus = monthStatuses[selectedMonthYear] || "waiting";
     // Extract the status of the currently selected month
     const TabContent = ({ status }) => {
      switch (status) {
        case "expected":
          case "waiting":
              return (
                  <div>
                      <div className="budget-info">
                          <div className="budget-amount">{calculateTotalExpenses()}</div>
                          <div className="step-description">Step 1: Estimated Budget</div>
                      </div>
                      <div className="expenses-heading">Fixed Expenses</div>
                      <ul className="expense-list">
                      {getExpensesOfType('Fixed', currentMonthStatus)}
                      </ul>
                      <div className="button-group">
                      <ExpenseInput 
                          isAddingCategory={isAddingCategoryFixed}
                          categoryName={newCategoryNameFixed}
                          categoryValue={newCategoryValueFixed}
                          setCategoryName={setNewCategoryNameFixed}
                          setCategoryValue={setNewCategoryValueFixed}
                          handleAdd={(categoryName, categoryValue) => handleAddCategory('Fixed', categoryName, categoryValue)}
                          handleCancel={() => setIsAddingCategoryFixed(false)}
                      />

                      </div>
                      <p></p>
                      <div className="expenses-heading">Variable Expenses</div>
                      <ul className="expense-list">
                      {getExpensesOfType('Variable', currentMonthStatus)}
                      </ul>
                      <div className="button-group">
                      <ExpenseInput 
                          isAddingCategory={isAddingCategoryVariable}
                          categoryName={newCategoryNameVariable}
                          categoryValue={newCategoryValueVariable}
                          setCategoryName={setNewCategoryNameVariable}
                          setCategoryValue={setNewCategoryValueVariable}
                          handleAdd={(categoryName, categoryValue) => handleAddCategory('Variable', categoryName, categoryValue)}
                      />

                      </div>
                  </div>
              );
          
        case "ongoing":
          return (
            <div>
              <div className="ongoing-info">
                <div className="header-text">Expenses up to date</div>
                <div className="expense-value">{calculateActualUsed()}</div>
                <div className="step-description">Step 3, stay on budget {calculateTotalExpenses()}</div>
              </div>
              <div className="expenses-heading">Fixed Expenses</div>
              <ul className="expense-list">
              {getExpensesOfType('Fixed', currentMonthStatus)}
              </ul>
              {/* <div className="button-group">
                <div className="add-category">Add item</div>
                <div className="add-value">Add value</div>
              </div> */}
              <p></p>
              <div className="expenses-heading">Variable Expenses</div>
              <ul className="expense-list">
              {getExpensesOfType('Variable', currentMonthStatus)}
              </ul>
              {/* <div className="button-group">
                <div className="add-category">Add item</div>
                <div className="add-value">Add value</div>
              </div> */}
              <button className="submit-button open" onClick={closeBudget}>
                Close Budget
              </button>

            </div>
            
          );
          case "closed":
            return (
              <div>
                <div className="closed-info">
                  <div className="total-price">Budget</div>
                  <div className="budget-amount">{calculateTotalExpenses()}</div>
                  <div className="total-price">Expenses</div>
                  <div className="budget-amount">{calculateActualUsed()}</div>
                  <div className="step-description">Closed</div>
                </div>

                <ul className="expense-list">
                  <li className="expense-item">
                    <span className="expenses-heading">Fixed Expenses</span>
                    <span className="available-heading">Available</span> {/* Heading for the column */}
                  </li>
                  {getExpensesOfType('Fixed', currentMonthStatus)}
                </ul>
                <p></p>
                <div className="expenses-heading">Variable Expenses</div>
                <ul className="expense-list">
                {getExpensesOfType('Variable', currentMonthStatus)}
                </ul>
                <button className="submit-button  admin" onClick={openAgain}>
                  Open Again / Admin only
                </button>
              </div>
              
            );
        default:
          return;
      }
    };
    const MemoizedTabContent = React.memo(TabContent);

  const [isModalOpen, setModalOpen] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [expenseNameInput, setExpenseNameInput] = useState('');
  const [expenseAmountInput, setExpenseAmountInput] = useState('');
  const [expenseTypeInput, setExpenseTypeInput] = useState('');
  const [expenseMonthInput, setExpenseMonthInput] = useState('');

  const handleSubmit = () => {
    addCategory(1, categoryInput, expenseNameInput, expenseAmountInput, expenseTypeInput, expenseMonthInput);
    setModalOpen(false);
  };
  const [localCategoryName, setLocalCategoryName] = useState(newCategoryNameFixed);
  const [localCategoryValue, setLocalCategoryValue] = useState(newCategoryValueFixed);
  const fixedCategoryInputRef = useRef(null);
  const fixedValueInputRef = useRef(null);
  const variableCategoryInputRef = useRef(null);
  const variableValueInputRef = useRef(null);
  const [tabDataChangeToken, setTabDataChangeToken] = useState(0);
  const goToNextMonth = () => {
    setSelectedMonthIndex(prevIndex => prevIndex + 1);
  }

const goToPreviousMonth = () => {
    setSelectedMonthIndex(prevIndex => prevIndex - 1);
  }


  useEffect(() => {
    if (fixedCategoryInputRef.current) {
      fixedCategoryInputRef.current.focus();
    }
  }, [newCategoryNameFixed]);
  
  useEffect(() => {
    if (fixedValueInputRef.current) {
      fixedValueInputRef.current.focus();
    }
  }, [newCategoryValueFixed]);
  
  useEffect(() => {
    if (variableCategoryInputRef.current) {
      variableCategoryInputRef.current.focus();
    }
  }, [newCategoryNameVariable]);
  
  useEffect(() => {
    if (variableValueInputRef.current) {
      variableValueInputRef.current.focus();
    }
  }, [newCategoryValueVariable]);

  
  return (
    
    <div className="App">
      <Header />
      <div className="main-content">
        <Tabs selectedIndex={2} onSelect={handleMonthChange} forceRenderTabPanel={true}>
          <TabList className="tab-list">
            {months.slice(Math.max(0, selectedMonthIndex - 2), selectedMonthIndex + 3).map((month, sliceIndex) => {
              const actualMonthIndex = Math.max(0, selectedMonthIndex + sliceIndex - 2);
              const monthYear = getYearMonth(actualMonthIndex);
              const monthStatusClass = monthStatuses[monthYear] || 'default-status';
              const isSelected = (selectedMonthIndex < 2 && sliceIndex === selectedMonthIndex) || (sliceIndex === 2 && selectedMonthIndex >= 2);

              return (
                <Tab key={sliceIndex} className={`tab-item ${isSelected ? 'selected' : ''}`}>
                  <div className={`tab-inner ${isSelected ? 'active' : ''} ${monthStatusClass}`}>
                    {month}
                  </div>
                </Tab>
              );
            })}
          </TabList>

          <SwipeableViews index={selectedMonthIndex} onChangeIndex={handleMonthChange} resistance>
        {months.map((month, index) => (
          <TabPanel 
            key={index} 
            className="tab-panel" 
            changeToken={tabDataChangeToken}
        >
            <MemoizedTabContent  status={currentMonthStatus} />
        </TabPanel>
        ))}
    </SwipeableViews>


        </Tabs>
        <button
          className={`submit-button 
                      ${currentMonthStatus === 'closed' ? 'closed' : 
                        currentMonthStatus === 'waiting' ? 'waiting' : 
                        currentMonthStatus === 'ongoing' ? 'ongoing' : 
                        'not-closed'}`}
          onClick={() => {
            if (currentMonthStatus === 'waiting') {
              approveBudget();
            } else if (currentMonthStatus === 'ongoing') {
              setShowTransactionLogger(true);  // Open the modal
            }
          }}
        >
          {currentMonthStatus === 'closed'
            ? 'CLOSED'
            : currentMonthStatus === 'waiting'
            ? 'Approve Budget'
            : currentMonthStatus === 'ongoing'
            ? 'LOG TRANSACTION'
            : 'Edit Budget'}
        </button>

        <TransactionLogger userId={1} isOpen={showTransactionLogger} onClose={() => setShowTransactionLogger(false)} />

      </div>
    </div>
    
  );
  
  
}
App.whyDidYouRender = true;
export default App;