
import { Router } from "express";
import { StatusController } from "../controllers/status.controller";

const router = Router();
const statusController = new StatusController();

router.get('/', statusController.getStatus);
router.get('/health', statusController.healthCheck);

export const statusRoutes = router;