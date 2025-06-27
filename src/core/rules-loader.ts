import * as path from "path";
import {
  getRooDirectoriesForCwd,
  directoryExists,
  readTextFilesFromDirectory,
  formatDirectoryContent,
  readFileIfExists,
} from "../utils/roo-config";

/**
 * Load rule files from global and project-local directories
 * Global rules are loaded first, then project-local rules which can override global ones
 * @param cwd Current working directory
 * @returns Combined rules content
 */
export async function loadRuleFiles(cwd: string): Promise<string> {
  const rules: string[] = [];
  const rooDirectories = getRooDirectoriesForCwd(cwd);

  // Check for .roo/rules/ directories in order (global first, then project-local)
  for (const rooDir of rooDirectories) {
    const rulesDir = path.join(rooDir, "rules");
    if (await directoryExists(rulesDir)) {
      const files = await readTextFilesFromDirectory(rulesDir);
      if (files.length > 0) {
        const content = formatDirectoryContent(rulesDir, files);
        rules.push(content);
      }
    }
  }

  // If we found rules in .roo/rules/ directories, return them
  if (rules.length > 0) {
    return "\n" + rules.join("\n\n");
  }

  // Fall back to existing behavior for legacy .roorules/.clinerules files
  const ruleFiles = [".roorules", ".clinerules"];

  for (const file of ruleFiles) {
    const content = await readFileIfExists(path.join(cwd, file));
    if (content) {
      return `\n# Rules from ${file}:\n${content}\n`;
    }
  }

  return "";
}

/**
 * Load mode-specific rule files from global and project-local directories
 * @param cwd Current working directory
 * @param mode Mode name
 * @returns Object with mode rules content and used rule file info
 */
export async function loadModeRuleFiles(
  cwd: string,
  mode: string
): Promise<{ content: string; usedRuleFile: string }> {
  if (!mode) {
    return { content: "", usedRuleFile: "" };
  }

  const modeRules: string[] = [];
  const rooDirectories = getRooDirectoriesForCwd(cwd);

  // Check for .roo/rules-${mode}/ directories in order (global first, then project-local)
  for (const rooDir of rooDirectories) {
    const modeRulesDir = path.join(rooDir, `rules-${mode}`);
    if (await directoryExists(modeRulesDir)) {
      const files = await readTextFilesFromDirectory(modeRulesDir);
      if (files.length > 0) {
        const content = formatDirectoryContent(modeRulesDir, files);
        modeRules.push(content);
      }
    }
  }

  // If we found mode-specific rules in .roo/rules-${mode}/ directories, use them
  if (modeRules.length > 0) {
    return {
      content: "\n" + modeRules.join("\n\n"),
      usedRuleFile: `rules-${mode} directories`,
    };
  }

  // Fall back to existing behavior for legacy files
  const rooModeRuleFile = `.roorules-${mode}`;
  let content = await readFileIfExists(path.join(cwd, rooModeRuleFile));
  if (content) {
    return { content, usedRuleFile: rooModeRuleFile };
  }

  const clineModeRuleFile = `.clinerules-${mode}`;
  content = await readFileIfExists(path.join(cwd, clineModeRuleFile));
  if (content) {
    return { content, usedRuleFile: clineModeRuleFile };
  }

  return { content: "", usedRuleFile: "" };
}

/**
 * Add custom instructions including rules from various sources
 * @param modeCustomInstructions Mode-specific custom instructions
 * @param globalCustomInstructions Global custom instructions
 * @param cwd Current working directory
 * @param mode Mode name
 * @param options Additional options
 * @returns Combined custom instructions
 */
export async function addCustomInstructions(
  modeCustomInstructions: string,
  globalCustomInstructions: string,
  cwd: string,
  mode: string,
  options: { language?: string; rooIgnoreInstructions?: string } = {}
): Promise<string> {
  const sections = [];

  // Load mode-specific rules if mode is provided
  const { content: modeRuleContent, usedRuleFile } = await loadModeRuleFiles(cwd, mode);

  // Add mode-specific custom instructions
  if (modeCustomInstructions && modeCustomInstructions.trim()) {
    sections.push(`Mode-specific instructions:\n\n${modeCustomInstructions}`);
  }

  // Add global custom instructions
  if (globalCustomInstructions && globalCustomInstructions.trim()) {
    sections.push(`Global instructions:\n\n${globalCustomInstructions}`);
  }

  // Add language-specific instructions
  if (options.language) {
    sections.push(`Language: ${options.language}`);
  }

  // Add rules - include both mode-specific and generic rules if they exist
  const rules = [];

  // Add mode-specific rules first if they exist
  if (modeRuleContent && modeRuleContent.trim()) {
    if (usedRuleFile.includes(path.join(".roo", `rules-${mode}`))) {
      rules.push(modeRuleContent.trim());
    } else {
      rules.push(`# Rules from ${usedRuleFile}:\n${modeRuleContent}`);
    }
  }

  if (options.rooIgnoreInstructions) {
    rules.push(options.rooIgnoreInstructions);
  }

  // Add generic rules
  const genericRuleContent = await loadRuleFiles(cwd);
  if (genericRuleContent && genericRuleContent.trim()) {
    rules.push(genericRuleContent.trim());
  }

  if (rules.length > 0) {
    sections.push(`Rules:\n\n${rules.join("\n\n")}`);
  }

  return sections.join("\n\n");
}
