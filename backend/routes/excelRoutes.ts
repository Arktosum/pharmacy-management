
import express from 'express'
import { readJSON, writeJSON } from './utils';

const router = express.Router();
const filePath = "./databases/excel.json";

// GET all items
router.get("/", (req, res) => {
  readJSON(filePath, (items) => {
    res.json(Object.values(items));
  });
});

// POST new item
router.post("/", (req, res) => {
  let db = req.body;
  writeJSON(filePath, db, () => {
    res.status(201).json(db);
  });
});


export default router;

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
