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

// POST new item
router.post("/", (req, res) => {
  let item = req.body
  readJSON(filePath, (items) => {
    let newItem = {};
    let id = Date.now().toString(); // Generate unique ID as string
    newItem.id = id
    newItem.type = item.type
    newItem.data = item.data
    items.push(newItem);
    writeJSON(filePath, items, () => {
      res.status(201).json(newItem);
    });
  });
});

// PUT update item by ID
router.put("/", (req, res) => {
  let newItem = req.body
  readJSON(filePath, (items) => {
    let itemIndex = items.findIndex(item => item.id === newItem.id);
    if(itemIndex === -1){
      res.status(404).json({ error: "Item not found" });
      return;
    }
    items[itemIndex] = newItem;
    writeJSON(filePath, items, () => {
      res.status(200).json(newItem);
    });
  });
});

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
