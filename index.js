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
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));
// Serve static files from the "pdfs" directory
app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));
// app.use(
//   cors({
//     origin: "https://spoken-english-65d22.web.app", // Replace with your frontend's domain
//     origin:"https://spoken-english-65d22.web.app", // Replace with your frontend's domain
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
const { send } = require("process");
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

// console.log(store_id, store_passwd);

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
    const HelpCollection = client.db("Spoken-English").collection("helpForms");
    const FormCollection = client
      .db("Spoken-English")
      .collection("instructorApplications");
    const FeedbackCollection = client
      .db("Spoken-English")
      .collection("feedback");
    const FriendRequest = client
      .db("Spoken-English")
      .collection("FriendRequest");
    const Friends = client.db("Spoken-English").collection("Friends");

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
        fail_url: `https://spoken-english-65d22.web.app/payment/fail/${tran_id}`,
        cancel_url: "https://spoken-english-65d22.web.app/cancel",
        ipn_url: "https://spoken-english-65d22.web.app/ipn",
        shipping_method: "Courier",
        product_name: order.courseName,
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
        ship_name: order.instructorName,
        ship_add1: order.instructorEmail,
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
    });

    app.put("/payment/success/:tranId", async (req, res) => {
      console.log(req.params.tranId);
      const transId = req.params.tranId;

      try {
        if (transId) {
          const result = await orderCollection.updateOne(
            { transectionId: transId },
            {
              $set: {
                paidStatus: true,
              },
            }
          );
          if (result.modifiedCount > 0) {
            res.redirect(
              `https://spoken-english-65d22.web.app/payment/success/${req.params.tranId}`
            );
          }
        }
      } catch (error) {
        console.log(error.message);
      }
    });

    app.post("/payment/fail/:tranId", async (req, res) => {
      // console.log(req.params.tranId);

      const result = await orderCollection.deleteOne({
        transectionId: req.params.tranId,
      });
      if (result.deletedCount) {
        res.redirect(
          `https://spoken-english-65d22.web.app/payment/fail/${req.params.tranId}`
        );
      }
    });

    app.get("/enrolled-courses/:userId", async (req, res) => {
      const userId = req.params.userId;
      // console.log(userId);

      try {
        // Fetch user orders from orderCollection
        const userOrders = await orderCollection
          .find({ "data.cus_email": userId })
          .toArray();
        // console.log(userOrders);
        // Extract relevant course information from user's orders
        const enrolledCourses = userOrders.map((order) => {
          return {
            _id: order.transectionId,
            product_name: order.data.product_name,
            instructor_name: order.data.ship_name,
            instructor_email: order.data.ship_add1,
            total_amount: order.data.total_amount,
            currency: order.data.currency,
            paidStatus: order.paidStatus,
          };
        });

        res.json(enrolledCourses);
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        res.status(500).json({ error: "Internal server error" });
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
    // Start Course from Student Dashboard
    app.get("/startCourse/:courseName", async (req, res) => {
      const courseName = req.params.courseName;
      // console.log(courseName);
      try {
        // Fetch course details by courseName from your database
        const course = await coursesCollection.findOne({ courseName });
        // console.log(course.courseVideos);
        if (!course) {
          return res.status(404).json({ error: "Course not found" });
        }

        res.json(course);
      } catch (error) {
        console.error("Error fetching course details:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/course/:id", async (req, res) => {
      const courseId = req.params.id;
      const query = { _id: new ObjectId(courseId) };
      const result = await coursesCollection.findOne(query);
      res.send(result);
    });

    //   For Adding Courses
    app.post("/addCourses", async (req, res) => {
      try {
        const courses = req.body;

        await coursesCollection.insertOne(courses);

        res.status(201).json({ message: "Courses added successfully" });
      } catch (error) {
        console.error("Error adding courses:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // For Display each instructor Email Wise added Course
    app.get(
      "/added-courses-by-instructor/:instructorEmail",
      async (req, res) => {
        const instructorEmail = req.params.instructorEmail;
        // console.log(instructorEmail);

        try {
          // Fetch enrolled courses for the instructor
          const enrolledCourses = await coursesCollection
            .find({ instructorEmail: instructorEmail })
            .toArray();

          // Extract relevant course information from enrolled courses
          const courses = enrolledCourses.map((course) => {
            return {
              _id: course._id,
              courseName: course.courseName,
              availableSeats: course.availableSeats,
              imageURL: course.imageURL,
              // Include other course information here
            };
          });

          res.json(courses);
        } catch (error) {
          console.error("Error fetching enrolled courses:", error);
          res.status(500).json({ error: "Internal server error" });
        }
      }
    );

    // Delete Course from Instructor Dashboard
    app.delete("/deleteCourse/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.deleteOne(query);
      res.send(result);
    });

    //   For Adding Courses
    app.post("/addCourses", async (req, res) => {
      try {
        const courses = req.body;

        await coursesCollection.insertOne(courses);

        res.status(201).json({ message: "Courses added successfully" });
      } catch (error) {
        console.error("Error adding courses:", error);
        res.status(500).json({ error: "Internal server error" });
      }
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
          const { fullName, email, phoneNumber, bio, isRead, createAt } =
            req.body;
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
        const applications = await FormCollection.find()
          .sort({ createAt: -1 })
          .toArray();
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

    // update is read feedback by admin

    app.put("/getFeedback/read/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          isRead: true,
        },
      };

      const result = await FeedbackCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Application/read/
    app.put("/Application/read/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          isRead: true,
        },
      };

      const result = await FormCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // help form read api

    app.put("/HelpForm/read/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          isRead: true,
        },
      };

      const result = await HelpCollection.updateOne(filter, updateDoc);
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

    // delete application

    app.delete("/application/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await FormCollection.deleteOne(query);
      res.send(result);
    });

    // delete feedback

    app.delete("/delete/Feedback/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await FeedbackCollection.deleteOne(query);
      res.send(result);
    });

    // update profile settings

    app.put("/UpdateProfile/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: new ObjectId(id) };
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
      console.log(id, user);
    });

    // update user profile img
    app.put("/users/profileImage/upload/:email", async (req, res) => {
      const email = req.params.email;
      const { image } = req.body;
      console.log(image);
      const filter = { email: email };
      const updateDoc = {
        $set: {
          profileImage: image,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
      // console.log(id, user);
      console.log(result);
    });
    // profileBanner  updated
    // /users/profileImage/upload/${user?.email}`
    app.put("/users/profileBanner/upload/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const { image } = req.body;
        console.log(image);
        const filter = { email: email };
        const updateDoc = {
          $set: {
            profileBanner: image,
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
        console.log(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred.");
      }
    });

    //  helpSupport

    app.post("/helpSupport", async (req, res) => {
      const data = req.body;
      const result = await HelpCollection.insertOne(data);
      res.send(result);
    });

    //  get help information
    app.get("/get/helpForm", async (req, res) => {
      const result = await HelpCollection.find()
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.delete("/helpForm/delete/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await HelpCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res
            .status(200)
            .json({ success: true, message: "Problem deleted successfully" });
        } else {
          res
            .status(404)
            .json({ success: false, message: "Problem not found" });
        }
      } catch (error) {
        console.error("Error deleting problem:", error);
        res
          .status(500)
          .json({ success: false, message: "Error deleting problem" });
      }
    });
    // post feedback
    app.post("/Feedback", async (req, res) => {
      const data = req.body;
      const result = await FeedbackCollection.insertOne(data);
      res.send(result);
    });

    app.get("/SingleUser/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(filter);
      res.send(result);
    });

    // get feedback

    // Course Feedback

    app.post("/course-feedback", async (req, res) => {
      try {
        const { name, rating, description } = req.body;
        const db = client.db();
        const feedbackCollection = db.collection("courseFeedback");
        const feedback = {
          name,
          rating,
          description,
        };
        await feedbackCollection.insertOne(feedback);
        res.status(201).json({ message: "Feedback submitted successfully" });
      } catch (error) {
        console.error("Error saving feedback:", error);
        res.status(500).json({ message: "Error submitting feedback" });
      }
    });

    app.get("/course-feedback", async (req, res) => {
      try {
        const db = client.db();
        const feedbackCollection = db.collection("courseFeedback"); // Replace 'feedback' with your collection name

        const allData = await feedbackCollection.find({}).toArray();

        res.status(200).json(allData);
      } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ message: "Error fetching data" });
      }
    });

    // Send friend request

    app.post("/send-friend-request/:userId/:friendId", async (req, res) => {
      const { userId, friendId } = req.params;
      console.log(userId, friendId);
      const users = await userCollection.find().toArray();
      const user = users.find((u) => u.uid === userId);
      const friend = users.find((u) => u.uid === friendId);
      console.log(user, friend);
      if (!user || !friend) {
        return res.status(404).json({ message: "User(s) not found" });
      }
      const friends = { userId, friendId, user, request: "pending" };

      // Check if friend request already exists
      const existingFriendRequest = await FriendRequest.findOne({
        userId,
        friendId,
      });

      if (existingFriendRequest) {
        return res.json({
          message: "Friend request already exists",
          friendRequest: existingFriendRequest,
        });
      }
      const result = await FriendRequest.insertOne(friends);
      res.send(result);
    });
    // get friend request
    app.get("/get-friend-requests/:id", async (req, res) => {
      const { id } = req.params;

      // Assuming you have a FriendRequest collection
      console.log(id);
      const filter = { friendId: id };
      const friendRequests = await FriendRequest.find(filter).toArray();

      if (!friendRequests) {
        return res.status(404).json({ message: "Friend requests not found" });
      }

      res.send(friendRequests);
    });

    // accept request

    app.post("accept/friendRequest/:userId/:friendId", async (req, res) => {
      const { userId, friendId } = req.params;
      const users = await userCollection.find().toArray();
      const user = users.find((u) => u.uid === userId);
      const friend = users.find((u) => u.uid === friendId);
    });

    // delete all friend requests

    app.delete("/delete-friend-requests/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await FriendRequest.deleteOne(filter);
      res.send(result);
    });

    app.get("/get/Feedback", async (req, res) => {
      const result = await FeedbackCollection.find()
        .sort({ createdAt: -1 })
        .toArray();
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
