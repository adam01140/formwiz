const express = require('express');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const path = require('path');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require('./firebaseAdminKey.json')),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to add username
app.post('/addUsername', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).send('Name is required');
  }
  try {
    await db.collection('usernames').add({ name });
    res.status(200).send('Username added successfully');
  } catch (error) {
    console.error('Error adding username:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
