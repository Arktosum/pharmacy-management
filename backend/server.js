const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const PORT = 3000;

app.use(express.json());
app.use(cors());

const stockRouter = require("./routes/stock");
const logRouter = require("./routes/log");
const excelRouter = require("./routes/excel");

// Use the items router
app.use("/api/stocks", stockRouter);
app.use("/api/logs", logRouter);
app.use("/api/excels", excelRouter);

app.get("/", (req, res) => {
  res.send("<h1>Welcome to the backend!</h1>");
});

app.listen(PORT, () => {
  console.log(`listening on port | http://localhost:${PORT}`);
});

