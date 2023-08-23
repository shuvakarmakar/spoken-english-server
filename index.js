const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");
const app = express();
const port = process.env.PORT || 5000;
var jwt = require("jsonwebtoken");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
// Set up multer for file upload
const upload = multer();
// middleware
app.use(cors());
app.use(express.json());
// Serve static files from the "pdfs" directory
app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));
// app.use(
//   cors({
//     origin: "https://spoken-english-65d22.web.app", // Replace with your frontend's domain
//     origin:"http://localhost:5173", // Replace with your frontend's domain
//   })
// );
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
            return res
                .status(401)
                .send({ error: true, message: "unauthorized access" });
        }
        req.decoded = decoded;
    });
    next();
};

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_UserName}:${process.env.DB_Key}@cluster0.yo1upio.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; //true for live, false for sandbox

console.log(store_id, store_passwd);

async function run() {
    try {
        // verify jwt when login  is successful
        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "2h",
            });
            res.send({ token });
        });

        //DB Collections
        // const blogsCollection = client.db("Spoken-English").collection("blogs");

        //DB Collections
        const blogsCollection = client.db("Spoken-English").collection("blogs");
        const coursesCollection = client.db("Spoken-English").collection("Courses");
        const userCollection = client.db("Spoken-English").collection("users");
        const orderCollection = client.db("Spoken-English").collection("orders");
        const FormCollection = client
            .db("Spoken-English")
            .collection("instructorApplications");

        // For Transection Id of SSL Commerze
        const tran_id = new ObjectId().toString();
        // APIs

        // FOr Payment Gateway

        app.post("/order", async (req, res) => {
            const order = req.body;
            // const courseDetail = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
            // console.log(order.price);
            const data = {
              total_amount: order.price,
              currency: "BDT",
              tran_id: tran_id, // use unique tran_id for each api call
              success_url: `https://spoken-english-65d22.web.app/payment/success/${tran_id}`,
              fail_url: "https://spoken-english-65d22.web.app/fail",
              cancel_url: "https://spoken-english-65d22.web.app/cancel",
              ipn_url: "https://spoken-english-65d22.web.app/ipn",
              shipping_method: "Courier",
              product_name: order.course_name,
              product_category: "Educational",
              product_profile: "general",
              cus_name: order.billingData.fullName,
              cus_email: order.billingData.email,
              cus_add1: order.billingData.address,
              cus_city: order.billingData.city,
              cus_country: order.billingData.country,
              cus_postcode: order.billingData.postalCode,
              cus_phone: order.billingData.contactNumber,
              cus_fax: "01711111111",
              ship_name: "Customer Name",
              ship_add1: "Dhaka",
              ship_add2: "Dhaka",
              ship_city: "Dhaka",
              ship_state: "Dhaka",
              ship_postcode: 1000,
              ship_country: "Bangladesh",
            };

            // console.log(data);
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
            sslcz.init(data).then((apiResponse) => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL;
                //   console.log(GatewayPageURL
                res.json({ GatewayPageURL });

                const finalOrder = {
                    data,
                    paidStatus: false,
                    transectionId: tran_id,
                };

                const result = orderCollection.insertOne(finalOrder);

                // console.log("Redirecting to: ", GatewayPageURL);
            });

            app.post("/payment/success/:tranId", async (req, res) => {
                // console.log(req.params.tranId);
                const result = await orderCollection.updateOne(
                    { transectionId: req.params.tranId },
                    {
                        $set: {
                            paidStatus: true,
                        },
                    }
                );
                if (result.modifiedCount > 0) {
                    res.redirect(
                        `http://localhost:5173/payment/success/${req.params.tranId}`
                    );
                }
            });
        });

        app.get('/enrolled-courses/:userId', async (req, res) => {
            const userId = req.params.userId;
            // console.log(userId);

            try {
                // Fetch user orders from orderCollection
                const userOrders = await orderCollection.find({ 'data.cus_email': userId }).toArray();
                // console.log(userOrders);
                // Extract relevant course information from user's orders
                const enrolledCourses = userOrders.map(order => {
                    return {
                        _id: order.data.transectionId,
                        product_name: order.data.product_name,
                        instructor: order.data.instructor,
                        total_amount: order.data.total_amount,
                        currency: order.data.currency,
                        paidStatus: order.paidStatus,
                    };
                });

                res.json(enrolledCourses);
            } catch (error) {
                console.error('Error fetching enrolled courses:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });



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

        // Courses
        app.get("/courses", async (req, res) => {
            const result = await coursesCollection.find().toArray();
            res.send(result);
        });

        app.get("/course/:id", async (req, res) => {
            const courseId = req.params.id;
            const query = { _id: new ObjectId(courseId) };
            const result = await coursesCollection.findOne(query);
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

        // apply form for becoming a instructor

        app.post(
            "/BecomeInstructor",
            upload.single("pdfFile"),
            async (req, res) => {
                try {
                    const { fullName, email, phoneNumber, bio } = req.body;
                    const pdfFile = req.file;

                    // Save the data to MongoDB
                    const application = {
                        fullName,
                        email,
                        phoneNumber,
                        bio,
                        pdfFile: pdfFile.buffer,
                    };

                    await FormCollection.insertOne(application);

                    res.status(201).send("Application submitted successfully.");
                } catch (error) {
                    console.error("Error saving application:", error);
                    res.status(500).send("Error submitting application.");
                }
            }
        );

        //    get all applications in admin dashboard
        // Express route to fetch submitted applications
        app.get("/get/applications", async (req, res) => {
            try {
                const applications = await FormCollection.find().toArray();
                res.status(200).json(applications);
            } catch (error) {
                console.error("Error fetching applications:", error);
                res.status(500).send("Error fetching applications.");
            }
        });

        // download application pdf

        app.get("/api/pdf/:id", async (req, res) => {
            try {
                const applicationId = req.params.id;

                const application = await FormCollection.findOne({
                    _id: new ObjectId(applicationId),
                });

                if (!application) {
                    return res.status(404).send("Application not found");
                }

                res.setHeader("Content-Type", "application/pdf");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename=${applicationId}.pdf`
                );
                res.send(application.pdfFile.buffer);
            } catch (error) {
                console.error("Error sending PDF:", error);
                res.status(500).send("Error sending PDF.");
            }
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

        // student

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

        // Delete user from db
        app.delete("/users/DeleteUsers/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });
      
      app.put("/UpdateProfile/:id", async (req, res) => { 
        const id = req.params.id;
        const user = req.body;
        const filter={_id: new ObjectId(id)}
          const updateDoc = {
            $set: {
              name: user.name,
              email: user.email,
              phone: user.phone,
              address: user.address,
              education: user.education,

            },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
         console.log(id,user);
      });

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
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
