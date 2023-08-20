const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'mysql',
  user: 'userSQU', // Replace with your MySQL username
  password: '8n0HEUsN8QRpjisv', // Replace with your MySQL password
  database: 'sampledb', // Replace with your desired database name
});


db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the database');
  }
});

app.post('/add-expense', (req, res) => {
  const { user_id, category, expenseName, expenseAmount, expenseType, expenseMonth } = req.body;

  const query = 'INSERT INTO expenses (user_id, category_id, expense_name, expense_amount, expense_type, expense_month) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [user_id, category, expenseName, expenseAmount, expenseType, expenseMonth], (err, result) => {
    if (err) {
      console.error('Error adding expense:', err);
      res.json({ success: false, error: err.message });
    } else {
      res.json({ success: true, expenseId: result.insertId });
    }
  });
});

app.put('/edit-budget-status', (req, res) => {
  const { user_id, month, newStatus } = req.body;

  const query = 'UPDATE budget_status SET status = ? WHERE user_id = ? AND `year_month` LIKE ?';
  const queryParams = [newStatus, user_id, `${month}%`];

  // Log the query and query parameters
  console.log('Query:', query);
  console.log('Query Params:', queryParams);

  // Perform the query
  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error editing budget status:', err);
      res.json({ success: false, error: err.message });
    } else {
      res.json({ success: true, message: 'Budget status updated successfully' });
    }
  });
});

app.get('/get-budget-status', (req, res) => {
  const { user_id, month } = req.query;

  const query = 'SELECT status FROM budget_status WHERE user_id = ? AND `year_month` LIKE ?';
  const queryParams = [user_id, `${month}%`];

  // Log the query and query parameters
  console.log('Query:', query);
  console.log('Query Params:', queryParams);

  // Perform the query
  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error fetching budget status:', err);
      res.json({ success: false, error: err.message });
    } else {
      if (result.length === 0) {
        res.json({ success: false, message: 'Budget status not found' });
      } else {
        res.json({ success: true, status: result[0].status });
      }
    }
  });
});

app.put('/edit-expense', (req, res) => {
  // Extracting the required fields from the request body
  const { user_id, expenseId, usedAlready } = req.body;

  // SQL query to update the used_already field
  const query = 'UPDATE expenses SET used_already = ? WHERE id = ? AND user_id = ?';

  // Executing the query
  db.query(query, [usedAlready, expenseId, user_id], (err, result) => {
    if (err) {
      console.error('Error editing expense:', err);
      res.json({ success: false, error: err.message });
    } else {
      // Check if any rows were affected (i.e., the expense was actually updated)
      if(result.affectedRows > 0) {
        res.json({ success: true, message: 'Expense updated successfully.' });
      } else {
        res.json({ success: false, message: 'No matching expense found for the provided ID and user.' });
      }
    }
  });
});

app.delete('/delete-expense', (req, res) => {
  // Extracting the required fields from the request body
  const { user_id, expenseId } = req.body;

  // SQL query to delete the expense
  const query = 'DELETE FROM expenses WHERE id = ? AND user_id = ?';

  // Executing the query
  db.query(query, [expenseId, user_id], (err, result) => {
    if (err) {
      console.error('Error deleting expense:', err);
      res.json({ success: false, error: err.message });
    } else {
      // Check if any rows were affected (i.e., the expense was actually deleted)
      if(result.affectedRows > 0) {
        res.json({ success: true, message: 'Expense deleted successfully.' });
      } else {
        res.json({ success: false, message: 'No matching expense found for the provided ID and user.' });
      }
    }
  });
});


app.get('/get-expenses', (req, res) => {
  const { user_id, category, month } = req.query;

  // Trim the month value to remove whitespace and newline characters
  const trimmedMonth = month.trim();

  let query;
  let queryParams;

  if (category) {
    query = 'SELECT * FROM expenses WHERE user_id = ? AND category_id = ? AND DATE_FORMAT(expense_month, "%Y-%m") LIKE ?';
    queryParams = [user_id, category, `${trimmedMonth}%`];
  } else {
    query = 'SELECT * FROM expenses WHERE user_id = ? AND DATE_FORMAT(expense_month, "%Y-%m") LIKE ?';
    queryParams = [user_id, `${trimmedMonth}%`];
  }

  // Log the query and query parameters
  console.log('Query:', query);
  console.log('Query Params:', queryParams);

  // Perform the query
  db.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error fetching expenses:', err);
      res.json({ success: false, error: err.message });
    } else {
      res.json({ success: true, expenses: result });
    }
  });
});


const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
