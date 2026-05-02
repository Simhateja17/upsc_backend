import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getItems,
  addItem,
  updateItem,
  deleteItem,
  getSeeds,
} from "../controllers/spacedRepetition.controller";

const router = Router();

router.get("/seeds", authenticate, getSeeds);
router.get("/", authenticate, getItems);
router.post("/", authenticate, addItem);
router.patch("/:id", authenticate, updateItem);
router.delete("/:id", authenticate, deleteItem);

export default router;
