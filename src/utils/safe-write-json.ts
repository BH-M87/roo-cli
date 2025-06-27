import * as fs from "fs/promises";
import * as path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

/**
 * Safely write JSON data to a file with atomic operations and proper error handling
 * This prevents data corruption by using temporary files and atomic renames
 * @param filePath - The target file path
 * @param data - The data to write as JSON
 */
export async function safeWriteJson(filePath: string, data: any): Promise<void> {
  const absoluteFilePath = path.resolve(filePath);
  const dirPath = path.dirname(absoluteFilePath);
  const tempFilePath = `${absoluteFilePath}.tmp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Verify directory exists after creation
    await fs.access(dirPath);

    // Create a readable stream from the JSON data
    const jsonString = JSON.stringify(data, null, 2);
    const readable = Readable.from([jsonString]);

    // Create write stream to temporary file
    const writeStream = createWriteStream(tempFilePath);

    // Use pipeline for proper error handling and cleanup
    await pipeline(readable, writeStream);

    // Atomically move temp file to target location
    await fs.rename(tempFilePath, absoluteFilePath);

  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    console.error(`Failed to write JSON to ${absoluteFilePath}:`, error);
    throw error;
  }
}
