const express = require("express");
const mongoose = require("mongoose");
const app = express();
const multer = require("multer");
const cors = require("cors");
app.use(multer().any());

app.use(express.json());   

app.use(cors());

mongoose
  .connect(
    "mongodb+srv://mepsbisht:india1124@cluster0.wl58p.mongodb.net/project-3-bookManagement?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
    }
  )
  .then(() => console.log("MongoDb is connected"))
  .catch((err) => console.log(err));

app.use(require("./routes/route.js"));

app.listen(process.env.PORT || 5000, function () {
  console.log("Express app running on port " + (process.env.PORT || 5000));
});
