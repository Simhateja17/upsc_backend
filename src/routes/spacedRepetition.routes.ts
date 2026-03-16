import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getItems,
  addItem,
  updateItem,
  deleteItem,
} from "../controllers/spacedRepetition.controller";

const router = Router();

router.get("/", authenticate, getItems);
router.post("/", authenticate, addItem);
router.patch("/:id", authenticate, updateItem);
router.delete("/:id", authenticate, deleteItem);

export default router;
