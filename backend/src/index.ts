import app from './app.js';
import { prisma } from './utils/prisma.js';

const PORT = process.env.PORT || 3001;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Disconnect from database
    await prisma.$disconnect();
    console.log('Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║     QR Event Platform API Server               ║
╠════════════════════════════════════════════════╣
║  Status:      Running                          ║
║  Port:        ${PORT}                              ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(28)}║
║  API Base:    http://localhost:${PORT}/api         ║
╚════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
