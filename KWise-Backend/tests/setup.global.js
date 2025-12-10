process.env.NODE_ENV = 'test';

const { startServer } = require('../server');

module.exports = async () => {
  // Initialize app without listening socket
  await startServer({ listen: false });
};
