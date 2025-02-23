import fs from 'fs/promises';
import path from 'path';

// TODO: update to use foundry.toml

const SRC_DIR = 'src';
const ARTIFACT_DIR = 'out';

export const getSrcDir = (foundryProjectPath: string) => {
	return path.join(foundryProjectPath, SRC_DIR);
};

export const getArtifactDir = (foundryProjectPath: string) => {
	return path.join(foundryProjectPath, ARTIFACT_DIR);
};

export const getArtifactPathForContract = (
	foundryProjectPath: string,
	contractFileRelativePath: string,
) => {
	const contractFileName = path.basename(contractFileRelativePath);
	return path.join(
		getArtifactDir(foundryProjectPath),
		`${contractFileName}`,
		`${
			contractFileName.endsWith('.sol')
				? contractFileName.slice(0, -4)
				: contractFileName
		}.json`,
	);
};

export const findFoundryRootUp = async (
	startPath: string,
	maxDepth = 6,
): Promise<string> => {
	let currentPath = startPath;
	let depth = 0;
	const root = path.parse(currentPath).root;

	while (currentPath !== root && depth < maxDepth) {
		try {
			await fs.access(path.join(currentPath, 'foundry.toml'));
			return currentPath;
		} catch {
			currentPath = path.dirname(currentPath);
			depth++;
		}
	}

	// Only check root if we haven't exceeded maxDepth
	if (depth < maxDepth) {
		try {
			await fs.access(path.join(root, 'foundry.toml'));
			return root;
		} catch {
			throw new Error('Could not find foundry.toml in any parent directory');
		}
	}

	throw new Error(
		`Could not find foundry.toml within ${maxDepth} parent directories`,
	);
};

export const findFoundryRootDown = async (
	startPath: string,
	maxDepth = 6,
): Promise<string> => {
	const searchDir = async (
		currentPath: string,
		depth: number,
	): Promise<string> => {
		if (depth > maxDepth) {
			throw new Error(
				`Could not find foundry.toml within ${maxDepth} subdirectories`,
			);
		}

		try {
			const entries = await fs.readdir(currentPath, {withFileTypes: true});

			// First check if foundry.toml exists in current directory
			if (
				entries.some(entry => entry.isFile() && entry.name === 'foundry.toml')
			) {
				return currentPath;
			}

			// Then recursively check subdirectories
			for (const entry of entries) {
				if (entry.isDirectory()) {
					try {
						const subdirPath = path.join(currentPath, entry.name);
						return await searchDir(subdirPath, depth + 1);
					} catch (e) {
						// Continue searching other directories if one branch fails
						continue;
					}
				}
			}

			throw new Error('No foundry.toml found in this directory branch');
		} catch (e) {
			throw new Error(
				`Could not find foundry.toml within ${maxDepth} subdirectories`,
			);
		}
	};

	return searchDir(startPath, 0);
};

export type FoundryProject = {
	baseDir: string;
	srcDir: string;
	artifactDir: string;
};

export const fromBasePath = (baseDir: string): FoundryProject => {
	return {
		baseDir,
		srcDir: path.join(baseDir, SRC_DIR),
		artifactDir: path.join(baseDir, ARTIFACT_DIR),
	};
};

// artifact is a .json file in the out/ directory
export const fromFoundryArtifactPath = async (foundryArtifactPath: string) => {
	const absolutePath = path.resolve(foundryArtifactPath);
	const foundryProjectPath = await findFoundryRootUp(
		path.dirname(absolutePath),
	);
	const foundryProject = fromBasePath(foundryProjectPath);

	// Get the relative path from the project base to the artifact file
	const relativePath = path.relative(foundryProject.srcDir, absolutePath);

	return {
		foundryProject,
		contractFileName: `${path.basename(relativePath).replace('.json', '')}.sol`,
	};
};

export const getContractNameFromFoundryArtifactPath = async (
	foundryArtifactPath: string,
) => {
	return `${foundryArtifactPath.replace('.json', '')}.sol`;
};
