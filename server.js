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
  const { user, dataSet } = req.body;
  const { displayName, email, dob, height, uid } = user;
  const { label, unit, entries } = dataSet;
  // const { measurement, timeStamp } = entry;
  const [{ measurement, timeStamp }] = entries;
  // console.log(measurement, timeStamp);
  console.log(entries);

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
    await client.query(
      'INSERT INTO entry (datasetid, measurement, timestamp) VALUES ($1, $2, $3)',
      [datasetId, Number(measurement), timeStamp]
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

    if (!uid) {
      return res.status(400).json({ error: 'uid parameter is missing' });
    }

    const query = `
      SELECT
          users.*,
          dataset.id AS dataset_id,
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

    const { rows } = await client.query(query, [uid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = {
      user: {
        email: rows[0].email,
        dob: rows[0].dob,
        height: rows[0].height,
        displayName: rows[0].displayname,
        uid: rows[0].firebase_uid,
      },
      datasets: rows.reduce((acc, row) => {
        const datasetExists = acc.find((data) => data.id === row.dataset_id);
        if (!datasetExists) {
          acc.push({
            id: row.dataset_id,
            label: row.dataset_label,
            unit: row.dataset_unit,
            entries: [],
          });
        }
        const datasetIndex = acc.findIndex(
          (data) => data.id === row.dataset_id
        );
        acc[datasetIndex].entries.push({
          measurement: row.entry_measurement,
          timestamp: row.entry_timestamp,
        });
        return acc;
      }, []),
    };

    res.status(200).json(userData);
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
  const { uid, measurement, timestamp } = req.body;
  const label = 'weight';
  const unit = 'kg';
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const userQuery = await client.query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [uid]
    );
    if (userQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userQuery.rows[0].id;
    const datasetResult = await client.query(
      'INSERT INTO dataset (userid, label, unit) VALUES ($1, $2, $3) RETURNING id',
      [userId, label, unit]
    );
    const datasetId = datasetResult.rows[0].id;
    await client.query(
      'INSERT INTO entry (datasetid, measurement, timestamp) VALUES ($1, $2, $3)',
      [datasetId, measurement, timestamp]
    );
    await client.query('COMMIT');
    res.status(201).json({ message: 'Data added successfully' });
  } catch (err) {
    console.error('Error:', err);
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    res.status(500).json({ error: 'Internal server error' });
    // } finally {
    //   if (client) {
    //     client.release();
    //   }
  }
});
// Add custom fitness dataSet (To be completed)
app.post('/users/:userId/fitness/custom', (req, res) => {});
// Start server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
module.exports = app;
