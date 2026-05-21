require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

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
  res.status(200).json({
    success: true,
    message: "DriveFleet server is running",
  });
});

const verifyToken = async (req, res, next) => {
  const bearerToken = req.headers.authorization;
  if (!bearerToken) {
    return res.status(401).json({ success: false, message: "unauthorize" });
  }
  const token = bearerToken.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "unauthorize" });
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(process.env.JWKS_URI));
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.error("Token validation failed", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

async function run() {
  // Initialize collections if possible, but don't throw so routes are always registered
  let carsCollection;
  let bookingCollection;
  let addedCarCollection;

  try {
    // await client.connect();
    const db = client.db("driveFleetCarRental");
    carsCollection = db.collection("cars");
    bookingCollection = db.collection("booking");
    addedCarCollection = db.collection("addedCar");
    console.log("DB collections initialized");
  } catch (err) {
    console.error(
      "DB initialization failed:",
      err && err.message ? err.message : err,
    );
  }

  // GET ALL CARS
  app.get("/cars", async (req, res) => {
    try {
      if (!carsCollection) throw new Error("Database not initialized");
      const cars = await carsCollection.find({}).toArray();

      res.status(200).json({
        success: true,
        message: "Successfully fetched all cars",
        data: cars,
      });
    } catch (error) {
      console.error(
        "GET /cars error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch cars",
        error: error.message || String(error),
      });
    }
  });

  // GET AVAILABLE CARS
  app.get("/cars/available", async (req, res) => {
    try {
      if (!carsCollection) throw new Error("Database not initialized");
      const cars = await carsCollection
        .find({ availability: "Available" })
        .limit(6)
        .toArray();

      res.status(200).json({
        success: true,
        message: "Successfully fetched available cars",
        data: cars,
      });
    } catch (error) {
      console.error(
        "GET /cars/available error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch available cars",
        error: error.message || String(error),
      });
    }
  });

  // GET SINGLE CAR
  app.get("/cars/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid car id",
        });
      }

      if (!carsCollection) throw new Error("Database not initialized");

      const car = await carsCollection.findOne({ _id: new ObjectId(id) });

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Successfully fetched single car",
        data: car,
      });
    } catch (error) {
      console.error(
        "GET /cars/:id error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch single car",
        error: error.message || String(error),
      });
    }
  });

  // BOOK CAR
  app.post("/car/book", async (req, res) => {
    try {
      const bookingData = req.body;
      const { carId } = bookingData;

      if (!carsCollection || !bookingCollection)
        throw new Error("Database not initialized");

      await carsCollection.updateOne(
        { _id: new ObjectId(carId) },
        { $inc: { bookingCount: 1 } },
      );
      const result = await bookingCollection.insertOne(bookingData);
      res.status(201).json({
        success: true,
        message: "Car booked successfully",
        insertedId: result.insertedId,
        data: bookingData,
      });
    } catch (error) {
      console.error(
        "POST /car/book error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to book car",
        error: error.message || String(error),
      });
    }
  });

  // GET ALL BOOKING CARS
  app.get("/booking/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!bookingCollection) throw new Error("Database not initialized");

      const car = await bookingCollection.find({ userId: userId }).toArray();

      if (car.length === 0) {
        return res.status(404).json({
          success: false,
          message: "booking Car not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Successfully fetched booking car",
        data: car,
      });
    } catch (error) {
      console.error(
        "GET /booking/:userId error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch booking car",
        error: error.message || String(error),
      });
    }
  });

  // delete booking car
  app.delete("/booking/:carId", async (req, res) => {
    try {
      const { carId } = req.params;

      if (!bookingCollection) throw new Error("Database not initialized");

      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(carId),
      });
      res.status(200).json({ success: true, message: "Successfully delete" });
    } catch (error) {
      console.error(
        "DELETE /booking/:carId error:",
        error && error.message ? error.message : error,
      );
      res.status(400).json({
        success: false,
        message: "Invalid car userId",
      });
    }
  });

  // search by title description category etc
  app.get("/search", async (req, res) => {
    const queryValue = req.query.query;
    if (!queryValue) {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    try {
      if (!carsCollection) throw new Error("Database not initialized");
      const regex = new RegExp(queryValue, "i");
      const results = await carsCollection
        .find({
          $or: [
            { carName: regex },
            { brand: regex },
            { carType: regex },
            { pickupLocation: regex },
            { description: regex },
            { availability: regex },
          ],
        })
        .toArray();
      res.send(results);
    } catch (error) {
      console.error(
        "GET /search error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        error: "Search failed",
      });
    }
  });

  // ADD NEW CAR
  app.post("/car/add", async (req, res) => {
    try {
      const newCar = req.body;

      if (!addedCarCollection) throw new Error("Database not initialized");

      const result = await addedCarCollection.insertOne(newCar);
      res.status(201).json({
        success: true,
        message: "Successfully added new car",
        insertedId: result.insertedId,
        data: newCar,
      });
    } catch (error) {
      console.error(
        "POST /car/add error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to add new car",
        error: error.message || String(error),
      });
    }
  });

  // get all added car
  app.get("/addedCar/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      if (!addedCarCollection) throw new Error("Database not initialized");

      const addedCars = await addedCarCollection
        .find({ userId: userId })
        .toArray();

      res.status(200).json({
        success: true,
        message: "Successfully fetched all added cars",
        data: addedCars,
      });
    } catch (error) {
      console.error(
        "GET /addedCar/:userId error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to fetch added cars",
        error: error.message || String(error),
      });
    }
  });

  // update my added car
  app.patch("/updateCar/:carId", async (req, res) => {
    try {
      const { carId } = req.params;
      const updateCar = req.body;

      if (!addedCarCollection) throw new Error("Database not initialized");

      const result = await addedCarCollection.updateOne(
        { _id: new ObjectId(carId) },
        { $set: updateCar },
      );

      res.status(200).json({
        success: true,
        message: "Car updated successfully",
        result,
      });
    } catch (error) {
      console.error(
        "PATCH /updateCar/:carId error:",
        error && error.message ? error.message : error,
      );
      res.status(500).json({
        success: false,
        message: "Failed to update car",
        error: error.message || String(error),
      });
    }
  });

  // delete users added car
  app.delete("/added/:carId", async (req, res) => {
    try {
      const { carId } = req.params;

      if (!addedCarCollection) throw new Error("Database not initialized");

      const result = await addedCarCollection.deleteOne({
        _id: new ObjectId(carId),
      });
      res.status(200).json({ success: true, message: "Successfully delete" });
    } catch (error) {
      console.error(
        "DELETE /added/:carId error:",
        error && error.message ? error.message : error,
      );
      res.status(400).json({
        success: false,
        message: "Invalid car Id",
      });
    }
  });
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
