const express = require('express');
const app = express();
const cors = require('cors');
const { connectToMongoDB } = require('./connection/model');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('./model/User'); // Assuming you have a User model
app.use(cors());
app.use(express.json()); // Add this to parse JSON request bodies


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Create uploads directory if it doesn't exist
      const uploadDir = 'uploads/profilePics/';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });
  
  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    }
  });

app.get("/",(req,res)=>{
    res.send("Hello from the server")
})


  app.post('/register', async (req, res) => {
    try {
      const { phoneNumber, username, age, gender, profilePicPath } = req.body;
      
      // Validation
      if (!phoneNumber || !username) {
        return res.status(400).json({ 
          success: false,
          error: 'Validation Error',
          message: 'Phone number and username are required' 
        });
      }
  
      if (age && isNaN(age)) {
        return res.status(400).json({ 
          success: false,
          error: 'Validation Error',
          message: 'Age must be a number' 
        });
      }
  
      // Connect to MongoDB
      const db = await connectToMongoDB();
      const userProfileCollection = db.collection('userprofile');
  
      // Check if user exists
      const existingUser = await userProfileCollection.findOne({ phoneNumber });
      if (existingUser) {
        return res.status(409).json({ 
          success: false,
          error: 'Conflict',
          message: 'User already exists' 
        });
      }
  
      // Create new user profile document
      const newUserProfile = {
        phoneNumber,
        username,
        age: age ? parseInt(age) : null,
        gender: gender || 'unspecified',
        profilePic: profilePicPath ||  '../assets/images/male-avatar.png', // Store the path directly
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      };
  
      // Insert into userprofile collection
      const result = await userProfileCollection.insertOne(newUserProfile);
  
      // Construct response
      const userResponse = {
        _id: result.insertedId,
        phoneNumber: newUserProfile.phoneNumber,
        username: newUserProfile.username,
        age: newUserProfile.age,
        gender: newUserProfile.gender,
        profilePic: newUserProfile.profilePic, // Return the path as-is
        createdAt: newUserProfile.createdAt
      };
  
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: userResponse
      });
  
    } catch (error) {
      console.error('Registration error:', error);
      
      res.status(500).json({ 
        success: false,
        error: 'Server Error',
        message: 'Internal server error during registration' 
      });
    }
  });



app.put('/update-profile/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { username, age, profilePic } = req.body; // Now getting profilePic from body

    // Validation
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation Error',
        message: 'Phone number is required' 
      });
    }

    if (age && isNaN(age)) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation Error',
        message: 'Age must be a number' 
      });
    }

    // Connect to MongoDB
    const db = await connectToMongoDB();
    const userProfileCollection = db.collection('userprofile');

    // Check if user exists
    const existingUser = await userProfileCollection.findOne({ phoneNumber });
    if (!existingUser) {
      return res.status(404).json({ 
        success: false,
        error: 'Not Found',
        message: 'User not found' 
      });
    }

    // Prepare update data
    const updateData = {
      username: username || existingUser.username,
      age: age ? parseInt(age) : existingUser.age,
      profilePic: profilePic || existingUser.profilePic, // Use new path or keep existing
      updatedAt: new Date()
    };

    // Update user profile
    const result = await userProfileCollection.updateOne(
      { phoneNumber },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes detected',
        user: existingUser
      });
    }

    // Get updated user data
    const updatedUser = await userProfileCollection.findOne({ phoneNumber });

    // Construct response
    const userResponse = {
      _id: updatedUser._id,
      phoneNumber: updatedUser.phoneNumber,
      username: updatedUser.username,
      age: updatedUser.age,
      gender: updatedUser.gender,
      profilePic: updatedUser.profilePic, // Return the path directly
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'Server Error',
      message: error.message || 'Internal server error during profile update' 
    });
  }
});
// GET endpoint to check if a user exists
app.get('/users/:phoneNumber', async (req, res) => {
    try {
        const db = await connectToMongoDB(); 
        const usersCollection = db.collection('recyclingsessions');
        const user = await usersCollection.findOne({ phoneNumber: req.params.phoneNumber });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json("The phone number exists in the database.");
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
app.get('/verifiedregister/:phoneNumber', async (req, res) => {
  try {
      const db = await connectToMongoDB(); 
      const usersCollection = db.collection('userprofile');
      const user = await usersCollection.findOne({ phoneNumber: req.params.phoneNumber });
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      res.json("The phone number exists in the database.");
  } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Server error' });
  }
});


app.get('/newgethistory/:phoneNumber', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const phoneNumber = req.params.phoneNumber;

    // 1. First get user profile data to include userName
    const usersCollection = db.collection('feedbacks');
    const user = await usersCollection.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Get all recycling sessions for this user
    const sessionsCollection = db.collection('recyclingsessions');
    const sessions = await sessionsCollection.find({ phoneNumber })
      .sort({ recycledAt: -1 }) // Sort by most recent first
      .toArray();

    // 3. Format the response as array of sessions with userName
    const response = sessions.map(session => ({
      phoneNumber: session.phoneNumber,
      recyclingSessions: {
        userName: session.userName || 'Unknown', // Fallback to 'Unknown' if no username
        phoneNumber: session.phoneNumber,
        bottles: session.bottles || 0,
        cups: session.cups || 0,
        points: session.points || 0,
        recycledAt: session.recycledAt || new Date().toISOString()
      }
    }));

    res.status(200).json(response);

  } catch (err) {
    console.error('Error in /getHistory:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message 
    });
  }
});
// POST endpoint to create a new user
app.post('/users', async (req, res) => {
    try {
        const db = await connectToMongoDB();
        const usersCollection = db.collection('recyclingsessions');
        
        // Validate required fields
        if (!req.body.phoneNumber || !req.body.recyclingSessions) {
            return res.status(400).json({ error: 'phoneNumber and recyclingSessions are required' });
        }

        // Create document with timestamp
        const userData = {
            ...req.body,
            createdAt: new Date(),
            __v: 0
        };

        const result = await usersCollection.insertOne(userData);
        res.status(201).json({
            _id: result.insertedId,
            ...userData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/getuser/:phoneNumber', async (req, res) => {
    try {
        const db = await connectToMongoDB();
        const usersCollection = db.collection('userprofile');

        const phoneNumber = req.params.phoneNumber;

        const user = await usersCollection.findOne({ phoneNumber });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.get('/getrecycle/:phoneNumber', async (req, res) => {
    try {
        const db = await connectToMongoDB();
        const usersCollection = db.collection('recyclingsessions');

        const phoneNumber = req.params.phoneNumber;

        const user = await usersCollection.findOne({ phoneNumber });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post("/updateUser", async (req, res) => {
  const { phoneNumber, userName } = req.body;

  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection('recyclingsessions');
    const result = await usersCollection.updateMany(
      { phoneNumber },
      { $set: { userName } }
    );

    res.status(200).json({
      message: "Username updated successfully for all sessions.",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.get('/gethistory/:phoneNumber', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection('users');
    const phoneNumber = req.params.phoneNumber;

    // Convert cursor to array of documents
    const users = await usersCollection.find({ phoneNumber }).toArray();

    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found with this phone number' });
    }

    // Return just the data we need (avoid sending entire MongoDB objects)
    const responseData = users.map(user => ({
      phoneNumber: user.phoneNumber,
      recyclingSessions: user.recyclingSessions || [],
      // Add other fields you need
    }));

    res.status(200).json(responseData);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message // Send error details for debugging
    });
  }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});