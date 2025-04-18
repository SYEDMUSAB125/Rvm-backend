require('dotenv').config();
const { MongoClient } = require('mongodb');

// Validate environment variables
if (!process.env.MONGODB_PASSWORD || !process.env.MONGODB_DBNAME) {
  throw new Error('Missing MongoDB environment variables');
}




const uri = `mongodb+srv://syedmusab:${process.env.MONGODB_PASSWORD}@cluster0.b7mcbgf.mongodb.net/${process.env.MONGODB_DBNAME}?retryWrites=true&w=majority&appName=Cluster0`
const client = new MongoClient(uri);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB Atlas');
    return client.db(process.env.MONGODB_DBNAME);
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
    await client.close();
    throw error;
  }
}

// CommonJS export
module.exports = { connectToMongoDB };