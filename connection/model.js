require('dotenv').config();
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

// Validate environment variables
if (!process.env.MONGODB_PASSWORD || !process.env.MONGODB_DBNAME) {
  throw new Error('Missing MongoDB environment variables');
}

const uri = `mongodb+srv://syedmusab:${process.env.MONGODB_PASSWORD}@cluster0.b7mcbgf.mongodb.net/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let _connected = false;

async function ensureConnected() {
  if (_connected) return;

  try {
    // Connect native MongoDB client
    await client.connect();
    console.log('Connected successfully to MongoDB Atlas (native client)');

    // Connect mongoose (used by model/*.js files)
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: process.env.MONGODB_DBNAME,
      });
      console.log('Mongoose connected to MongoDB Atlas');
    }

    _connected = true;
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
    try { await client.close(); } catch (e) {}
    throw error;
  }
}

async function connectToMongoDB() {
  await ensureConnected();
  return client.db(process.env.MONGODB_DBNAME);
}

// CommonJS export
// Attempt initial connection at module load (non-blocking). This helps
// prevent Mongoose buffering if any route uses models before a native
// DB call triggers `connectToMongoDB()`.
ensureConnected().catch(err => {
  console.error('Initial MongoDB connection failed (non-blocking):', err);
});

module.exports = { connectToMongoDB };