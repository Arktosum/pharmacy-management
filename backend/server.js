let express = require('express')
let cors = require('cors')
let app = express()
const fs = require("fs");

app.use(express.json())
app.use(cors({
    origin:'*'
}))
function readJSON(path,callback){
    fs.readFile(path, "utf-8", (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
        callback(JSON.parse(data));
    });
}
function writeJSON(path,data){
    fs.writeFile(path, JSON.stringify(data, null, 4), (error) => {
        if (error) {
            console.log("An error has occurred ", error);
            return;
        }
    });
}
const PORT=3000

let medicineCountPath = './databases/medicine_count.json'
let logsPath = './databases/logs.json'
let dailyCountPath = './databases/daily_count.json'



function JSONCRUD(endpoint,path){
    // Read All
    app.post(`/api/${endpoint}/read`,(req,res)=>{
        readJSON(path,(db)=>{
            res.send(db)
        })
    })
    // Add or Update 
    app.post(`/api/${endpoint}/add`,(req,res)=>{
        let data = req.body // { key : id ,value : data}
        readJSON(path,(db)=>{
            db[data.key] = data.value
            writeJSON(path,db);
        })
        res.send({success:true})
    })
    app.post(`/api/${endpoint}/delete`,(req,res)=>{
        let data = req.body // { key : id }
        readJSON(path,(db)=>{
            delete db[data.key]
            writeJSON(path,db);
        })
        res.send({success:true})

    })
}

JSONCRUD('medicine',medicineCountPath);
JSONCRUD('logs',logsPath);
JSONCRUD('daily',dailyCountPath);

app.get('/',(req, res) =>{
    res.send(`<h1>Welcome to backend</h1>`)
})
app.listen(PORT,()=>{
    console.log(`Listening on | http://localhost:${PORT}`);
})