import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Bootstraps the NestJS application.
 *
 * This function is the entry point of the application. It creates
 * the NestJS app instance, starts the HTTP server, and logs
 * the port on which the API is running.
 *
 * @async
 * @returns {Promise<void>} Resolves once the server is listening.
 */
async function bootstrap(): Promise<void> {
  // Create a NestJS application instance using the root AppModule
  const app = await NestFactory.create(AppModule);

  // Determine the port from environment variables or fall back to 3003
  const port: number = Number(process.env.PORT) || 3003;

  // Start listening for incoming HTTP requests
  await app.listen(port);

  // Log a confirmation message once the server is running
  console.log(`API running on port: ${port}`);
}

// Execute the bootstrap function to start the application
bootstrap();
