import { initializeDatabase } from './init-db';

// Run the database initialization
(async () => {
  console.log('Starting database initialization...');
  try {
    await initializeDatabase();
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})(); 