const express = require("express");
const fs = require("fs");
const { readJSON, writeJSON } = require("../utils");

const router = express.Router();
const filePath = "./databases/logs.json";

// GET all items
router.get("/", (req, res) => {
  readJSON(filePath, (items) => {
    res.json(Object.values(items));
  });
});

// // POST new item
// router.post("/", (req, res) => {
//   readJSON(filePath, (items) => {
//     let newItem = {};
//     let id = Date.now().toString(); // Generate unique ID as string
//     newItem.thirtyml = 0;
//     newItem.price = 0;
//     newItem.hundredml = "0";
//     newItem.name = req.body.name.toUpperCase();
//     newItem.id = id
//     for (let item of items) {
//       if (item.name == newItem.name) {
//         res.status(401).json({ error: "Item with name already exists!" });
//         return;
//       }
//     }
//     items.push(newItem);
//     writeJSON(filePath, items, () => {
//       res.status(201).json(newItem);
//     });
//   });
// });

// // PUT update item by ID
// router.put("/", (req, res) => {
//   let newItem = req.body
//   console.log(newItem);
//   readJSON(filePath, (items) => {
//     let itemIndex = items.findIndex(item => item.id === newItem.id);
//     if(itemIndex === -1){
//       res.status(404).json({ error: "Item not found" });
//       return;
//     }
//     let oldName = items[itemIndex].name
//     if(oldName !== newItem.name){
//       for (let item of items) {
//         if (item.name == newItem.name) {
//           res.status(401).json({ error: "Item with name already exists!" });
//           return;
//         }
//       }
//     }
//     items[itemIndex] = newItem;
//     writeJSON(filePath, items, () => {
//       res.status(200).json(newItem);
//     });
//   });
// });

// // DELETE item by ID
// router.delete("/:id", (req, res) => {
//   const itemId = req.params.id;
//   readJSON(filePath, (items) => {
//     items = items.filter(item => item.id !== itemId);
//     writeJSON(filePath, items, () => {
//       res.status(200).json({id : itemId});
//     });
//   });
// });

module.exports = router;
