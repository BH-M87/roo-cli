/**
 * 从 package.json 中获取版本号
 * 这样可以确保代码中的版本号与 package.json 中的版本号保持一致
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// 读取 package.json 文件
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// 导出版本号
export const VERSION = packageJson.version;
