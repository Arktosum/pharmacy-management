const express = require("express");
const fs = require("fs");
const { readJSON, writeJSON } = require("../utils");

const router = express.Router();
const filePath = "./databases/stock.json";

// GET all items
router.get("/", (req, res) => {
  readJSON(filePath, (items) => {
    res.json(Object.values(items));
  });
});

// POST new item
router.post("/", (req, res) => {
  readJSON(filePath, (items) => {
    let newItem = {};
    let id = Date.now().toString(); // Generate unique ID as string

    newItem.count = 0;
    newItem.price = 0;
    newItem.remarks = "0";
    newItem.updatedAt = Date.now().toString(); // Set current time as updated time!
    newItem.name = req.body.name.toUpperCase();
    newItem.id = id;
    newItem.limit = 0;

    for (let item of items) {
      if (item.name == newItem.name) {
        res.status(401).json({ error: "Item with name already exists!" });
        return;
      }
    }
    items.push(newItem);
    writeJSON(filePath, items, () => {
      res.status(201).json(newItem);
    });
  });
});



// PUT update item by ID
router.put("/", (req, res) => {
  let newItem = req.body;
  readJSON(filePath, (items) => {
    let itemIndex = items.findIndex((item) => item.id === newItem.id);

    // Make sure the item does not already exist
    if (itemIndex === -1) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    // Make sure the item name is not updated to a name that already exists!
    let oldName = items[itemIndex].name;
    if (oldName !== newItem.name) {
      for (let item of items) {
        if (item.name == newItem.name) {
          res.status(401).json({ error: "Item with name already exists!" });
          return;
        }
      }
    }
    newItem.updatedAt = Date.now().toString();
    items[itemIndex] = newItem;
    writeJSON(filePath, items, () => {
      res.status(200).json(newItem);
    });
  });
});

// Update count of many
router.put("/count/many/:type", (req, res) => {
  let newItems = req.body;
  const type = req.params.type;
  if (type !== "UNDO" && type !== "REMOVE") {
    res.status(401).json("Param type must be 'UNDO' or 'REMOVE!");
  }
  readJSON(filePath, (items) => {
    for (let newItem of newItems) {
      let itemIndex = items.findIndex((item) => item.id === newItem.id);
      items[itemIndex].count += newItem.multiplier*(type == 'UNDO' ? 1 : -1);
    }
    writeJSON(filePath, items, () => {
      res.status(200).json(items);
    });
  });
});

// DELETE item by ID
router.delete("/:id", (req, res) => {
  const itemId = req.params.id;
  readJSON(filePath, (items) => {
    items = items.filter((item) => item.id !== itemId);
    writeJSON(filePath, items, () => {
      res.status(200).json({ id: itemId });
    });
  });
});

module.exports = router;