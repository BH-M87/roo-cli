import { exec, spawn } from "child_process";
import { promisify } from "util";
import { logger } from "./logger";

const execAsync = promisify(exec);

/**
 * Execute a command and return the output
 * @param command Command to execute
 * @param cwd Working directory
 * @returns Command output
 */
export async function executeCommand(
  command: string,
  cwd?: string
): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    if (stderr) {
      logger.error(`Command stderr: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    logger.error(
      `Error executing command: ${command}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Execute a command interactively
 * @param command Command to execute
 * @param cwd Working directory
 * @returns Promise that resolves when the command completes
 */
export function executeInteractiveCommand(
  command: string,
  cwd?: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    const process = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
}
