const express = require('express');
const app = express();
const cors = require('cors');
const fs = require('fs');
const PORT = 3000

app.use(express.json());
app.use(cors());


function JSON_CRUD(endpoint,path){
    app.post(`/api/${endpoint}/read`,(req,res)=>{
        readJSON(path,(data)=>{
            res.send(data);
        });
    })
    app.post(`/api/${endpoint}/add`,(req,res)=>{
        let body = req.body
        let key = body.key
        let value = body.value 
        readJSON(path,(db)=>{
            db[key] = value;
            writeJSON(path,db,()=>{
                res.send(
                    {success:true}
                );
            });
        });
    })
    app.post(`/api/${endpoint}/delete`,(req,res)=>{
        let body = req.body
        let key = body.key
        readJSON(path,(db)=>{
            if(key in db) delete db[key]
            writeJSON(path,db,()=>{
                res.send(
                    {success:true}
                );
            });
        });
    })
}

JSON_CRUD('stock','./databases/stock.json');
JSON_CRUD('logs','./databases/logs.json');
JSON_CRUD('daily','./databases/daily_count.json');
JSON_CRUD('excel','./databases/excel.json');

app.get("/",(req,res)=>{
    res.send("<h1>Welcome to the backend!</h1>");
})

app.listen(PORT,()=>{
    console.log(`listening on port | http://localhost:${PORT}`)
})

function readJSON(path,callback) {
    fs.readFile(path, "utf8", (err, data) => {
        if (err) {
          console.log("Error reading file from disk:", err);
          return;
        }
        try {
          let parsedData = JSON.parse(data);
          callback(parsedData)
        } catch (err) {
          console.log("Error parsing JSON string:", err);
          console.log("---------------------------------------------------")
          console.log(path,data);
          console.log("---------------------------------------------------")
        }
    });
}

function writeJSON(path,data,callback){
    const jsonString = JSON.stringify(data,null,4)
    fs.writeFile(path, jsonString, err => {
        if (err) {
            console.log('Error writing file', err)
        } else {
            callback()
        }
    })
}

