import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Get the global .roo directory path
 * @returns Global .roo directory path
 */
export function getGlobalRooDirectory(): string {
	return path.join(os.homedir(), '.roo');
}

/**
 * Get the project-local .roo directory path for a given working directory
 * @param cwd Current working directory
 * @returns Project-local .roo directory path
 */
export function getProjectRooDirectoryForCwd(cwd: string): string {
	return path.join(cwd, '.roo');
}

/**
 * Get all .roo directories in order of precedence (global first, then project-local)
 * @param cwd Current working directory
 * @returns Array of .roo directory paths
 */
export function getRooDirectoriesForCwd(cwd: string): string[] {
	return [getGlobalRooDirectory(), getProjectRooDirectoryForCwd(cwd)];
}

/**
 * Check if a directory exists
 * @param dirPath Directory path to check
 * @returns True if directory exists, false otherwise
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(dirPath);
		return stat.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Check if a file exists
 * @param filePath File path to check
 * @returns True if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(filePath);
		return stat.isFile();
	} catch {
		return false;
	}
}

/**
 * Safely read a file if it exists
 * @param filePath File path to read
 * @returns File content or null if file doesn't exist
 */
export async function readFileIfExists(
	filePath: string,
): Promise<string | null> {
	try {
		if (await fileExists(filePath)) {
			return await fs.readFile(filePath, 'utf-8');
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Read all text files from a directory
 * @param dirPath Directory path
 * @returns Array of file objects with name and content
 */
export async function readTextFilesFromDirectory(
	dirPath: string,
): Promise<Array<{ name: string; content: string }>> {
	try {
		if (!(await directoryExists(dirPath))) {
			return [];
		}

		const files = await fs.readdir(dirPath);
		const textFiles: Array<{ name: string; content: string }> = [];

		for (const file of files) {
			const filePath = path.join(dirPath, file);
			const stat = await fs.stat(filePath);

			if (stat.isFile() && isTextFile(file)) {
				try {
					const content = await fs.readFile(filePath, 'utf-8');
					textFiles.push({ name: file, content });
				} catch {
					// Skip files that can't be read
				}
			}
		}

		return textFiles.sort((a, b) => a.name.localeCompare(b.name));
	} catch {
		return [];
	}
}

/**
 * Check if a file is a text file based on its extension
 * @param fileName File name
 * @returns True if it's a text file
 */
function isTextFile(fileName: string): boolean {
	const textExtensions = [
		'.md',
		'.txt',
		'.json',
		'.yaml',
		'.yml',
		'.js',
		'.ts',
		'.py',
		'.java',
		'.cpp',
		'.c',
		'.h',
		'.css',
		'.html',
		'.xml',
		'.sh',
		'.bat',
		'.ps1',
		'.rb',
		'.php',
		'.go',
		'.rs',
		'.swift',
		'.kt',
		'.scala',
		'.clj',
		'.hs',
		'.elm',
		'.ex',
		'.exs',
		'.erl',
		'.pl',
		'.r',
		'.sql',
		'.dockerfile',
		'.gitignore',
		'.gitattributes',
		'.editorconfig',
		'.eslintrc',
		'.prettierrc',
		'.babelrc',
		'.npmrc',
		'.yarnrc',
	];

	const ext = path.extname(fileName).toLowerCase();
	return textExtensions.includes(ext) || !path.extname(fileName); // Include files without extension
}

/**
 * Format directory content for display
 * @param dirPath Directory path
 * @param files Array of file objects
 * @returns Formatted content string
 */
export function formatDirectoryContent(
	dirPath: string,
	files: Array<{ name: string; content: string }>,
): string {
	const sections = [`# Rules from ${dirPath}:`];

	for (const file of files) {
		sections.push(`\n## ${file.name}\n\n${file.content}`);
	}

	return sections.join('');
}

/**
 * Load configuration from multiple .roo directories with project overriding global
 * @param relativePath The relative path within each .roo directory
 * @param cwd Current working directory
 * @returns Object with global and project content, plus merged content
 */
export async function loadConfiguration(
	relativePath: string,
	cwd: string,
): Promise<{
	global: string | null;
	project: string | null;
	merged: string;
}> {
	const globalDir = getGlobalRooDirectory();
	const projectDir = getProjectRooDirectoryForCwd(cwd);

	const globalFilePath = path.join(globalDir, relativePath);
	const projectFilePath = path.join(projectDir, relativePath);

	// Read global configuration
	const globalContent = await readFileIfExists(globalFilePath);

	// Read project-local configuration
	const projectContent = await readFileIfExists(projectFilePath);

	// Merge configurations - project overrides global
	let merged = '';
	if (globalContent) {
		merged += globalContent;
	}
	if (projectContent) {
		if (merged) {
			merged += '\n\n# Project-specific rules (override global):\n\n';
		}
		merged += projectContent;
	}

	return {
		global: globalContent,
		project: projectContent,
		merged,
	};
}
