import fs from 'fs/promises';
import path from 'path';

export const findSolidityFiles = async (
	dir: string,
	baseDir: string = dir,
): Promise<string[]> => {
	const entries = await fs.readdir(dir, {withFileTypes: true});
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await findSolidityFiles(fullPath, baseDir)));
		} else if (entry.isFile() && entry.name.endsWith('.sol')) {
			files.push(path.relative(baseDir, fullPath));
		}
	}

	return files;
};
