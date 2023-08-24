const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: "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" });
const { SocksProxyAgent } = require('socks-proxy-agent');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { createPool } = require('mysql2/promise');
const mysql = require('mysql2'); // <-- Update here

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
    host: 'localhost',
    user: 'newuser1',
    password: 'test123',
    database: 'budget_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const db = createPool(dbConfig); // Using createPool from promise version of mysql2
const dbConfigOld = {
  host: 'localhost',
  user: 'newuser1',
  password: 'test123',
  database: 'budget_tracker',
};

// Using mysql2's createConnection method
const dbOld = mysql.createConnection(dbConfig);

// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//   } else {
//     console.log('Connected to the database');
//   }
// });
// // const openaiAxiosInstance = axios.create({
// //   baseURL: 'https://api.openai.com',
// //   timeout: 5000,
// //   proxy: false, // Important: Set proxy to false here
// //   httpsAgent: new SocksProxyAgent('socks5://127.0.0.1:1091') // Make sure to install socks-proxy-agent if you haven't
// // });



app.get('/', (req, res) => {
  res.send('Hello, world!');
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
  dbOld.query(query, queryParams, (err, result) => {
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

const rateLimit = require("express-rate-limit");

// Set up rate limiter: max of 5 requests per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests,
  message: "Too many requests from this IP. Please wait a minute and try again."
});

// Apply rate limiter to the ChatGPT endpoint
app.use("/chat", limiter);
app.post("/chat", async (req, res) => {
  const { prompt, max_tokens, user_id = 1 } = req.body;

  console.log("Received request with prompt:", prompt);

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    console.log("Invalid prompt provided.");
    return res.status(400).json({ error: "Invalid prompt provided." });
  }

  try {
    const completion = await openai.completions.create({
        model: " ",
        prompt: prompt,
        max_tokens: max_tokens || 1000
    });

    console.log("Completion response:", completion);

    // Extracting token usages
    const {
        prompt_tokens, 
        completion_tokens, 
        total_tokens
    } = completion.usage;

    // Save the query, response, model, and token usage to the database
    const queryText = prompt;
    const responseText = completion.choices[0].text.trim();
    const modelName = "text-davinci-002";  // or you can dynamically get it from the completion response, if available

    const saveQuery = `
        INSERT INTO chatgpt_queries (user_id, query, response, model, prompt_tokens, completion_tokens, total_tokens)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(saveQuery, [user_id, queryText, responseText, modelName, prompt_tokens, completion_tokens, total_tokens], (err, result) => {
        if (err) {
            console.error('Error saving query-response:', err);
        } else {
            console.log('Query-response saved successfully!');
        }
    });

    res.send(responseText);


  } catch (error) {
    console.error("Error generating completion:", error);

    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API Error:", error);

      res.status(500).json({
        error: error.message,
        code: error.code,
        type: error.type,
        status: error.status
      });
    } else {
      console.error("Non-API error:", error);

      res.status(500).json({ error: "Error generating completion." });
    }
  }
});




app.post("/chatfree", async (req, res) => {
    const { prompt } = req.body;

    try {
        const response = await axios.post('http://localhost:5001/generate', { text: prompt });
        const generatedText = response.data.generated_text;
        res.send(generatedText);
    } catch (error) {
        console.error("Error generating completion:", error);
        res.status(500).json({ error: "Error generating completion." });
    }
});

app.post('/getOpenAIResponse', async (req, res) => {
  try {
      const response = await fetch("https://api.openai.com/v2/completions", {
          method: 'POST',
          headers: {
              'Authorization': 'Bearer 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',
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(req.body),
      });

      const data = await response.json();
      res.json(data);
  } catch (err) {
      res.status(500).json({ error: 'Failed to fetch from OpenAI' });
  }
});

// // Endpoint to save query and response
// app.post('/save-query-response', (req, res) => {
//   const { user_id, query, response, tokens_used } = req.body;

//   const saveQuery = `
//     INSERT INTO chatgpt_queries (user_id, query, response, tokens_used)
//     VALUES (?, ?, ?, ?)
//   `;

//   db.query(saveQuery, [user_id, query, response, tokens_used], (err, result) => {
//     if (err) {
//       console.error('Error saving query-response:', err);
//       return res.json({ success: false, error: err.message });
//     }
//     res.json({ success: true, message: 'Query-response saved successfully!' });
//   });
// });

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

// Endpoint to fetch user preferences
app.get('/preferences/:userId', (req, res) => {
  const userId = req.params.userId;

  const getPreferences = `
    SELECT * FROM user_preferences WHERE user_id = ?
  `;

  db.query(getPreferences, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching preferences:', err);
      return res.json({ success: false, error: err.message });
    }
    console.error('noerror fetching preferences:', results[0]);

    res.json({ success: true, data: results[0] });  // Assuming each user has only one row of preferences.
  });
});





app.get('/api/fetch-user', (req, res) => {
    const bearerToken = req.headers.authorization;
    if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization token missing or invalid' });
    }
    
    const token = bearerToken.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({ success: true, data: decoded });
    } catch (err) {
        res.status(401).json({ success: false, error: 'Token verification failed' });
    }
});

// Endpoint to save or update user preferences
app.post('/preferences/:userId', (req, res) => {
  const userId = req.params.userId;
  const { language, locale, currency, dateFormat, moneyFormat } = req.body;

  // Check if user preferences already exist
  const checkQuery = `
    SELECT * FROM user_preferences WHERE user_id = ?
  `;

  const insertPreferences = `
    INSERT INTO user_preferences (user_id, language, locale, currency, dateFormat, moneyFormat)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const updatePreferences = `
    UPDATE user_preferences SET language = ?, locale = ?, currency = ?, dateFormat = ?, moneyFormat = ? WHERE user_id = ?
  `;

  db.query(checkQuery, [userId], (err, results) => {
    if (err) {
      console.error('Error checking preferences:', err);
      return res.json({ success: false, error: err.message });
    }

    if (results.length > 0) {
      // Preferences already exist, so update
      db.query(updatePreferences, [language, locale, currency, dateFormat, moneyFormat, userId], (err, result) => {
        if (err) {
          console.error('Error updating preferences:', err);
          return res.json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Preferences updated successfully!' });
      });
    } else {
      // No preferences found, so insert new entry
      db.query(insertPreferences, [userId, language, locale, currency, dateFormat, moneyFormat], (err, result) => {
        if (err) {
          console.error('Error inserting preferences:', err);
          return res.json({ success: false, error: err.message });
        }
        res.json({ success: true, message: 'Preferences saved successfully!' });
      });
    }
  });
});
const jwt = require('jsonwebtoken');
const SECRET_KEY = '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';  // Make sure to use a strong secret key and ideally, store it in an environment variable



        

const uuid = require('uuid'); // Assuming you've imported this for the userId generation.
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  let query = 'SELECT id, email, username, country, password FROM users WHERE username = ?';
  let queryParams = [username];

  console.log('Query:', query);
  console.log('Query Params:', queryParams);

  try {
    const result = await db.query(query, queryParams);
    // // Data Retrieval: Log the entire result object to see the structure
    // console.log('Database query result:', result);

    if (result.length > 0) {
      const user = result[0][0];

      if (!user.password) {
        console.error("Password not found for user:", user.id);
        return res.json({ success: false, error: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.password);

      if (match) {
        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email, country: user.country },
          SECRET_KEY,
          { expiresIn: '1h' }
        );

        return res.json({
          success: true,
          token: token,
          id: user.id,
          email: user.email,
          username: user.username,
          country: user.country
        });
      } else {
        return res.json({ success: false, error: 'Invalid credentials' });
      }
    } else {
      return res.json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Database query error:', err);
    return res.json({ success: false, error: 'Server error' });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuid.v4();  // generate a unique alphanumeric ID for the user

    // User insertion
    const userQuery = 'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)';
    await connection.query(userQuery, [userId, username, email, hashedPassword]);

    // Default Preferences
    const preferencesQuery = 'INSERT INTO user_preferences (user_id, language, locale, currency, dateFormat, moneyFormat) VALUES (?, ?, ?, ?, ?, ?)';
    await connection.query(preferencesQuery, [userId, 'zh', 'en-US', 'CNY', 'MM-DD-YYYY', '1,234.56']);

    // Budget statuses
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    for (let i = 0; i < 36; i++) {
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const month = (currentMonth + i) % 12 + 1;  
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;

      let status = 'expected';
      if (i === 0) {
        status = 'waiting';
      } else if (i < 0) {
        status = 'closed';
      }

      const budgetStatusQuery = `INSERT INTO budget_status (\`user_id\`, \`year_month\`, \`status\`) VALUES (?, ?, ?)`;
      await connection.query(budgetStatusQuery, [userId, dateStr, status]);
    }

    await connection.commit();
    res.json({ success: true, message: 'User registered successfully' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Server error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage.includes('unique_username')) {
          res.json({ success: false, error: 'Username already exists. Please choose another one.' });
      } else if (error.sqlMessage.includes('unique_email')) {
          res.json({ success: false, error: 'Email already exists. Please use a different email.' });
      } else {
          res.json({ success: false, error: 'A unique constraint was violated. Please try again.' });
      }
  } else {
      res.json({ success: false, error: 'Server error' });
  }
  

  } finally {
    if (connection) connection.release();
  }
});


app.delete('/api/deleteUser', async (req, res) => {
  const { userId } = req.body;  // this can be passed in the body or through an authentication token

  let connection;

  try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Step 1: Delete user's expenses (assuming there's a table called user_expenses)
      await connection.query('DELETE FROM user_expenses WHERE user_id = ?', [userId]);

      // Step 2: Delete user's budget statuses
      await connection.query('DELETE FROM budget_status WHERE user_id = ?', [userId]);

      // Step 3: Delete user's preferences
      await connection.query('DELETE FROM user_preferences WHERE user_id = ?', [userId]);

      // Step 4: Delete the user
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);

      await connection.commit();
      res.json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
      if (connection) await connection.rollback();
      console.error('Server error:', error);
      res.json({ success: false, error: 'Server error' });

  } finally {
      if (connection) connection.release();
  }
});



const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on ports ${port}`);
});
