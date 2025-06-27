import { Command } from "commander";
import { TaskSharingService } from "../core/task-sharing";
import { TaskManager } from "../core/task-manager";
import { logger } from "../utils/logger";

/**
 * Create share command
 * @returns Commander command
 */
export function createShareCommand(): Command {
  const command = new Command("share");

  command
    .description("Share a task with others")
    .argument("<task-id>", "Task ID to share")
    .option(
      "--visibility <visibility>",
      "Visibility level (public, organization, private)",
      "organization"
    )
    .option("--api-endpoint <endpoint>", "API endpoint for cloud sharing")
    .option("--auth-token <token>", "Authentication token for cloud sharing")
    .action(async (taskId: string, options) => {
      try {
        // Validate visibility option
        const validVisibilities = ["public", "organization", "private"];
        if (!validVisibilities.includes(options.visibility)) {
          logger.error(
            `Invalid visibility: ${options.visibility}. Must be one of: ${validVisibilities.join(", ")}`
          );
          process.exit(1);
        }

        // Get task data
        const taskManager = new TaskManager();
        const task = taskManager.getTask(taskId);

        if (!task) {
          logger.error(`Task not found: ${taskId}`);
          process.exit(1);
        }

        // Initialize sharing service
        const sharingService = new TaskSharingService({
          apiEndpoint: options.apiEndpoint,
          authToken: options.authToken,
          defaultVisibility: options.visibility,
        });

        // Share the task
        logger.info(`Sharing task ${taskId} with ${options.visibility} visibility...`);
        const result = await sharingService.shareTask(task, options.visibility);

        if (result.success) {
          logger.success("Task shared successfully!");
          if (result.shareUrl) {
            logger.info(`Share URL: ${result.shareUrl}`);
            
            // Copy to clipboard if available
            try {
              const { default: clipboardy } = await import("clipboardy");
              await clipboardy.write(result.shareUrl);
              logger.info("Share URL copied to clipboard!");
            } catch {
              // Clipboard not available, that's ok
            }
          }
          if (result.shareId) {
            logger.info(`Share ID: ${result.shareId}`);
          }
        } else {
          logger.error(`Failed to share task: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        logger.error(
          `Error sharing task: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    });

  // Add subcommand to list shared tasks
  command
    .command("list")
    .description("List all shared tasks")
    .option("--format <format>", "Output format (table, json)", "table")
    .action(async (options) => {
      try {
        const sharingService = new TaskSharingService();
        const tasks = await sharingService.listSharedTasks();

        if (tasks.length === 0) {
          logger.info("No shared tasks found.");
          return;
        }

        if (options.format === "json") {
          console.log(JSON.stringify(tasks, null, 2));
        } else {
          // Table format
          console.log("\nShared Tasks:");
          console.log("─".repeat(80));
          console.log(
            "ID".padEnd(8) +
            "Title".padEnd(30) +
            "Mode".padEnd(10) +
            "Visibility".padEnd(12) +
            "Created"
          );
          console.log("─".repeat(80));

          for (const task of tasks) {
            const id = task.shareId?.substring(0, 8) || task.id.substring(0, 8);
            const title = task.title.length > 28 ? task.title.substring(0, 25) + "..." : task.title;
            const mode = task.mode;
            const visibility = task.visibility;
            const created = new Date(task.metadata.createdAt).toLocaleDateString();

            console.log(
              id.padEnd(8) +
              title.padEnd(30) +
              mode.padEnd(10) +
              visibility.padEnd(12) +
              created
            );
          }
          console.log("─".repeat(80));
        }
      } catch (error) {
        logger.error(
          `Error listing shared tasks: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    });

  // Add subcommand to get shared task details
  command
    .command("get")
    .description("Get details of a shared task")
    .argument("<share-id>", "Share ID")
    .option("--format <format>", "Output format (json, summary)", "summary")
    .action(async (shareId: string, options) => {
      try {
        const sharingService = new TaskSharingService();
        const task = await sharingService.getSharedTask(shareId);

        if (!task) {
          logger.error(`Shared task not found: ${shareId}`);
          process.exit(1);
        }

        if (options.format === "json") {
          console.log(JSON.stringify(task, null, 2));
        } else {
          // Summary format
          console.log(`\nTask: ${task.title}`);
          console.log(`ID: ${task.id}`);
          console.log(`Share ID: ${task.shareId}`);
          console.log(`Mode: ${task.mode}`);
          console.log(`Visibility: ${task.visibility}`);
          console.log(`Created: ${new Date(task.metadata.createdAt).toLocaleString()}`);
          console.log(`Updated: ${new Date(task.metadata.updatedAt).toLocaleString()}`);
          console.log(`Working Directory: ${task.metadata.cwd}`);
          
          if (task.description) {
            console.log(`Description: ${task.description}`);
          }
          
          if (task.shareUrl) {
            console.log(`Share URL: ${task.shareUrl}`);
          }
          
          console.log(`Messages: ${task.messages.length}`);
          
          // Show first few messages
          if (task.messages.length > 0) {
            console.log("\nFirst few messages:");
            const messagesToShow = Math.min(3, task.messages.length);
            for (let i = 0; i < messagesToShow; i++) {
              const msg = task.messages[i];
              const content = msg.content.length > 100 
                ? msg.content.substring(0, 97) + "..." 
                : msg.content;
              console.log(`  ${msg.role}: ${content.replace(/\n/g, " ")}`);
            }
            
            if (task.messages.length > messagesToShow) {
              console.log(`  ... and ${task.messages.length - messagesToShow} more messages`);
            }
          }
        }
      } catch (error) {
        logger.error(
          `Error getting shared task: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    });

  return command;
}
