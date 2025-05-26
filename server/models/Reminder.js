import mongoose from 'mongoose';
import User from './User.js';

const reminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
    default: 'pending'
  },
  completed: {
    type: Boolean,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add a method to send notifications
reminderSchema.methods.sendNotification = async function() {
  try {
    const user = await User.findById(this.user);
    if (user && user.pushToken) {
      // Send push notification
      const message = {
        to: user.pushToken,
        sound: 'default',
        title: 'Reminder Expired',
        body: `Your reminder "${this.title}" has expired`,
        data: { reminderId: this._id },
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Add a method to check and update status
reminderSchema.methods.updateStatus = async function() {
  const now = new Date();
  if (this.dueDate < now && this.status === 'pending') {
    this.status = 'expired';
    await this.save();
    // Send notification immediately when status changes to expired
    await this.sendNotification();
  }
  return this.status;
};

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder; 