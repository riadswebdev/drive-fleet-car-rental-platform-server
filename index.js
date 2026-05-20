require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

async function run() {
  try {
    await client.connect();

    const db = client.db("driveFleetCarRental");

    const carsCollection = db.collection("cars");
    const bookingCollection = db.collection("booking");
    const addedCarCollection = db.collection("addedCar");

    // GET ALL CARS
    app.get("/cars", async (req, res) => {
      try {
        const cars = await carsCollection.find({}).toArray();

        res.status(200).json({
          success: true,
          message: "Successfully fetched all cars",
          data: cars,
        });
      } catch (error) {
        console.log(error.message);

        res.status(500).json({
          success: false,
          message: "Failed to fetch cars",
          error: error.message,
        });
      }
    });

    // GET AVAILABLE CARS
    app.get("/cars/available", async (req, res) => {
      try {
        const cars = await carsCollection
          .find({
            availability: "Available",
          })
          .limit(6)
          .toArray();

        res.status(200).json({
          success: true,
          message: "Successfully fetched available cars",
          data: cars,
        });
      } catch (error) {
        console.log(error.message);

        res.status(500).json({
          success: false,
          message: "Failed to fetch available cars",
          error: error.message,
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

        const car = await carsCollection.findOne({
          _id: new ObjectId(id),
        });

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
        console.log(error.message);

        res.status(500).json({
          success: false,
          message: "Failed to fetch single car",
          error: error.message,
        });
      }
    });

    // BOOK CAR
    app.post("/car/book", async (req, res) => {
      try {
        const bookingData = req.body;
        console.log(bookingData, " booking data to backend server");
        const { carId } = bookingData;
        console.log(carId, "from booking api ");
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
        console.log(error.message);

        res.status(500).json({
          success: false,
          message: "Failed to book car",
          error: error.message,
        });
      }
    });

    // GET ALL BOOKING CARS
    app.get("/booking/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        if (!ObjectId.isValid(userId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid car userId",
          });
        }

        const car = await bookingCollection
          .find({
            userId: userId,
          })
          .toArray();

        if (!car) {
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
        console.log(error.message);

        res.status(500).json({
          success: false,
          message: "Failed to fetch booking car",
          error: error.message,
        });
      }
    });

    // delete booking car
    app.delete("/booking/:carId", async (req, res) => {
      try {
        const { carId } = req.params;
        const result = await bookingCollection.deleteOne({
          _id: new ObjectId(carId),
        });
        res.status(200).json({ success: true, message: "Successfully delete" });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: "Invalid car userId",
        });
      }
    });

    // search by title description category etc
    app.get("/search", async (req, res) => {
      const queryValue = req.query.query;

      // empty search check
      if (!queryValue) {
        return res.status(400).json({
          error: "Search query is required",
        });
      }

      try {
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
        console.log(error);

        res.status(500).json({
          error: "Search failed",
        });
      }
    });

    // ADD NEW CAR
    app.post("/car/add", async (req, res) => {
      try {
        const newCar = req.body;
        const result = await addedCarCollection.insertOne(newCar);
        res.status(201).json({
          success: true,
          message: "Successfully added new car",
          insertedId: result.insertedId,
          data: newCar,
        });
      } catch (error) {
        console.log(error.message);
        res.status(500).json({
          success: false,
          message: "Failed to add new car",
          error: error.message,
        });
      }
    });

    // get all added car
    app.get("/addedCar", async (req, res) => {
      try {
        const addedCars = await addedCarCollection.find({}).toArray();

        res.status(200).json({
          success: true,
          message: "Successfully fetched all added cars",
          data: addedCars,
        });
      } catch (error) {
        console.log(error.message);
        res.status(500).json({
          success: false,
          message: "Failed to fetch added cars",
          error: error.message,
        });
      }
    });

    // update my added car
    app.patch("/updateCar/:carId", async (req, res) => {
      try {
        const { carId } = req.params;
        const updateCar = req.body;

        const result = await addedCarCollection.updateOne(
          { _id: new ObjectId(carId) },
          {
            $set: updateCar,
          },
        );

        res.status(200).json({
          success: true,
          message: "Car updated successfully",
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to update car",
          error: error.message,
        });
      }
    });

    // delete users added car
    app.delete("/added/:carId", async (req, res) => {
      try {
        const { carId } = req.params;
        const result = await addedCarCollection.deleteOne({
          _id: new ObjectId(carId),
        });
        res.status(200).json({ success: true, message: "Successfully delete" });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: "Invalid car Id",
        });
      }
    });


  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
