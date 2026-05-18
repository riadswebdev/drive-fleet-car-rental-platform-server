require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("driveFleetCarRental");
    const carsCollection = db.collection("cars");

    // get all cars
    app.get("/cars", async (req, res) => {
      try {
        const cars = await carsCollection.find({}).toArray();
        res.status(200).send({
          success: true,
          message: "Successfully got all cars",
          data: cars,
        });
      } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Error fetching cars" });
      }
    });

    // get available cars only
    app.get("/cars/available", async (req, res) => {
      try {
        const cars = await carsCollection
          .find({
            availability: "Available",
          })
          .toArray();
        res.status(200).send({
          success: true,
          message: "Successfully got available cars",
          data: cars,
        });
      } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Error fetching cars" });
      }
    });

    // get unavailable cars only
    app.get("/cars/unavailable", async (req, res) => {
      try {
        const cars = await carsCollection
          .find({
            availability: "Unavailable",
          })
          .toArray();
        res.status(200).send({
          success: true,
          message: "Successfully got unavailable cars",
          data: cars,
        });
      } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Error fetching cars" });
      }
    });

    // POST API to add a new car
    app.post("/cars", async (req, res) => {
      const newCar = req.body;
      const result = await carsCollection.insertOne(newCar);
      res.send(result);
    });
  } finally {
   //  await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
