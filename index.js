const express = require("express");
const app = express();
const cors = require("cors");
const { connectToMongoDB } = require("./connection/model");
const Feedback = require("./model/Feedback");
const RecyclingSessions = require("./model/RecyclingSession");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const BinFullNotification = require("./model/BinFullNotification");
const RecyclingSession = require("./model/RecyclingSession");
const generateVouch365Link = require("./utils/vouch365")
const jwt = require("jsonwebtoken");
const SECRET_KEY = "isp-env-sol"; // move to env in real apps

app.use(cors());
app.use(express.json()); // Add this to parse JSON request bodies

app.get("/", (req, res) => {
  res.send("Hello from the server");
});


app.post("/login", async (req, res) => {
  try {
    const { mobileOrEmail, password } = req.body;

    // Basic validation
    if (!mobileOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Both mobile/email and password are required",
      });
    }

    // Connect to MongoDB
    const db = await connectToMongoDB();
    const userProfileCollection = db.collection("userprofile");
    const recyclingSessionsCollection = db.collection("recyclingsessions");

    // Find user by mobile or email
    const user = await userProfileCollection.findOne({
      $or: [
        { mobile: mobileOrEmail },
        { email: mobileOrEmail }
      ]
    });

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login time
    await userProfileCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Find all recycling sessions for this user and calculate totals
    const recyclingSessions = await recyclingSessionsCollection.find({
      phoneNumber: user.mobile
    }).toArray();
    console.log(recyclingSessions)
    // Calculate totals
    let totalPoints = 0;
    let totalBottles = 0;
    let totalCups = 0;
    let latestRecycleDate = null;

    if (recyclingSessions.length > 0) {
      recyclingSessions.forEach(session => {
        totalPoints += session.points || 0;
        totalBottles += session.bottles || 0;
        totalCups += session.cups || 0;

        // Find the latest recycling date
        if (!latestRecycleDate || new Date(session.recycledAt) > new Date(latestRecycleDate)) {
          latestRecycleDate = session.recycledAt;
        }
      });
    }

    // Create recycleDetails object with totals
    const recycleDetails = recyclingSessions.length > 0 ? {
      _id: recyclingSessions[0]._id, // Keep the first _id for reference
      userName: user.username,
      phoneNumber: user.mobile,
      bottles: totalBottles,
      cups: totalCups,
      points: totalPoints,
      recycledAt: latestRecycleDate,
      totalSessions: recyclingSessions.length
    } : false;

    // Remove sensitive data from user response
    const { password: _, ...userResponse } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
      recycleDetails: recycleDetails
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.post("/get-points", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber is required",
      });
    }

    // Connect to DB
    const db = await connectToMongoDB();
    const recyclingSessionsCollection = db.collection("recyclingsessions");

    // Fetch all sessions for this phone number
    const sessions = await recyclingSessionsCollection
      .find({ phoneNumber })
      .toArray();

    // Initialize totals
    let totalPoints = 0;
    let totalBottles = 0;
    let totalCups = 0;

    // Loop and sum
    sessions.forEach((session) => {
      totalPoints += session.points || 0;
      totalBottles += session.bottles || 0;
      totalCups += session.cups || 0;
    });

    const totalSessions = sessions.length;

    return res.json({
      _id: sessions[0]?._id || null,
      userName: sessions[0]?.userName || null,
      phoneNumber: phoneNumber,
      bottles: totalBottles,
      cups: totalCups,
      points: totalPoints,
      recycledAt: sessions[0]?.recycledAt || null, // latest session timestamp
      totalSessions: totalSessions,
    });
  } catch (error) {
    console.error("Error fetching total points:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


app.post("/generate-vouch365-link", (req, res) => {
  console.log(req.body)
  const { username, phone } = req.body;

  if (!username || !phone) {
    return res.status(400).json({
      success: false,
      message: "username and phone are required",
    });
  }

  try {
    const vouch365Link = generateVouch365Link(username, phone);
    return res.json({
      success: true,
      link: vouch365Link,
    });
  } catch (err) {
    console.error("Vouch365 Link Generation Error:", err);
    return res.status(500).json({
      success: false,
      message: "Error generating Vouch365 link",
    });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { username, mobile, age, nic, email, password, gender } = req.body;
    console.log("Registration request body:", req.body);

    if (!username || !mobile || !email || !password || !nic) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const db = await connectToMongoDB();
    const userProfileCollection = db.collection("userprofile");
    const recyclingSessionsCollection = db.collection("recyclingsessions");

    // Check if user exists
    const existingUser = await userProfileCollection.findOne({
      $or: [{ mobile }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this mobile or email",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      username,
      mobile,
      age: age ? parseInt(age) : null,
      nic,
      gender: gender || "male",
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
      __v: 0
    };

    // Insert user into userprofile
    const result = await userProfileCollection.insertOne(newUser);

    // Update recyclingsessions with matching phoneNumber and missing/null userName
    await recyclingSessionsCollection.updateMany(
      {
        phoneNumber: mobile,
        $or: [
          { userName: { $exists: false } },
          { userName: null },
          { userName: "" }
        ]
      },
      {
        $set: { userName: username }
      }
    );

    // Respond
    const { password: _, ...userResponse } = newUser;
    userResponse._id = result.insertedId;

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: userResponse
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});


app.put("/update-profile/:phoneNumber", async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { username, age, profilePic } = req.body; // Now getting profilePic from body

    // Validation
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Phone number is required",
      });
    }

    if (age && isNaN(age)) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Age must be a number",
      });
    }

    // Connect to MongoDB
    const db = await connectToMongoDB();
    const userProfileCollection = db.collection("userprofile");

    // Check if user exists
    const existingUser = await userProfileCollection.findOne({ phoneNumber });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "User not found",
      });
    }

    // Prepare update data
    const updateData = {
      username: username || existingUser.username,
      age: age ? parseInt(age) : existingUser.age,
      profilePic: profilePic || existingUser.profilePic, // Use new path or keep existing
      updatedAt: new Date(),
    };

    // Update user profile
    const result = await userProfileCollection.updateOne(
      { phoneNumber },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        user: existingUser,
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
      updatedAt: updatedUser.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message || "Internal server error during profile update",
    });
  }
});
// GET endpoint to check if a user exists
app.get("/users/:phoneNumber", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("recyclingsessions");
    const user = await usersCollection.findOne({
      phoneNumber: req.params.phoneNumber,
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json("The phone number exists in the database.");
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/verifiedregister/:phoneNumber", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("userprofile");
    const user = await usersCollection.findOne({
      phoneNumber: req.params.phoneNumber,
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json("The phone number exists in the database.");
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/newgethistory/:phoneNumber", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const phoneNumber = req.params.phoneNumber;

    // 1. First get user profile data to include userName
    const usersCollection = db.collection("feedbacks");
    const user = await usersCollection.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Get all recycling sessions for this user
    const sessionsCollection = db.collection("recyclingsessions");
    const sessions = await sessionsCollection
      .find({ phoneNumber })
      .sort({ recycledAt: -1 }) // Sort by most recent first
      .toArray();

    // 3. Format the response as array of sessions with userName
    const response = sessions.map((session) => ({
      phoneNumber: session.phoneNumber,
      recyclingSessions: {
        userName: session.userName || "Unknown", // Fallback to 'Unknown' if no username
        phoneNumber: session.phoneNumber,
        bottles: session.bottles || 0,
        cups: session.cups || 0,
        points: session.points || 0,
        recycledAt: session.recycledAt || new Date().toISOString(),
      },
    }));

    res.status(200).json(response);
  } catch (err) {
    console.error("Error in /getHistory:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

app.get("/usernames", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const sessionsCollection = db.collection("recyclingsessions");

    const userPoints = await sessionsCollection.aggregate([
      {
        $match: {
          phoneNumber: { $ne: null },
          userName: { $ne: null },
        },
      },
      {
        $sort: {
          recycledAt: 1,
        },
      },
      {
        $group: {
          _id: "$phoneNumber",
          totalPoints: { $sum: "$points" },
          latestUserName: { $last: "$userName" },
        },
      },
      {
        $match: {
          latestUserName: { $ne: null },
        },
      },
      {
        $sort: { totalPoints: -1 },
      },
      {
        $limit: 5,
      },
    ]).toArray();

    // ✅ Always return a JSON response
    return res.status(200).json({
      message: "Top 5 users fetched successfully.",
      users: userPoints.map(user => ({
        phoneNumber: user._id,
        userName: user.latestUserName,
        totalPoints: user.totalPoints,
      })),
    });

  } catch (error) {
    console.error("Error fetching top users:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


// POST endpoint to create a new user
app.post("/users", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("recyclingsessions");

    // Validate required fields
    if (!req.body.phoneNumber || !req.body.recyclingSessions) {
      return res
        .status(400)
        .json({ error: "phoneNumber and recyclingSessions are required" });
    }

    // Create document with timestamp
    const userData = {
      ...req.body,
      createdAt: new Date(),
      __v: 0,
    };

    const result = await usersCollection.insertOne(userData);
    res.status(201).json({
      _id: result.insertedId,
      ...userData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/getuser/:phoneNumber", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("userprofile");

    const phoneNumber = req.params.phoneNumber;

    const user = await usersCollection.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/getrecycle/:phoneNumber", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("recyclingsessions");
    const phoneNumber = req.params.phoneNumber;

    const user = await usersCollection.findOne({ phoneNumber });

    if (!user) {
      return res.status(200).json({ success: false, message: "No recycling data found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/updateUser", async (req, res) => {
  const { phoneNumber, userName } = req.body;

  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("recyclingsessions");
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

app.get("/gethistory/:phoneNumber", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("users");
    const phoneNumber = req.params.phoneNumber;

    // Convert cursor to array of documents
    const users = await usersCollection.find({ phoneNumber }).toArray();

    if (users.length === 0) {
      return res
        .status(404)
        .json({ error: "No users found with this phone number" });
    }

    // Return just the data we need (avoid sending entire MongoDB objects)
    const responseData = users.map((user) => ({
      phoneNumber: user.phoneNumber,
      recyclingSessions: user.recyclingSessions || [],
      // Add other fields you need
    }));

    res.status(200).json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message, // Send error details for debugging
    });
  }
});

// RVM Admin Panel APIs
app.get("/getNotification", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const notificationsCollection = db.collection("binfullnotifications");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const machineId = req.query.machineId;


    // Build filter dynamically
    const filter = {};
    if (machineId) filter.machineId = machineId;

    // Total count (for pagination)
    const totalCount = await notificationsCollection.countDocuments(filter);

    // Paginated notifications
    const notifications = await notificationsCollection
      .find(filter)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

app.get("/getAllData", async (req, res) => {
  try {
    const db = await connectToMongoDB();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const machineId = req.query.machineId; // 👈 from query

    const matchStage = machineId ? { machineId } : {};

    const data = await db.collection("feedbacks")
      .aggregate([
        { $match: matchStage },
        { $addFields: { createdAtDate: { $toDate: "$createdAt" } } },
        { $sort: { createdAtDate: -1 } },
        {
          $lookup: {
            from: "recyclingsessions",
            let: { phone: "$phoneNumber", machine: "$machineId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$phoneNumber", "$$phone"] },
                      { $eq: ["$machineId", "$$machine"] }
                    ]
                  }
                }
              }
            ],
            as: "recyclingSessions"
          }
        },
        { $unwind: { path: "$recyclingSessions", preserveNullAndEmptyArrays: true } },
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray();


    const totalCount = await db.collection("feedbacks").countDocuments(matchStage);

    res.json({
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      data,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Get aggregated stats for cups, bottles, points 
app.get("/getstats", async (req, res) => {
  const db = await connectToMongoDB();
  try {
    const { machineId } = req.query;
    const matchStage = machineId ? { machineId } : {}; // optional filter
    const stats = await db.collection("recyclingsessions")
      .aggregate([
        { $match: matchStage }, // filter by machineId if provided
        {
          $group: {
            _id: null,
            totalBottles: { $sum: "$bottles" },
            totalCups: { $sum: "$cups" },
            totalPoints: { $sum: "$points" },
          },
        },
      ])
      .toArray();

    res.json(stats[0] || { totalBottles: 0, totalCups: 0, totalPoints: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/getMachines", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const machines = await db.collection("recyclingsessions").distinct("machineId");
    res.json({ machines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//for fetching registered users based on points
app.get("/registeredusers", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const usersCollection = db.collection("recyclingsessions");

    const userPoints = await usersCollection.aggregate([
      // Filter valid entries
      {
        $match: {
          phoneNumber: { $ne: null },
          userName: { $ne: null },
          bottles: { $ne: null },
          cups: { $ne: null },
        },
      },

      // Sort so $last returns correct userName
      { $sort: { _id: 1 } },

      // Group by phone number
      {
        $group: {
          _id: "$phoneNumber",
          totalPoints: { $sum: "$points" },
          latestUserName: { $last: "$userName" },
          totalBottles: { $sum: "$bottles" },
          totalCups: { $sum: "$cups" },
        },
      },

      // Lookup gender from User collection
      {
        $lookup: {
          from: "userprofile",         // <-- Collection name
          localField: "_id",    // phoneNumber from recyclingsessions
          foreignField: "mobile",
          as: "userData",
        },
      },

      // Extract gender safely
      {
        $addFields: {
          gender: { $arrayElemAt: ["$userData.gender", 0] },
          nic: { $arrayElemAt: ["$userData.nic", 0] },
        },
      },

      // Remove users with no userName
      {
        $match: {
          latestUserName: { $ne: null },
        },
      },

      // Sort by points
      {
        $sort: { totalPoints: -1 },
      },
    ]).toArray();

    res.status(200).json({
      message: "registered users fetched successfully.",
      users: userPoints.map(user => ({
        phoneNumber: user._id,
        userName: user.latestUserName || null,
        totalPoints: user.totalPoints || null,
        totalBottles: user.totalBottles || null,
        totalCups: user.totalCups || null,
        gender: user.gender || null,
        nic: user.nic || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching registered users:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});


app.post('/loginadmin', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
    return res.json({ success: true, token });
  } else {
    return res.json({ success: false, message: "Invalid credentials" });
  }
});

app.get("/mobusers", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const userProfiles = db.collection("userprofile");

    // Fetch username + gender, exclude _id
    const users = await userProfiles.find(
      {},
      { projection: { username: 1, gender: 1, _id: 0 } }
    ).toArray();

    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching usernames:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});