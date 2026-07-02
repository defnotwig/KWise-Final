
// Socket.IO Real-time Implementation for K-Wise Admin
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const cookies = String(socket.handshake.headers.cookie || '')
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce((parsed, entry) => {
          const index = entry.indexOf('=');
          if (index > -1) parsed[entry.slice(0, index)] = decodeURIComponent(entry.slice(index + 1));
          return parsed;
        }, {});
      const token = cookies.jwt;
      if (!token) {
        return next(new Error('Authentication cookie required'));
      }

      const jwtSecret = process.env.JWT_SECRET || require('../config/config').jwt.secret;
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      const userResult = await db.query('SELECT id, name, role FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
      if (userResult.rows.length === 0) {
        return next(new Error('Authentication user not found'));
      }
      socket.userId = userResult.rows[0].id;
      socket.userRole = userResult.rows[0].role;
      socket.userName = userResult.rows[0].name;
      
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userName} (ID: ${socket.userId})`);
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Join admin room if admin/superadmin
    if (socket.userRole === 'admin' || socket.userRole === 'superadmin') {
      socket.join('admin_room');
    }

    // Update user status to online
    updateUserStatus(socket.userId, 'online');
    
    // Broadcast user presence to admins
    socket.to('admin_room').emit('user_status_change', {
      userId: socket.userId,
      userName: socket.userName,
      status: 'online',
      timestamp: new Date()
    });

    // Handle real-time message sending
    socket.on('send_message', async (data) => {
      try {
        // Save message to database
        const message = await saveMessage({
          senderId: socket.userId,
          recipientId: data.recipientId,
          content: data.content,
          type: data.type || 'text'
        });

        // Send to recipient
        socket.to(`user_${data.recipientId}`).emit('new_message', {
          id: message.id,
          senderId: socket.userId,
          senderName: socket.userName,
          content: data.content,
          timestamp: new Date(),
          type: data.type || 'text'
        });

        // Confirm to sender
        socket.emit('message_sent', { messageId: message.id, status: 'delivered' });
        
      } catch (error) {
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle notification acknowledgment
    socket.on('notification_read', async (notificationId) => {
      try {
        await markNotificationAsRead(notificationId, socket.userId);
        socket.emit('notification_acknowledged', { notificationId });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`user_${data.recipientId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`user_${data.recipientId}`).emit('user_stop_typing', {
        userId: socket.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userName} (ID: ${socket.userId})`);
      
      // Update user status to offline
      updateUserStatus(socket.userId, 'offline');
      
      // Broadcast user presence to admins
      socket.to('admin_room').emit('user_status_change', {
        userId: socket.userId,
        userName: socket.userName,
        status: 'offline',
        timestamp: new Date()
      });
    });
  });

  return io;
};

// Helper functions
const updateUserStatus = async (userId, status) => {
  try {
    await db.query(
      'UPDATE users SET last_active_at = NOW(), status = $1 WHERE id = $2',
      [status, userId]
    );
  } catch (error) {
    console.error('Failed to update user status:', error);
  }
};

const saveMessage = async (messageData) => {
  try {
    const result = await db.query(
      `INSERT INTO messages (sender_id, recipient_id, content, message_type, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [messageData.senderId, messageData.recipientId, messageData.content, messageData.type]
    );

    return { id: result.rows[0].id };
  } catch (error) {
    console.error('Failed to save message:', error);
    throw error;
  }
};

const markNotificationAsRead = async (notificationId, userId) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
};

// Broadcast functions for external use
const broadcastToAdmins = (event, data) => {
  if (io) {
    io.to('admin_room').emit(event, data);
  }
};

const broadcastToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

const broadcastNotification = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('new_notification', notification);
  }
};

module.exports = {
  initializeSocket,
  broadcastToAdmins,
  broadcastToUser,
  broadcastNotification
};
