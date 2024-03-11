const express = require('express');
const cron = require('node-cron');
const calculateAPR = require('./calculationModule');

const app = express();
const port = 3000;
let cachedData = {};

// Immediate data fetch for initial load
calculateAPR().then(data => {
  cachedData = data;
  console.log('Initial data fetched');
}).catch(error => {
  console.error('Failed to fetch initial data:', error);
});

// Schedule data updates every 4 hours
cron.schedule('0 */4 * * *', async () => {
  try {
    cachedData = await calculateAPR();
    console.log('APR Data updated');
  } catch (error) {
    console.error('Failed to update APR data:', error);
  }
});

// API endpoint
app.get('/', (req, res) => {
  res.json(cachedData);
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});
