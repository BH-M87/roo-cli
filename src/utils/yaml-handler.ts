import * as yaml from 'js-yaml';
import { logger } from './logger';

/**
 * YAML parsing result
 */
export interface YamlParseResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	lineNumber?: number;
	column?: number;
}

/**
 * YAML formatting options
 */
export interface YamlFormatOptions {
	indent?: number;
	lineWidth?: number;
	noRefs?: boolean;
	noCompatMode?: boolean;
	condenseFlow?: boolean;
	quotingType?: '"' | "'";
	forceQuotes?: boolean;
}

/**
 * Safely parse YAML content with detailed error reporting
 * @param content YAML content to parse
 * @param filename Optional filename for better error messages
 * @returns Parse result with success status and data or error details
 */
export function safeParseYaml<T = any>(
	content: string,
	filename?: string,
): YamlParseResult<T> {
	try {
		if (!content || content.trim() === '') {
			return {
				success: false,
				error: 'Empty YAML content',
			};
		}

		const data = yaml.load(content, {
			filename,
			onWarning: (warning: any) => {
				logger.warn(
					`YAML warning in ${filename || 'content'}: ${warning.message}`,
				);
			},
		}) as T;

		return {
			success: true,
			data,
		};
	} catch (error) {
		let errorMessage = 'Unknown YAML parsing error';
		let lineNumber: number | undefined;
		let column: number | undefined;

		if (error instanceof yaml.YAMLException) {
			errorMessage = error.message;
			if ((error as any).mark) {
				lineNumber = (error as any).mark.line + 1; // Convert to 1-based line numbers
				column = (error as any).mark.column + 1; // Convert to 1-based column numbers
			}
		} else if (error instanceof Error) {
			errorMessage = error.message;
		}

		const contextInfo = filename ? ` in ${filename}` : '';
		const locationInfo =
			lineNumber && column ? ` at line ${lineNumber}, column ${column}` : '';
		const fullError = `YAML parsing error${contextInfo}${locationInfo}: ${errorMessage}`;

		logger.error(fullError);

		return {
			success: false,
			error: fullError,
			lineNumber,
			column,
		};
	}
}

/**
 * Safely stringify data to YAML with error handling
 * @param data Data to stringify
 * @param options YAML formatting options
 * @returns Stringified YAML or error message
 */
export function safeStringifyYaml(
	data: any,
	options: YamlFormatOptions = {},
): YamlParseResult<string> {
	try {
		const yamlOptions: yaml.DumpOptions = {
			indent: options.indent || 2,
			lineWidth: options.lineWidth || 80,
			noRefs: options.noRefs || false,
			noCompatMode: options.noCompatMode || false,
			condenseFlow: options.condenseFlow || false,
			quotingType: options.quotingType || '"',
			forceQuotes: options.forceQuotes || false,
		};

		const yamlString = yaml.dump(data, yamlOptions);

		return {
			success: true,
			data: yamlString,
		};
	} catch (error) {
		let errorMessage = 'Unknown YAML stringification error';

		if (error instanceof Error) {
			errorMessage = error.message;
		}

		const fullError = `YAML stringification error: ${errorMessage}`;
		logger.error(fullError);

		return {
			success: false,
			error: fullError,
		};
	}
}

/**
 * Validate YAML content and provide helpful error messages
 * @param content YAML content to validate
 * @param filename Optional filename for better error messages
 * @returns Validation result with detailed error information
 */
export function validateYaml(
	content: string,
	filename?: string,
): YamlParseResult<boolean> {
	const parseResult = safeParseYaml(content, filename);

	if (parseResult.success) {
		return {
			success: true,
			data: true,
		};
	}

	return {
		success: false,
		error: parseResult.error,
		lineNumber: parseResult.lineNumber,
		column: parseResult.column,
	};
}

/**
 * Fix common YAML formatting issues
 * @param content YAML content to fix
 * @returns Fixed YAML content or original if no fixes needed
 */
export function fixCommonYamlIssues(content: string): string {
	let fixed = content;

	// Fix common indentation issues
	fixed = fixed.replace(/\t/g, '  '); // Replace tabs with spaces

	// Fix trailing spaces
	fixed = fixed.replace(/ +$/gm, '');

	// Fix multiple consecutive empty lines
	fixed = fixed.replace(/\n\n\n+/g, '\n\n');

	// Ensure file ends with newline
	if (fixed && !fixed.endsWith('\n')) {
		fixed += '\n';
	}

	return fixed;
}

/**
 * Get YAML parsing suggestions based on error
 * @param error Error message from YAML parsing
 * @returns Array of helpful suggestions
 */
export function getYamlErrorSuggestions(error: string): string[] {
	const suggestions: string[] = [];

	if (error.includes('tab character')) {
		suggestions.push(
			"Replace tab characters with spaces (YAML doesn't allow tabs for indentation)",
		);
	}

	if (error.includes('expected <block end>')) {
		suggestions.push(
			'Check indentation - all items at the same level should have the same indentation',
		);
	}

	if (error.includes('found character that cannot start any token')) {
		suggestions.push('Check for special characters that need to be quoted');
	}

	if (error.includes("could not find expected ':'")) {
		suggestions.push(
			'Make sure all keys are followed by a colon and space (key: value)',
		);
	}

	if (error.includes('mapping values are not allowed here')) {
		suggestions.push(
			'Check for missing quotes around string values that contain colons',
		);
	}

	if (error.includes('found undefined alias')) {
		suggestions.push('Check YAML anchors and references (&anchor, *reference)');
	}

	if (suggestions.length === 0) {
		suggestions.push('Check YAML syntax and indentation');
		suggestions.push('Use a YAML validator to identify specific issues');
	}

	return suggestions;
}

/**
 * Format YAML error message with context and suggestions
 * @param error Error from YAML parsing
 * @param content Original YAML content
 * @param filename Optional filename
 * @returns Formatted error message with context
 */
export function formatYamlError(
	error: string,
	content: string,
	filename?: string,
): string {
	const suggestions = getYamlErrorSuggestions(error);
	const lines = content.split('\n');

	let formattedError = `YAML Error${filename ? ` in ${filename}` : ''}:\n${error}\n`;

	// Extract line number from error if available
	const lineMatch = error.match(/line (\d+)/);
	if (lineMatch) {
		const lineNum = parseInt(lineMatch[1], 10);
		const contextStart = Math.max(0, lineNum - 3);
		const contextEnd = Math.min(lines.length, lineNum + 2);

		formattedError += '\nContext:\n';
		for (let i = contextStart; i < contextEnd; i++) {
			const marker = i === lineNum - 1 ? '>>> ' : '    ';
			formattedError += `${marker}${i + 1}: ${lines[i]}\n`;
		}
	}

	formattedError += '\nSuggestions:\n';
	suggestions.forEach((suggestion, index) => {
		formattedError += `${index + 1}. ${suggestion}\n`;
	});

	return formattedError;
}
