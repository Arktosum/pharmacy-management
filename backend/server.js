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
const { readJSON, writeJSON } = require("./utils");

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
// const file = "logs.json";
// readJSON(`./databases/${file}`, (items) => {
//   items.forEach((item) => {
//     item.type = "TRANSACTION";
//     item.data = {
//       patientName: item.data.patientName,
//       consultFee: item.data.consultFee,
//       MTtotal: 0,
//       itemCount: 0,
//       medicines: [],
//       medicine : item.data.medicine
//     };
//     try{
//       for (let medicine of item.data.medicine) {
//         item.data.MTtotal += medicine.price * medicine.multiplier;
//         item.data.itemCount += medicine.multiplier;
//         item.data.medicines.push({
//           id: medicine.id,
//           name: medicine.name,
//           price: medicine.price,
//           multiplier: medicine.multiplier,
//         });
//       }
//     }
//     catch(err){
//       console.log(item.data);
//     }
//     delete item.data.medicine;
//   });
//   writeJSON(`./databases/${file}`, items, () => {
//     console.log("Done!");
//   });
// });



// const file = "stock.json";
// readJSON(`./databases/${file}`, (items) => {
//   items.forEach((item) => {
//     const hundredml = item.hundredml
//     const thirtyml = item.thirtyml
//     delete item.hundredml
//     delete item.thirtyml
//     item.count = thirtyml
//     item.remarks = hundredml.toString()
//   });

//   writeJSON(`./databases/${file}`, items, () => {
//     console.log("Done!");
//   });
// });
