import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const modules = await prisma.module.findMany();
    res.json(modules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch modules' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const module = await prisma.module.findUnique({
      where: { module_id: Number(req.params.id) },
    });
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch module' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { module_code, module_name } = req.body;
    if (!module_code || !module_name) {
      return res.status(400).json({ message: 'module_code and module_name are required' });
    }

    const module = await prisma.module.create({ data: { module_code, module_name } });
    res.status(201).json(module);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'module_code already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Failed to create module' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { module_code, module_name } = req.body;
    const module = await prisma.module.update({
      where: { module_id: Number(req.params.id) },
      data: { module_code, module_name },
    });
    res.json(module);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Module not found' });
  }
});

export default router;