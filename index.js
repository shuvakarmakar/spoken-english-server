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
<<<<<<< HEAD
    try {
        //DB Collections
        const blogsCollection = client.db("Spoken-English").collection("blogs");
        const coursesCollection = client.db("Spoken-English").collection("Courses");
        const userCollection = client.db("Spoken-English").collection("users");

        // APIs
=======
  try {
    //DB Collections
    const blogsCollection = client.db("Spoken-English").collection("blogs")
    const coursesCollection = client.db("Spoken-English").collection("Courses")
    const userCollection = client.db("Spoken-English").collection("users");
>>>>>>> 31295bc22779ca0279f5aff6dca4a829c92e2140

        // Blogs
        app.get("/blogs", async (req, res) => {
            const result = await blogsCollection.find().toArray();
            res.send(result);
        });

<<<<<<< HEAD
        app.get("/blog/:id", async (req, res) => {
            const blogId = req.params.id;
            const query = { _id: new ObjectId(blogId) };
            const result = await blogsCollection.findOne(query);
            res.send(result);
        });
=======
    // Blogs **************************************
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });
>>>>>>> 31295bc22779ca0279f5aff6dca4a829c92e2140

        // Courses
        app.get("/courses", async (req, res) => {
            const result = await coursesCollection.find().toArray();
            res.send(result);
        });

<<<<<<< HEAD
        app.get("/course/:id", async (req, res) => {
            const courseId = req.params.id;
            const query = { _id: new ObjectId(courseId) };
            const result = await coursesCollection.findOne(query);
            res.send(result);
        })
=======
    // Users *************************************
    // app.post('/users', async (req, res) => { 
    //   const body = req.body;
      
    // })

    // Courses **************************************
    app.get("/courses", async (req, res) => {
      const result = await coursesCollection.find().toArray();
      res.send(result)
    })
    // save logged users
    app.post("/AddUsers", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
>>>>>>> 31295bc22779ca0279f5aff6dca4a829c92e2140


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
