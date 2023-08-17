const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
var jwt = require("jsonwebtoken");
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());


// Ping Endpoint
app.get("/", (req, res) => {
  res.send("Spoken English Server is running");
});

// verify Jwt token middleware
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token

  const token = authorization.split(" ")[1];

  
  // verify a token 
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(401).send({ error: true, message:"unauthorized access" });
    }
     req.decoded = decoded;
    
  });
  next();
}












// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_UserName}:${process.env.DB_Key}@cluster0.yo1upio.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // verify jwt when login  is successful
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //DB Collections
    const blogsCollection = client.db("Spoken-English").collection("blogs");

    const userCollection = client.db("Spoken-English").collection("users");

    // APIs

    // Blogs
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    app.get("/blog/:id", async (req, res) => {
      const blogId = req.params.id;
      const query = { _id: new ObjectId(blogId) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });

    // save logged users
    app.post("/AddUsers", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Get user collection
    app.get("/GetUsers", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // make admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          Roll: "admin",
          disabled: true,
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //make user to instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          Roll: "Instructor",
          InstructorDisabled: true,
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete user from db
    app.delete("/users/DeleteUsers/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });




    // admin verification methods
    app.get("/users/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      //  console.log(email);
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.Roll == "admin" };
      res.send(result);
    });



    // instructor verification method

    app.get("/users/instructor/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.Roll == "Instructor" };
      res.send(result);
    });

    // student verification
    app.get("/users/student/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (req.decoded.email !== email) {
        res.send({ student: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { student: user?.Roll == "student" };
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
