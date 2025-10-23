

import express from 'express'
import cors from 'cors'

import stockRouter from "./routes/stockRoutes";
import logRouter from "./routes/logRoutes";
import excelRouter from "./routes/excelRoutes";
import mapperRoutes from "./routes/mapperRoutes";

const PORT = 3000;
const app = express()
app.use(express.json());
app.use(cors());

// Use the items router
app.use("/api/stocks", stockRouter);
app.use("/api/logs", logRouter);
app.use("/api/excels", excelRouter);
app.use("/api/mapper", mapperRoutes);

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



