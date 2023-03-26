let express = require('express')
let cors = require('cors')
let app = express()
let {openDB,closeDB,query} = require('./sqlite.js')
const fs = require("fs");

app.use(express.json())
app.use(cors({
    origin:'*'
}))
function readJSON(path,callback){
    fs.readFile(path, "utf8", (err, data) => {
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
let DBpath = './databases/pharmacy.db'
let billJSONpath = './databases/transactions.json'
app.post('/query',(req,res)=>{
    let SQLquery = req.body.query
    let db = openDB(DBpath)
    query(db,SQLquery,(err,data)=>{
        if(err){
            res.send({success:false,err:err});
        }
        else{
            res.send({success:true,data:data});
        }
    })
    closeDB(db)
})

app.post('/bills/create',(req, res) => {
    let data = req.body
    for(let key in data){
        readJSON(billJSONpath,(old_file)=>{
            old_file[key] = data[key]
            writeJSON(billJSONpath,old_file)
        })
    }
    res.send({success:true})
})
app.post('/bills/read',(req, res)=>{
    readJSON(billJSONpath,(old_file)=>{
        res.send(old_file)
    })
})
// DATABASES:
// MEDICINE_STOCK : id , name , thirtyml , hundredml, price
app.get('/',(req, res) =>{
    res.send(`<h1>Welcome to backend</h1>`)
})

app.listen(PORT,()=>{
    console.log(`Listening on | http://localhost:${PORT}`);
})