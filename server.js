const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 5050;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'FitnessApp', //Password for your Database
  port: 5432,
});

app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Routes
// Create new user (Completed)
app.post('/createuser', async (req, res) => {
  const { user, entry, dataSet } = req.body;
  const { displayName, email, dob, height, uid } = user;
  const { label, unit } = dataSet;
  const { measurement, timeStamp } = entry;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      'INSERT INTO users (displayname, email, dob, height, firebase_uid) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [displayName, email, dob, height, uid]
    );
    const userId = userResult.rows[0].id;

    const dataSet = await client.query(
      'INSERT INTO dataset (userid, label, unit) VALUES ($1, $2, $3) RETURNING id',
      [userId, label, unit]
    );
    const datasetId = dataSet.rows[0].id;

    const entry = await client.query(
      'INSERT INTO entry (datasetid, measurement, timestamp) VALUES ($1, $2, $3)',
      [datasetId, measurement, timeStamp]
    );

    await client.query('COMMIT');
    client.release();

    res
      .status(201)
      .json({ message: 'User and related data inserted successfully' });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error('Error creating user', err);
    res.status(500).send('Internal Server Error');
  }
});

// Get user information
app.get('/retrieveuser/:uid', async (req, res) => {
  const uid = req.params.uid;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // res.status(200).json(`Hello, I am ${uid}`);
    if (!uid) {
      return res.status(400).json({ error: 'uid parameter is missing' });
    }
    const query = `
      SELECT
          users.*,
          dataset.label AS dataset_label,
          dataset.unit AS dataset_unit,
          entry.measurement AS entry_measurement,
          entry.timestamp AS entry_timestamp
      FROM
          users
      LEFT JOIN
          dataset ON users.id = dataset.userid
      LEFT JOIN
          entry ON dataset.id = entry.datasetid
      WHERE
          users.firebase_uid = $1`;
    client.query(query, [uid], (err, results) => {
      if (err) {
        console.error('Error fetching user data:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (results.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userData = {
        id: results.rows[0].id,
        email: results.rows[0].email,
        dob: results.rows[0].dob,
        height: results.rows[0].height,
        displayname: results.rows[0].displayname,
        firebase_uid: results.rows[0].firebase_uid,
        relatedData: results.rows.map((row) => ({
          dataset_label: row.dataset_label,
          dataset_unit: row.dataset_unit,
          entry_measurement: row.entry_measurement,
          entry_timestamp: row.entry_timestamp,
        })),
      };
      res.status(200).json(userData);
    });
  } catch (err) {
    console.error('Error:', err);
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add fitness entry
app.post('/adddata', async (req, res) => {
  // console.log(req.body); // Test
  const { userId, label, unit, measurement, timestamp } = req.body;

  try {
    const datasetResult = await pool.query(
      'INSERT INTO dataset (userid, label, unit) VALUES ($1, $2, $3) RETURNING id',
      [userId, label, unit]
    );

    const datasetId = datasetResult.rows[0].id;

    await pool.query(
      'INSERT INTO entry (datasetid, measurement, timestamp) VALUES ($1, $2, $3)',
      [datasetId, measurement, timestamp]
    );

    res.status(201).json({ message: 'Data added successfully' });
  } catch (error) {
    console.error('Error adding data:', error);
    res.status(500).send('Internal server error');
  }
});

// Add custom fitness dataSet (To be completed)
app.post('/users/:userId/fitness/custom', (req, res) => {});

// Start server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

module.exports = app;
