const express = require("express");
const moment = require("moment");
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

function isBetween(from, to, current) {
  const fromDateMoment = moment(from).startOf("day");
  const toDateMoment = moment(to).endOf("day");
  const timestampMoment = moment(parseInt(current));
  return timestampMoment.isBetween(fromDateMoment, toDateMoment, null, "[]");
}

router.get("/dailyCount", (req, res) => {
  readJSON(filePath, (items) => {
    LogData = Object.values(items);
    let dailyCount = 0;
    const currentDate = moment().format("YYYY-MM-DD");
    for (const logItem of LogData) {
      if (isBetween(currentDate, currentDate, logItem.id)) {
        for (const item of logItem.data.medicine) {
          dailyCount += item.multiplier;
        }
      }
    }
    res.json(dailyCount);
  });
});

// POST new item
router.post("/", (req, res) => {
  let item = req.body;
  readJSON(filePath, (items) => {
    let newItem = {};
    let id = Date.now().toString(); // Generate unique ID as string
    newItem.id = id;
    newItem.type = item.type;
    newItem.data = item.data;
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
    if (itemIndex === -1) {
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
