// services/user-management-service/src/redis/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = this.configService.get('redis');
    this.redisClient = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      lazyConnect: true, // Connect on first command
      maxRetriesPerRequest: null, // Disable retries on connection errors
      enableOfflineQueue: true, // Queue commands when offline
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Connected to Redis successfully!');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack);
    });

    try {
      await this.redisClient.connect();
    } catch (err) {
      this.logger.error(`Failed to connect to Redis on init: ${err.message}`, err.stack);
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Disconnected from Redis.');
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Sets a key-value pair in Redis with an optional expiration time.
   * @param key - The key to set.
   * @param value - The value to set.
   * @param ttlSeconds - Optional time-to-live in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<string | null> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized.');
    }
    if (ttlSeconds) {
      return this.redisClient.setex(key, ttlSeconds, value);
    }
    return this.redisClient.set(key, value);
  }

  /**
   * Gets a value from Redis by key.
   * @param key - The key to retrieve.
   * @returns The value as a string, or null if not found.
   */
  async get(key: string): Promise<string | null> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized.');
    }
    return this.redisClient.get(key);
  }

  /**
   * Deletes a key from Redis.
   * @param key - The key to delete.
   * @returns The number of keys deleted.
   */
  async del(key: string): Promise<number> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized.');
    }
    return this.redisClient.del(key);
  }
}