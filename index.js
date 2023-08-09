const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

// Ping Endpoint
app.get("/", (req, res) => {
  res.send("Spoken English Server is running");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_UserName}:${process.env.DB_Key}@cluster0.yo1upio.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    //DB Collections
    const blogsCollection = client.db("Spoken-English").collection("blogs")

    // APIs

    // Blogs
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result)
    })

    app.get('/blog/:id', async (req, res) => {
      const blogId = req.params.id;
      const query = { _id: new ObjectId(blogId) }
      const result = await blogsCollection.findOne(query);
      res.send(result)
    })

    app.post('/users', async (req, res) => { 
      const body = req.body;
      
    })



    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


