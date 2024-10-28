const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const { readJSON, writeJSON } = require("./utils");

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

// readJSON('./databases/stock.json',(data)=>{
//   let new_data = [];
//   for(let row in data){
//     let item = data[row];
//     item.updatedAt = Date.now().toString();
//     new_data.push({...item});
//   }
//   writeJSON('./databases/stock.json',new_data,()=>{
//     console.log("All data has been updated successfully!");
//   });
// })