import express from 'express';
import Reminder from '../models/Reminder.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Background task to update expired reminders
const updateExpiredReminders = async () => {
    try {
        const now = new Date();
        const expiredReminders = await Reminder.find({
            dueDate: { $lt: now },
            status: 'pending'
        });

        for (const reminder of expiredReminders) {
            reminder.status = 'expired';
            await reminder.save();
            // Send notification for each expired reminder
            await reminder.sendNotification();
        }
    } catch (error) {
        console.error('Error updating expired reminders:', error);
    }
};

// Run the update task every minute
setInterval(updateExpiredReminders, 60000);

// Create a new reminder
router.post('/', auth, async (req, res) => {
  console.log('req.user:', req.user);
  console.log('req.headers.authorization:', req.headers.authorization);
  try {
    const reminder = new Reminder({
      ...req.body,
      user: req.user.userId,
      status: 'pending'
    });
    await reminder.save();
    res.status(201).json(reminder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Get all reminders for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching reminders for user:', req.user);
    const reminders = await Reminder.find({ user: req.user.userId })
      .sort({ dueDate: 1 });
    console.log('Found reminders:', reminders);
    
    // Update status for each reminder
    for (let reminder of reminders) {
      await reminder.updateStatus();
    }
    
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific reminder
router.get('/:id', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json(reminder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a reminder
router.patch('/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['title', 'description', 'dueDate', 'priority', 'completed', 'status'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates' });
  }

  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    updates.forEach(update => reminder[update] = req.body[update]);
    await reminder.save();
    
    // Update status if needed
    await reminder.updateStatus();
    
    res.json(reminder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a reminder
router.delete('/:id', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json(reminder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 