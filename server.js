const OpenAI = require('openai');
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
openai.api_key = process.env.OPENAI_API_KEY;
// const { Configuration, OpenAIApi } = require("openai");

// const configuration = new Configuration({
//   apiKey: "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",
// });

// const openai = new OpenAIApi(configuration);  // You can initialize this once and reuse
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { createPool } = require('mysql2/promise');
const mysql = require('mysql2'); // <-- Update here

const app = express();
//  app.use(cors());
app.use(bodyParser.json());
// Allow specific origin
app.use(cors({
  origin: 'http://app.capitalai.info'
}));


const dbConfig = {
    host: 'mysql',
    user: 'userSQU',
    password: '8n0HEUsN8QRpjisv',
    database: 'sampledb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
// const dbConfig = {
//     host: 'localhost',
//     user: 'newuser1',
//     password: 'test123',
//     database: 'budget_tracker',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// };

const db = createPool(dbConfig); // Using createPool from promise version of mysql2
const dbConfigOld = {
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'userSQU',
  password: process.env.DB_PASSWORD || '8n0HEUsN8QRpjisv',
  database: process.env.DB_NAME || 'sampledb',
};
// const dbConfigOld = {
//   host: 'localhost',
//   user: 'newuser1',
//   password: 'test123',
//   database: 'budget_tracker',
// };

// Using mysql2's createConnection method
const dbOld = mysql.createConnection(dbConfig);

// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//   } else {
//     //console.log('Connected to the database');
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
  dbOld.query(query, [user_id, category, expenseName, expenseAmount, expenseType, expenseMonth], (err, result) => {
    if (err) {
      console.error('Error adding expense:', err);
      res.json({ success: false, error: err.message });
    } else {
      res.json({ success: true, expenseId: result.insertId });
    }
  });
});

app.post('/edit-expense', (req, res) => {
  // Log the request body to inspect the values
  console.log('Received request to edit expense:', req.body);

  const { expenseId, expenseName, expenseAmount } = req.body;

  // Log the extracted values
  console.log('Extracted values:', {
    expenseId,
    expenseName,
    expenseAmount
  });

  const query = 'UPDATE expenses SET expense_name = ?, expense_amount = ? WHERE id = ?';

  // Log the query and values being used
  console.log('Executing query:', query, [expenseName, expenseAmount, expenseId]);

  dbOld.query(query, [expenseName, expenseAmount, expenseId], (err, result) => {
    if (err) {
      console.error('Error editing expense:', err);
      res.json({ success: false, error: err.message });
    } else {
      // Log the result of the query
      console.log('Query result:', result);

      if (result.affectedRows === 0) {
        res.json({ success: false, error: "No expense found to update" });
      } else {
        res.json({ success: true });
      }
    }
  });
});



app.put('/delete-transaction', (req, res) => {
  const transaction_id = req.body.transaction_id;

  if (!transaction_id) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
  }

  console.log(`Attempting to delete transaction with ID: ${transaction_id}`);

  // First, get the transaction details
  const getTransactionQuery = 'SELECT * FROM transactions WHERE id = ?';
  dbOld.query(getTransactionQuery, [transaction_id], (err, transactionResults) => {
      if (err) {
          console.error('Error fetching transaction details from transactions table:', err);
          return res.status(500).json({ success: false, error: err.message });
      }

      if (transactionResults.length === 0) {
          console.warn(`Transaction with ID: ${transaction_id} not found in transactions table.`);
          return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }

      const transaction = transactionResults[0];
      console.log(`Fetched transaction:`, transaction);

      const transactionAmount = parseFloat(transaction.transaction_amount);
      const matchedExpenseName = transaction.matched_expense_name;
      const expenseMonth = transaction.transaction_date instanceof Date 
          ? `${transaction.transaction_date.getFullYear()}-${String(transaction.transaction_date.getMonth() + 1).padStart(2, '0')}`
          : transaction.transaction_date.slice(0, 7);

      console.log(`Searching for matching expense for user ID: ${transaction.user_id}, expense name: ${matchedExpenseName}, and expense month: ${expenseMonth}`);

      // Now, find and update the matching expense
      const searchQuery = 'SELECT * FROM expenses WHERE user_id = ? AND expense_name = ? AND expense_month like ?';
      dbOld.query(searchQuery, [transaction.user_id, matchedExpenseName, `${expenseMonth}%`], (err, expenseResults) => {
          if (err) {
              console.error('Error searching for matching expense in expenses table:', err);
              return res.json({ success: false, error: err.message });
          }

          if (expenseResults.length > 0) {
              const expense = expenseResults[0];
              console.log(`Found matching expense:`, expense);

              const newUsedAlready = parseFloat(expense.used_already) - transactionAmount;
              console.log(`Updating used_already for expense ID: ${expense.id} to value: ${newUsedAlready}`);

              const updateQuery = 'UPDATE expenses SET used_already = ? WHERE id = ?';
              dbOld.query(updateQuery, [newUsedAlready, expense.id], (err) => {
                  if (err) {
                      console.error('Error updating used_already in expenses table:', err);
                      return res.json({ success: false, error: err.message });
                  }

                  console.log(`Successfully updated used_already for expense ID: ${expense.id}`);

                  // Now, soft delete the transaction
                  const deleteTransactionQuery = 'UPDATE transactions SET status = "deleted" WHERE id = ?';
                  console.log(`Soft-deleting transaction with ID: ${transaction_id}`);
                  dbOld.query(deleteTransactionQuery, [transaction_id], (err) => {
                      if (err) {
                          console.error('Error soft-deleting transaction in transactions table:', err);
                          return res.json({ success: false, error: err.message });
                      }

                      console.log(`Successfully soft-deleted transaction with ID: ${transaction_id}`);
                      return res.json({
                          success: true,
                          message: 'Transaction deleted and corresponding expense updated successfully.'
                      });
                  });
              });
          } else {
              console.warn(`No expense found for user ID: ${transaction.user_id}, expense name: ${matchedExpenseName}, and expense month: ${expenseMonth}. Transaction with ID: ${transaction_id} not deleted.`);
              return res.status(404).json({ success: false, message: 'Matching expense not found.' });
          }
      });
  });
});



app.post('/add-log-old', (req, res) => {
  const { user_id, category, expenseName, expenseAmount, expenseType, expenseMonth } = req.body;
  //console.log("Request Body:", req.body);

  // Always insert into transactions table first
  const insertTransactionQuery = 'INSERT INTO transactions (user_id, transaction_name, transaction_amount, transaction_date, matched_expense_name,status) VALUES (?, ?, ?, ?, ?, ?)';
  dbOld.query(insertTransactionQuery, [user_id, expenseName, expenseAmount, `${expenseMonth}-01`,expenseName,'alive'], (err, transactionResult) => {
      if (err) {
          console.error('Error adding transaction:', err);
          return res.json({ success: false, error: err.message });
      }
      //console.log(`Added new transaction with ID: ${transactionResult.insertId}`);

      // After inserting transaction, attempt to update expenses table
      const searchQuery = 'SELECT * FROM expenses WHERE user_id = ? AND expense_name = ? AND expense_month like ?';
      dbOld.query(searchQuery, [user_id, expenseName, expenseMonth], (err, results) => {
          if (err) {
              console.error('Error searching for expense:', err);
              return res.json({ success: false, error: err.message });
          }
          if (results.length > 0) {
              // Expense exists, update its used_already column
              const firstMatchingRecord = results[0];
              const newUsedAlready = (parseFloat(firstMatchingRecord.used_already) || 0) + parseFloat(expenseAmount);
              const updateQuery = 'UPDATE expenses SET used_already = ? WHERE id = ?';
              dbOld.query(updateQuery, [newUsedAlready, firstMatchingRecord.id], (err) => {
                  if (err) {
                      console.error('Error updating expense:', err);
                      return res.json({ success: false, error: err.message });
                  }
                  //console.log(`Updated expense with ID ${firstMatchingRecord.id}`);
                  return res.json({
                      success: true,
                      message: `Expense with Name: '${firstMatchingRecord.expense_name}' updated successfully.`
                  });
              });
          } else {
              // No matching expense found, update the "Other" category
              dbOld.query(searchQuery, [user_id, 'Other', expenseMonth], (err, otherResults) => {
                  if (err) {
                      console.error('Error searching for Other expense:', err);
                      return res.json({ success: false, error: err.message });
                  }
                  if (otherResults.length > 0) {
                      const firstMatchingOther = otherResults[0];
                      const newUsedAlready = (parseFloat(firstMatchingOther.used_already) || 0) + parseFloat(expenseAmount);
                      const updateQuery = 'UPDATE expenses SET used_already = ? WHERE id = ?';
                      dbOld.query(updateQuery, [newUsedAlready, firstMatchingOther.id], (err) => {
                          if (err) {
                              console.error('Error updating Other expense:', err);
                              return res.json({ success: false, error: err.message });
                          }
                          //console.log(`Updated "Other" expense with ID ${firstMatchingOther.id}`);
                          return res.json({
                              success: true,
                              message: `Expense with Name: 'Other' updated successfully.`
                          });
                      });
                       // Update the matched_expense_name in transactions table to "Other"
                       const updateTransactionQuery = 'UPDATE transactions SET matched_expense_name = "Other" WHERE id = ?';
                       dbOld.query(updateTransactionQuery, [transactionResult.insertId], (err) => {
                           if (err) {
                               console.error('Error updating transaction:', err);
                               return res.json({ success: false, error: err.message });
                           }
                           console.log(`Updated transaction with ID: ${transactionResult.insertId} to match "Other" expense.`);
                       });
                  } else {
                      // If even "Other" doesn't exist for the month, create it
                      const insertQuery = 'INSERT INTO expenses (user_id, category_id, expense_name, expense_amount, expense_type, expense_month, used_already) VALUES (?, ?, \'Other\', 0, ?, ?, ?)';
                      dbOld.query(insertQuery, [user_id, category, expenseType, `${expenseMonth}-01`, expenseAmount], (err, result) => {
                          if (err) {
                              console.error('Error adding Other expense:', err);
                              return res.json({ success: false, error: err.message });
                          }
                          //console.log(`Added new "Other" expense with ID: ${result.insertId}`);
                          return res.json({ success: true, message: 'New "Other" expense added successfully.' });
                      });
                        // Update the matched_expense_name in transactions table to "Other"
                        const updateTransactionQuery = 'UPDATE transactions SET matched_expense_name = "Other" WHERE id = ?';
                        dbOld.query(updateTransactionQuery, [transactionResult.insertId], (err) => {
                            if (err) {
                                console.error('Error updating transaction:', err);
                                return res.json({ success: false, error: err.message });
                            }
                            //console.log(`Updated transaction with ID: ${transactionResult.insertId} to match "Other" expense.`);
                        });
                  }
              });
          }
      });
  });
});

async function insertTransaction(data) {
    console.log("1/15: Starting transaction insertion...");
    const { user_id, expenseName, expenseAmount, expenseMonth } = data;
    const insertTransactionQuery = 'INSERT INTO transactions (user_id, transaction_name, transaction_amount, transaction_date, matched_expense_name, status) VALUES (?, ?, ?, ?, ?, ?)';
    return new Promise((resolve, reject) => {
        dbOld.query(insertTransactionQuery, [user_id, expenseName, expenseAmount, `${expenseMonth}-01`, expenseName, 'deleted'], (err, result) => {
            if (err) {
                console.error("2/15: Error inserting transaction.", err);
                reject(err);
            } else {
                console.log("2/15: Transaction insertion successful!");
                resolve(result.insertId);
            }
        });
    });
}

async function searchExpense(data) {
    console.log("3/15: Searching for expense...");
    const { user_id, expenseName, expenseMonth } = data;
    const searchQuery = 'SELECT * FROM expenses WHERE user_id = ? AND expense_name = ? AND expense_month like ?';
    return new Promise((resolve, reject) => {
        dbOld.query(searchQuery, [user_id, expenseName, `${expenseMonth}%`], (err, results) => {
            if (err) {
                console.error("4/15: Error searching for expense.", err);
                reject(err);
            } else {
                console.log("4/15: Search for expense completed!");
                resolve(results);
            }
        });
    });
}

async function updateExpense(expense, data) {
    console.log("5/15: Updating expense...");
    const { expenseAmount } = data;
    const newUsedAlready = (parseFloat(expense.used_already) || 0) + parseFloat(expenseAmount);
    const updateQuery = 'UPDATE expenses SET used_already = ? WHERE id = ?';
    return new Promise((resolve, reject) => {
        dbOld.query(updateQuery, [newUsedAlready, expense.id], (err) => {
            if (err) {
                console.error("6/15: Error updating expense.", err);
                reject(err);
            } else {
                console.log("6/15: Expense update successful!");
                resolve();
            }
        });
    });
}

async function updateExpenseById(matchedExpenseId, data,transactionId) {
  console.log("7/15: Updating expense by ID...", matchedExpenseId);
  //console.log("7/15: Updating expense by Data...", data);
  console.log("7/15: Updating expense by Amount...", parseFloat(data.expenseAmount));

  const expenseAmount = parseFloat(data.expenseAmount);
  const updateQuery = 'UPDATE expenses SET used_already = COALESCE(used_already, 0) + ? WHERE id = ?';
  
  return new Promise((resolve, reject) => {
      dbOld.query(updateQuery, [expenseAmount, matchedExpenseId], async (err) => {
          if (err) {
              console.error("8/15: Error updating expense by ID.", err);
              reject(err);
          } else {
              console.log("8/15: Expense update by ID successful!");

              // Fetch the expense_name for the given ID from expenses table
              const fetchExpenseNameQuery = 'SELECT expense_name FROM expenses WHERE id = ?';
              dbOld.query(fetchExpenseNameQuery, [matchedExpenseId], (err, results) => {
                  if (err) {
                      console.error('Error fetching expense name:', err);
                      reject(err);
                  } else {
                      console.log('Fetching expense name: ',results[0].expense_name);
                      const expenseName = results[0].expense_name;

                      // Update the matched_expense_name in transactions table based on fetched expense_name
                      const updateTransactionQuery = 'UPDATE transactions SET matched_expense_name = ?, status = "alive" WHERE id = ?';
                      dbOld.query(updateTransactionQuery, [expenseName, transactionId], (err) => {
                          if (err) {
                              console.error('Error updating transaction:', err);
                              reject(err); // make sure to reject here to send error back to caller
                          } else {
                              console.log(`Updated transaction with ID: ${transactionId} to match "${expenseName}" expense and set status to "alive".`);
                              resolve();
                          }
                      });
                  }
              });
          }
      });
  });
}


app.post('/add-log', async (req, res) => {
  console.log("9/15: Received POST request for smart-add-log...", req.body);
  const system_message = `
      Please classify the following expense based on its details:
      User Query: ${req.body.expenseName}
              `;
  try {
      const transactionId = await insertTransaction(req.body); // capture the returned transaction ID
      const expenses = await searchExpense(req.body);
      if (expenses.length) {
          console.log("10/15: Expense found! Going to update it...");
          await updateExpense(expenses[0], req.body);
      } else {
          console.log("11/15: Expense not found. Trying matched expense logic...");

          const result = await Promise.race([
            getMatchedExpenseLogic(req.body.user_id, req.body.expenseMonth, system_message)
            .then(matchedExpenseId => {
                if (matchedExpenseId === '0') {
                    return { status: "not-resolved", matchedExpenseId }; 
                } else {
                    return { status: "resolved", matchedExpenseId };
                }
            }),
            new Promise(resolve => setTimeout(() => resolve({ status: "pending" }), 3000)) // 3 seconds timeout
        ]);
        

          console.log("Promise Status:", result.status);
          console.log("Promise result.matchedExpenseId:", result.matchedExpenseId.matchedExpenseId);

          if (result.status === "resolved") {
            const matchedExpenseId = result.matchedExpenseId.matchedExpenseId;
            if (matchedExpenseId && matchedExpenseId !== '0') {
                console.log("Promise Status: Matched expense found. Going to update it...");
                await updateExpenseById(matchedExpenseId, req.body, transactionId);
            } else {
                console.log("Promise Status: No matched expense found. Going to create or update 'Other' expense...");
                await createOrUpdateOtherExpense(req.body, transactionId);
            }
        } else {
            console.error("Promise Status: Timeout reached when trying to get matched expense!");
        }
        
      }
      console.log("14/15: All processes successful! Sending success response...");
      res.json({ success: true, message: 'Processed successfully' });
  } catch (error) {
      console.error("15/15: Error processing request:", error.message);
      res.json({ success: false, error: error.message });
  }
});


async function createOrUpdateOtherExpense(data,transactionId) {
  console.log("16/20: Starting to create or update 'Other' expense...");
  const { user_id, expenseAmount, expenseMonth, category, expenseType } = data;

  // Search for an "Other" expense in the specified month
  const searchQuery = 'SELECT * FROM expenses WHERE user_id = ? AND expense_name = "Other" AND expense_month like ?';
  return new Promise((resolve, reject) => {
      dbOld.query(searchQuery, [user_id, `${expenseMonth}%`], async (err, otherResults) => {
          if (err) {
              console.error("17/20: Error searching for 'Other' expense.", err);
              reject(err);
          } else if (otherResults.length > 0) {
              // If "Other" expense exists, update it
              console.log("18/20: 'Other' expense found! Going to update it...");
              const firstMatchingOther = otherResults[0];
              const newUsedAlready = (parseFloat(firstMatchingOther.used_already) || 0) + parseFloat(expenseAmount);
              const updateQuery = 'UPDATE expenses SET used_already = ? WHERE id = ?';

              dbOld.query(updateQuery, [newUsedAlready, firstMatchingOther.id], (err) => {
                  if (err) {
                      console.error("19/20: Error updating 'Other' expense.", err);
                      reject(err);
                  } else {
                      console.log(`19/20: Successfully updated 'Other' expense with ID ${firstMatchingOther.id}!`);
                      resolve({ success: true, message: `Updated "Other" expense with ID ${firstMatchingOther.id}` });
                  }
              });
              // Update the matched_expense_name in transactions table to "Other"
              const updateTransactionQuery = 'UPDATE transactions SET matched_expense_name = "Other", status = "alive" WHERE id = ?';
              dbOld.query(updateTransactionQuery, [transactionId], (err) => {
                  if (err) {
                      console.error('Error updating transaction:', err);
                      return res.json({ success: false, error: err.message });
                  }
                  console.log(`Updated transaction with ID: ${transactionId} to match "Other" expense and set status to "alive".`);
              });
              
          } else {
              // If "Other" expense doesn't exist, create a new one
              console.log("18/20: 'Other' expense not found. Going to create a new one...");
              const insertQuery = 'INSERT INTO expenses (user_id, category_id, expense_name, expense_amount, expense_type, expense_month, used_already) VALUES (?, ?, "Other", 0, ?, ?, ?)';

              dbOld.query(insertQuery, [user_id, category, expenseType, `${expenseMonth}-01`, expenseAmount], (err, result) => {
                  if (err) {
                      console.error("19/20: Error creating new 'Other' expense.", err);
                      reject(err);
                  } else {
                      console.log(`20/20: Successfully created new 'Other' expense with ID: ${result.insertId}!`);
                      resolve({ success: true, message: `Added new "Other" expense with ID: ${result.insertId}` });
                  }
              });
              // Update the matched_expense_name in transactions table to "Other"
              const updateTransactionQuery = 'UPDATE transactions SET matched_expense_name = "Other", status = "alive" WHERE id = ?';
              dbOld.query(updateTransactionQuery, [transactionId], (err) => {
                  if (err) {
                      console.error('Error updating transaction:', err);
                      return res.json({ success: false, error: err.message });
                  }
                  console.log(`Updated transaction with ID: ${transactionId} to match "Other" expense and set status to "alive".`);
              });
          }
          
      });
  });
}

// app.post('/smart-add-log-old', async (req, res) => {
//   const { user_id, category, expenseName, expenseAmount, expenseType, expenseMonth } = req.body;
//   console.log("Request Body:", req.body);

//   // Insert the new transaction first
//   const insertTransactionQuery = 'INSERT INTO transactions (user_id, transaction_name, transaction_amount, transaction_date, matched_expense_name, status) VALUES (?, ?, ?, ?, ?, ?)';
//   dbOld.query(insertTransactionQuery, [user_id, expenseName, expenseAmount, `${expenseMonth}-01`, expenseName, 'deleted'], async (err, transactionResult) => {
//       if (err) {
//           console.error('Error adding transaction:', err);
//           return res.json({ success: false, error: err.message });
//       }
//       console.log(`Added new transaction with ID: ${transactionResult.insertId}`);

//       const searchQuery = 'SELECT * FROM expenses WHERE user_id = ? AND expense_name = ? AND expense_month like ?';
//       dbOld.query(searchQuery, [user_id, expenseName, `${expenseMonth}%`], async (err, results) => {
//           if (err) {
//               console.error('Error searching for expense:', err);
//               return res.json({ success: false, error: err.message });
//           }

//           if (results.length > 0) {
//               // If expense name matches
//               const firstMatchingRecord = results[0];
//               const newUsedAlready = (parseFloat(firstMatchingRecord.used_already) || 0) + parseFloat(expenseAmount);
//               const updateQuery = 'UPDATE expenses SET used_already = ? WHERE id = ?';

//               dbOld.query(updateQuery, [newUsedAlready, firstMatchingRecord.id], (err) => {
//                   if (err) {
//                       console.error('Error updating expense:', err);
//                       return res.json({ success: false, error: err.message });
//                   }
//                   console.log(`Updated expense with ID ${firstMatchingRecord.id}`);
//                   return res.json({ success: true, message: `Expense with Name: '${firstMatchingRecord.expense_name}' updated successfully.` });
//               });
//           } else {
//                      // If name doesn't match, use /getmatchedexpense to get expense id
//         const system_message = `
//         Please classify the following expense based on its details:
//         User Query: ${expenseName}
//                 `;
        
//                 try {
//                     // console.log('Querying /getmatchedexpense endpoint...');
//                     // const matchedExpenseResponse = await axios.post('http://localhost:5000/getmatchedexpense', {
//                     //     user_id: user_id,
//                     //     expense_month: expenseMonth,
//                     //     prompt: system_message
//                     // });
        
//                     // if (matchedExpenseResponse.data.success) {
//                     //     const matchedExpenseId = matchedExpenseResponse.data.matchedExpenseId;
//                     console.log('Querying getMatchedExpenseLogic function...');
//                     //const matchedExpenseResponse = await getMatchedExpenseLogic(user_id, expenseMonth, system_message);
        
//                     const result = await Promise.race([
//                       getMatchedExpenseLogic(user_id, expenseMonth, system_message),
//                       new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500000))
//                     ]);
//                     console.log('ID Found: ',result.matchedExpenseId)
//                     console.log('Result : ',result)
//                     if (result.matchedExpenseId) {
//                         const matchedExpenseId = matchedExpenseResponse.matchedExpenseId;
        
//                         // Use the matched expense id to update the expense
//                         const updateQuery = 'UPDATE expenses SET used_already = used_already + ? WHERE id = ?';
//                         dbOld.query(updateQuery, [expenseAmount, matchedExpenseId], (err) => {
//                             if (err) {
//                                 console.error('Error updating expense using matched expense ID:', err);
//                                 return res.json({ success: false, error: err.message });
//                             }
//                             console.log(`Updated expense with ID ${matchedExpenseId} using matched expense ID.`);
//                             return res.json({ success: true, message: `Expense with ID: ${matchedExpenseId} updated successfully.` });
//                         });
//                     } else {
//                         console.log("No matched expense ID found.", matchedExpenseResponse.data.message);
//                     }
//                 } catch (error) {
//                   console.error("Error in getMatchedExpenseLogic:", error.message);
//                     console.error("Error querying /getmatchedexpense endpoint:", error);
//                   console.error("Error with OpenAI completion:", error);
//                   return res.json({ success: false, error: 'Error processing with OpenAI.' });
//               }

//               // If OpenAI also fails or returns '0', then try "Other" category
//               dbOld.query(searchQuery, [user_id, 'Other', `${expenseMonth}%`], async (err, otherResults) => {
//                   if (err) {
//                       console.error('Error searching for Other expense:', err);
//                       return res.json({ success: false, error: err.message });
//                   }

//                   if (otherResults.length > 0) {
//                       const firstMatchingOther = otherResults[0];
//                       const newUsedAlready = (parseFloat(firstMatchingOther.used_already) || 0) + parseFloat(expenseAmount);
//                       const updateQuery = 'UPDATE expenses SET used_already = ? WHERE id = ?';

//                       dbOld.query(updateQuery, [newUsedAlready, firstMatchingOther.id], (err) => {
//                           if (err) {
//                               console.error('Error updating Other expense:', err);
//                               return res.json({ success: false, error: err.message });
//                           }
//                           console.log(`Updated "Other" expense with ID ${firstMatchingOther.id}`);
//                           return res.json({ success: true, message: `Expense with Name: 'Other' updated successfully.` });
//                       });
//                   } else {
//                       // If even "Other" doesn't exist for the month, create it
//                       const insertQuery = 'INSERT INTO expenses (user_id, category_id, expense_name, expense_amount, expense_type, expense_month, used_already) VALUES (?, ?, \'Other\', 0, ?, ?, ?)';

//                       dbOld.query(insertQuery, [user_id, category, expenseType, `${expenseMonth}-01`, expenseAmount], (err, result) => {
//                           if (err) {
//                               console.error('Error adding Other expense:', err);
//                               return res.json({ success: false, error: err.message });
//                           }
//                           console.log(`Added new "Other" expense with ID: ${result.insertId}`);
//                           return res.json({ success: true, message: 'New "Other" expense added successfully.' });
//                       });
//                   }
//               });
//           }
//       });
//   });
// });


app.get('/get-category-by-name', (req, res) => {
  //console.log('Received request for /get-category-by-name'); // Log when the route is hit
  //console.log('Query Parameters:', req.query); // Log the received query parameters

  const { expense_name, expense_month } = req.query;
  if (!expense_name || !expense_month) {
      console.log('Missing expense_name or expense_month'); // Log if parameters are missing
      return res.status(400).json({
          success: false,
          message: 'Please provide both expense_name and expense_month.'
      });
  }

  // Construct the SQL query
  const sql = `
      SELECT c.category_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.expense_name = ? AND e.expense_month LIKE ?
  `;

  //console.log('Constructed SQL:', sql); // Log the constructed SQL
  //console.log('Parameters:', [expense_name, `${expense_month}`]); // Log the SQL parameters

  // Execute the SQL query
  dbOld.query(sql, [expense_name, `${expense_month}%`], (err, results) => {
      if (err) {
          console.error('SQL Error:', err); // Log any SQL errors
          return res.status(500).json({
              success: false,
              message: 'Server Error',
              error: err
          });
      }

      //console.log('SQL Results:', results); // Log the results from the SQL query
      res.json({
          success: true,
          data: results
      });
  });
});

app.get('/get-transactions', (req, res) => {
  const user_id = req.query.user_id;
  const dateInput = req.query.date;  // Can be YYYY-MM or YYYY-MM-DD format

  if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  if (!dateInput) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
  }

  let fetchQuery;
  if (dateInput.length === 7) {  // YYYY-MM format
      fetchQuery = `
        SELECT * FROM transactions 
        WHERE user_id = ? 
        AND status != "deleted"
        AND MONTH(transaction_date) = MONTH(STR_TO_DATE(?, '%Y-%m'))
        AND YEAR(transaction_date) = YEAR(STR_TO_DATE(?, '%Y-%m'))
      `;
  } else {  // Assuming YYYY-MM-DD format
      fetchQuery = `
        SELECT * FROM transactions 
        WHERE user_id = ? 
        AND status != "deleted"
        AND DATE(transaction_date) like ?
      `;
  }

  dbOld.query(fetchQuery, [user_id, dateInput,  `${dateInput}%`], (err, results) => {
      if (err) {
          console.error('Error fetching transactions:', err);
          return res.status(500).json({ success: false, error: err.message });
      }
      
      return res.json({
          success: true,
          transactions: results
      });
  });
});



app.put('/edit-budget-status', (req, res) => {
  const { user_id, month, newStatus } = req.body;

  const query = 'UPDATE budget_status SET status = ? WHERE user_id = ? AND `year_month` LIKE ?';
  const queryParams = [newStatus, user_id, `${month}%`];

  // Log the query and query parameters
  //console.log('Query:', query);
  //console.log('Query Params:', queryParams);

  // Perform the query
  dbOld.query(query, queryParams, (err, result) => {
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
  //console.log('Query:', query);
  //console.log('Query Params:', queryParams);

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

app.get('/get-ongoing-budget-month', (req, res) => {
  const { user_id } = req.query;

  const query = 'SELECT DATE_FORMAT(`year_month`, "%Y-%m") as formatted_date FROM budget_status WHERE user_id = ? AND status = ?';
  const queryParams = [user_id, 'ongoing'];

  // Log the query and query parameters
  //console.log('Query:', query);
  //console.log('Query Params:', queryParams);

  // Perform the query
  dbOld.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error fetching ongoing budget month:', err);
      res.json({ success: false, error: err.message });
    } else {
      if (result.length === 0) {
        res.json({ success: false, message: 'No ongoing budget month found for the user' });
      } else {
        // If there are multiple ongoing months (though ideally there shouldn't be), this will return all of them.
        const ongoingMonths = result.map(row => row.formatted_date);
        res.json({ success: true, ongoingMonths: ongoingMonths });
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
  dbOld.query(query, [usedAlready, expenseId, user_id], (err, result) => {
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
  const { prompt, max_tokens, user_id  } = req.body;

  //console.log("Received request with prompt:", prompt);

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    //console.log("Invalid prompt provided.");
    return res.status(400).json({ error: "Invalid prompt provided." });
  }

  try {
    const completion = await openai.completions.create({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: max_tokens || 1000
    });

    //console.log("Completion response:", completion);

    // Extracting token usages
    const {
        prompt_tokens, 
        completion_tokens, 
        total_tokens
    } = completion.usage;

    // Save the query, response, model, and token usage to the database
    const queryText = prompt;
    const responseText = completion.choices[0].text.trim();
    const modelName = "text-davinci-003";  // or you can dynamically get it from the completion response, if available

    const saveQuery = `
        INSERT INTO chatgpt_queries (user_id, query, response, model, prompt_tokens, completion_tokens, total_tokens,api_endpoint)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(saveQuery, [user_id, queryText, responseText, modelName, prompt_tokens, completion_tokens, total_tokens,"/chat"], (err, result) => {
        if (err) {
            console.error('Error saving query-response:', err);
        } else {
            //console.log('Query-response saved successfully!');
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


// Apply rate limiter to the ChatGPT endpoint
app.use("/getClassifications", limiter);

const delimiter = "####";
const system_message = `
Based on the content of the user's query, classify it into one of the following categories by providing the category's ID:
1	Other
2	Saving for emergency fund
3	Saving for big purchase
4	Other savings
5	Investment
6	Housing
7	Groceries
8	Utilities & Subscriptions
9	Transportation
10	Household Items
11	Personal care
12	Childcare
13	Eating out by myself
14	Pets
15	Medical care
16	Insurance
17	Debt
18	Clothing
19	Saving for traveling
20	Education
21	Eating out to make friends
22	Entertainment 
23	Gifts/Donations

`;


// Apply rate limiter to the ChatGPT endpoint
app.use("/getClassifications", limiter);
app.post("/getClassifications", async (req, res) => {
  const { prompt, max_tokens, user_id } = req.body;

  //console.log("Received request with prompt:", prompt);

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    //console.log("Invalid prompt provided.");
    return res.status(400).json({ error: "Invalid prompt provided." });
  }

  try {
    const completion = await openai.completions.create({
        model: "text-davinci-003",
        prompt: `
        Based on the content of the user's query, classify it into one of the following categories by providing the category's ID:
        
        "#","CATEGORY","DESCRIPTION"
        "1","Other",""
        "2","Saving for emergency fund","Emergency fund"
        "3","Saving for big purchase","Big purchases like a new mattress or laptop"
        "4","Other savings",""
        "5","Investment","Financial planning\nInvesting"
        "6","Housing","If you currently rent a house, apartment or a room, your housing costs may be limited to your monthly rent and renters insurance. if you own a home includes your mortgage payment, as well as property taxes, home repairs, homeowners association dues and more."
        "7","Groceries","Food/Supplies - groceries"
        "8","Utilities & Subscriptions","Utilities - Water, gas, electricity, mobile phone, internet, TV licence, council tax, Subscriptions (Netflix, Amazon, Hulu, etc.)"
        "9","Transportation","Transportation - petrol, train tickets, bus fare, car maintenance, car loan payment, parking, Taxi/Uber"
        "10","Household Items","cleaning supplies,Toiletries\nLaundry detergent\nDishwasher detergent\nCleaning supplies\nTools"
        "11","Personal care","Gym memberships\nHaircuts\nSalon services\nCosmetics (like makeup or services like laser hair removal)"
        "12","Childcare","nursery, babysitting, daycare, school trips/meals/uniform"
        "13","Eating out by myself",""
        "14","Pets","Pets - food, vet bills, treats, toys, flea/tick treatment"
        "15","Medical care","Primary care\nDental care\nSpecialty care (dermatologists, orthodontics, optometrists, etc.)\nUrgent care\nMedications\nMedical devices"
        "16","Insurance","Health insurance\nHomeowner’s or renter’s insurance\nHome warranty or protection plan\nAuto insurance\nLife insurance\nDisability insurance"
        "17","Debt","Personal loans\nStudent loans\nCredit cards"
        "18","Clothing","Adults’ clothing\nAdults’ shoes\nChildren’s clothing\nChildren’s shoes"
        "19","Saving for traveling",""
        "20","Education","Children’s college\nYour college\nSchool supplies\nBooks"
        "21","Eating out to make friends","Eating at restaurants"
        "22","Entertainment","Alcohol and/or bars\nGames\nMovies\nConcerts\nVacations"
        "23","Gifts/Donations","Gifts - birthdays, anniversaries, holidays, special events"
        
        User Queary: `+prompt,
        max_tokens: max_tokens || 1000
    });

    //console.log("Completion response:", completion);

    // Extracting token usages
    const {
        prompt_tokens, 
        completion_tokens, 
        total_tokens
    } = completion.usage;

    // Save the query, response, model, and token usage to the database
    const queryText = prompt;
    const responseText = completion.choices[0].text.trim();

    const regex = /(\d+)/;
    const matches = responseText.match(regex);
    
    let extractedInteger;
    
    if (matches) {
        extractedInteger = parseInt(matches[1], 10);
    } else {
        extractedInteger = 1;
    }
    
    console.log(responseText);  // This will log the integer or 1 if no integer is found
    
    const modelName = "text-davinci-003";  // or you can dynamically get it from the completion response, if available

    const saveQuery = `
        INSERT INTO chatgpt_queries (user_id, query, response, model, prompt_tokens, completion_tokens, total_tokens,api_endpoint)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(saveQuery, [user_id, queryText, responseText, modelName, prompt_tokens, completion_tokens, total_tokens,"/getClassifications"], (err, result) => {
        if (err) {
            console.error('Error saving query-response:', err);
        } else {
            //console.log('Query-response saved successfully!');
        }
    });

    // res.send(responseText);
    res.send(String(extractedInteger));


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

async function getMatchedExpenseLogic(userId, expenseMonth, systemMessage) {
  console.log("OPEN AI 1/10: getMatchedExpenseLogic STARTED");
  
  return new Promise((resolve, reject) => {
      console.log("OPEN AI 2/10: Inside the promise for /getmatchedexpense", userId, expenseMonth, systemMessage);

      if (!userId || !expenseMonth || !systemMessage) {
          console.log("OPEN AI 3/10: Required fields missing");
          return reject({ message: 'User ID, expenseMonth, and systemMessage are required.' });
      }

      const fetchQuery = "SELECT id,expense_name FROM expenses WHERE user_id = ? AND expense_month like ?";
      dbOld.query(fetchQuery, [userId, expenseMonth], async (err, expenses) => {
          if (err) {
              console.error("OPEN AI 4/10: Error fetching expenses:", err);
              return reject({ message: err.message });
          }

          console.log("OPEN AI 5/10: Successfully fetched expenses");

          const system_message = `
Based on the content of the user's query, classify it into one of the following categories by providing the category's ID, if not found, reply 0 or not found:
${expenses.map(expense => `${expense.id}: ${expense.expense_name}`).join('\n')}
          `;

          try {
              console.log("OPEN AI 6/10: Requesting OpenAI's completion");
              const completion = await openai.completions.create({
                  model: "text-davinci-003",
                  prompt: system_message + "\nUser Query: " + systemMessage,
                  max_tokens: 100
              });

              console.log("OPEN AI 7/10: OpenAI completion received");

              const responseText = completion.choices[0].text.trim();
              const regex = /(\d+)/;
              const matches = responseText.match(regex);

              let extractedInteger = matches ? parseInt(matches[1], 10) : 0;

              console.log(`OPEN AI 8/10: Extracted matched expense ID: ${extractedInteger}`);

              // Start the database save in parallel.
              saveToDatabase(userId, systemMessage, responseText, completion)
                  .catch(err => console.error("Failed to save to database:", err));
  
              // Resolve immediately with the extracted ID.
              resolve({ matchedExpenseId: extractedInteger });
              
          } catch (error) {
              console.error("Error generating completion:", error);
              return reject({ message: "Error generating completion." });
          }
      });
  });
}
async function saveToDatabase(userId, systemMessage, responseText, completion) {
  console.log("OPEN AI Query DB 1/3: Successfully received query-response");
  const saveQuery = `
INSERT INTO chatgpt_queries (user_id, query, response, model, prompt_tokens, completion_tokens, total_tokens, api_endpoint)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
      db.query(saveQuery, [userId, systemMessage, responseText, "text-davinci-003", completion.usage.prompt_tokens, completion.usage.completion_tokens, completion.usage.total_tokens, "/getmatchedexpense"], (err, result) => {
          if (err) {
              console.error("OPEN AI Query DB 2/3: Error saving query-response:", err);
              console.log("OPEN AI Query DB 2/3: Error saving query-response:", err);
              reject({ message: err.message });
          } else {
              console.log("OPEN AI Query DB 3/3: Successfully saved query-response");
              resolve();
          }
      });
  });
}


app.use("/getmatchedexpense", limiter);

app.post("/getmatchedexpense", async (req, res) => {
    console.log('Received request for /getmatchedexpense',req);
    
    const user_id = req.body.user_id;
    const expense_month = req.body.expense_month;
    const prompt = req.body.prompt;

    if (!user_id || !expense_month || !prompt) {
        console.log('Required fields missing');
        return res.status(400).json({ success: false, message: 'User ID, expense_month, and prompt are required.' });
    }

    // Fetch expenses for the user and month
    const fetchQuery = "SELECT id,expense_name FROM expenses WHERE user_id = ? AND expense_month = ?";
    dbOld.query(fetchQuery, [user_id, expense_month], async (err, expenses) => {
        if (err) {
            console.error('Error fetching expenses:', err);
            return res.status(500).json({ success: false, error: err.message });
        }

        console.log(`Fetched ${expenses.length} expenses for user ${user_id} and month ${expense_month}`);

        // Generate system message dynamically based on the fetched expenses
        const system_message = `
Based on the content of the user's query, classify it into one of the following categories by providing the category's ID, if not found, reply 0 or not found:
${expenses.map(expense => `${expense.id}: ${expense.expense_name}`).join('\n')}
        `;

        try {
            console.log('Generating OpenAI completion...');
            const completion = await openai.completions.create({
                model: "text-davinci-003",
                prompt: system_message + "\nUser Query: " + prompt,
                max_tokens: 100
            });

            console.log('Received completion from OpenAI');

            const {
                prompt_tokens, 
                completion_tokens, 
                total_tokens
            } = completion.usage;

            const responseText = completion.choices[0].text.trim();
            const regex = /(\d+)/;
            const matches = responseText.match(regex);

            let extractedInteger;

            if (matches) {
                extractedInteger = parseInt(matches[1], 10);
            } else {
                extractedInteger = 0; // Default value
            }

            console.log(`Extracted expense_id: ${extractedInteger}`);

            const modelName = "text-davinci-003"; 
            const apiEndpoint = "/getmatchedexpense";
            
            const saveQuery = `
                INSERT INTO chatgpt_queries (user_id, query, response, model, prompt_tokens, completion_tokens, total_tokens, api_endpoint)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
    
            db.query(saveQuery, [user_id, prompt, responseText, modelName, prompt_tokens, completion_tokens, total_tokens, apiEndpoint], (err, result) => {
                if (err) {
                    console.error('Error saving query-response:', err);
                    return res.status(500).json({ success: false, error: err.message });
                } else {
                    console.log('Query-response saved successfully!');
                    console.log('getMatchedExpenseLogic FINISHED');
                    return extractedInteger;

                }
            });
        } catch (error) {
            console.error("Error generating completion:", error);
    
            if (error instanceof OpenAI.APIError) {
                console.error("OpenAI API Error:", error);
    
                return res.status(500).json({
                    error: error.message,
                    code: error.code,
                    type: error.type,
                    status: error.status
                });
            } else {
                console.error("Non-API error:", error);
                return res.status(500).json({ error: "Error generating completion." });
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
  dbOld.query(query, [expenseId, user_id], (err, result) => {
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
app.get('/get-expenses-for-logging', (req, res) => {
  const { user_id, month } = req.query;

  // Trim the month value to remove whitespace and newline characters
  const trimmedMonth = month.trim();

  const query = `
    SELECT expenses.*, categories.category_name 
    FROM expenses 
    LEFT JOIN categories ON expenses.category_id = categories.id 
    WHERE expenses.user_id = ? 
    AND DATE_FORMAT(expenses.expense_month, "%Y-%m") LIKE ? 
    AND expenses.used_already IS NOT NULL`;

  const queryParams = [user_id, `${trimmedMonth}%`];

  // Log the query and query parameters
  //console.log('Query:', query);
  //console.log('Query Params:', queryParams);

  // Perform the query
  dbOld.query(query, queryParams, (err, result) => {
    if (err) {
      console.error('Error fetching expenses for logging:', err);
      res.json({ success: false, error: err.message });
    } else {
      res.json({ success: true, expenses: result });
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
  //console.log('Query:', query);
  //console.log('Query Params:', queryParams);

  // Perform the query
  dbOld.query(query, queryParams, (err, result) => {
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

  //console.log('Received request to fetch preferences for userId:', userId); // Log incoming request

  const getPreferences = `
    SELECT * FROM user_preferences WHERE user_id = ?
  `;

  dbOld.query(getPreferences, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching preferences for userId:', userId, 'Error:', err);
      return res.json({ success: false, error: err.message });
    }
    
    if (results && results.length) {
      // //console.log('Successfully fetched preferences for userId:', userId, 'Data:', JSON.stringify(results[0]).substr(0, 300) + '...'); // Logging first 300 characters for brevity. Adjust as needed.
    } else {
      //console.log('No preferences found for userId:', userId);
    }

    res.json({ success: true, data: results[0] });  // Assuming each user has only one row of preferences.
  });
});



const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

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
app.post('/preferences/:userId', (req, res) => {
  const userId = req.params.userId;
  const { language, locale, currency, dateFormat, moneyFormat, ai_coach, monthly_income } = req.body;
  console.log(`[${getCurrentTimestamp()}] Attempting to set preferences for user ${userId}:`, req.body);
  // Check if user preferences already exist
  const checkQuery = `SELECT * FROM user_preferences WHERE user_id = ?`;

  const insertPreferences = `INSERT INTO user_preferences (user_id, language, locale, currency, dateFormat, moneyFormat, ai_coach, monthly_income) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  const updatePreferences = `UPDATE user_preferences SET language = COALESCE(?, language), locale = COALESCE(?, locale), currency = COALESCE(?, currency), dateFormat = COALESCE(?, dateFormat), moneyFormat = COALESCE(?, moneyFormat), ai_coach = COALESCE(?, ai_coach), monthly_income = COALESCE(?, monthly_income) WHERE user_id = ?`;

  dbOld.query(checkQuery, [userId], (err, results) => {
      if (err) {
         console.log(`[${getCurrentTimestamp()}] Attempting to set preferences for user ${userId}:`, req.body);
          console.error('Error checking preferences:', err);
          return res.json({ success: false, error: err.message });
      }

      if (results.length > 0) {
          // Preferences already exist, so update
         // console.log(`[${getCurrentTimestamp()}] User ${userId} already has preferences. Updating...`);
          dbOld.query(updatePreferences, [language, locale, currency, dateFormat, moneyFormat, ai_coach, monthly_income, userId], (err, result) => {
              if (err) {
                console.error(`[${getCurrentTimestamp()}] Error updating preferences for user ${userId}:`, err);
                  console.error('Error updating preferences:', err);
                  return res.json({ success: false, error: err.message });
              }
             // console.log(`[${getCurrentTimestamp()}] Preferences updated successfully for user ${userId}.`);
              res.json({ success: true, message: 'Preferences updated successfully!' });
          });
      } else {
        //console.log(`[${getCurrentTimestamp()}] No preferences found for user ${userId}. Inserting new entry...`);
          // No preferences found, so insert new entry
          dbOld.query(insertPreferences, [userId, language, locale, currency, dateFormat, moneyFormat, ai_coach, monthly_income], (err, result) => {
              if (err) {
                console.error(`[${getCurrentTimestamp()}] Error inserting preferences for user ${userId}:`, err);
                  console.error('Error inserting preferences:', err);
                  return res.json({ success: false, error: err.message });
              }
              //console.log(`[${getCurrentTimestamp()}] Preferences saved successfully for user ${userId}.`);
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

  //console.log('Query:', query);
  //console.log('Query Params:', queryParams);

  try {
    const result = await db.query(query, queryParams);
    // // Data Retrieval: Log the entire result object to see the structure
    // //console.log('Database query result:', result);

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
          { expiresIn: '960h' }
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
      await connection.query('DELETE FROM expenses WHERE user_id = ?', [userId]);

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
