const { stopServer } = require('../server');
const { closePool } = require('../config/db');

module.exports = async () => {
  // Attempt graceful shutdown
  if (closePool) {
    await closePool();
  }
  if (stopServer) {
    await stopServer();
  }
};
