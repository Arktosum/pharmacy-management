const sqlite3 = require('sqlite3').verbose()

function openDB(DBpath){
    let db = new sqlite3.Database(DBpath, (err) => {
        if (err) {
          return console.error(err.message);
        }
        console.log('Connected to the SQlite database.');
    });
    return db
}
function closeDB(db){
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
            console.log('Close the database connection.');
    });
}

// There are 3 types of Queries
// ALL - > Return every matching row
// Each -> Process each matching row one by one
// Get - > Get first matching row
function query(db,sqlQuery,callback=()=>{}){ // Uses All Query
    db.all(sqlQuery,[],(err,rows)=>{
        callback(err,rows)
    })
}
module.exports = {
    closeDB,
    openDB,
    query
}