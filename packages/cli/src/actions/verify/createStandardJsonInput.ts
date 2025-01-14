import {getArtifactPathForContract} from '@/lib/forge/foundryProject';
import {readForgeArtifact} from '@/lib/forge/readForgeArtifact';
import fs from 'fs/promises';

// https://github.com/ethereum-optimism/optimism/issues/10202
// https://github.com/foundry-rs/foundry/issues/7791
// OP uses project root relative paths (ie. src/L2/...), and this breaks import remapping inside the artifact output
// When writing a contract that imports OP contracts, this is a problem
// The hacky solution is to assume src/ contracts are from OP monorepo
// if (filename starts with 'src/' && can't find it in the local artifacts)
// look for the file in the optimism contracts bedrock repo (check foundry.toml)
// and use that as the source

// TODO handle different install cases & different lib folders
// ie. npm installs
const opMonorepoPath = 'lib/optimism/packages/contracts-bedrock';

const getOpMonorepoFileName = (foundryPath: string, path: string) => {
	return `${foundryPath}/${opMonorepoPath}/${path}`;
};

const getFile = async (path: string) => {
	return await fs.readFile(path, 'utf8');
};

const getSource = async (foundryProjectPath: string, path: string) => {
	let content: string;

	try {
		content = await getFile(`${foundryProjectPath}/${path}`);
	} catch (e) {
		if (path.startsWith('src/')) {
			content = await getFile(getOpMonorepoFileName(foundryProjectPath, path));
		} else {
			throw e;
		}
	}
	return {
		content,
	};
};

const getSources = async (foundryProjectPath: string, paths: string[]) => {
	const sources = await Promise.all(
		paths.map(path => getSource(foundryProjectPath, path)),
	);

	return Object.fromEntries(
		sources.map((source, index) => [paths[index], source]),
	) as Record<string, {content: string}>;
};

export const createStandardJsonInput = async (
	foundryProjectPath: string,
	contractFileName: string,
) => {
	const artifact = await readForgeArtifact(
		getArtifactPathForContract(foundryProjectPath, contractFileName),
	);

	const sources = await getSources(
		foundryProjectPath,
		Object.keys(artifact.metadata.sources),
	);

	return {
		version: artifact.metadata.compiler.version,
		language: artifact.metadata.language,
		sources: sources,
		settings: {
			remappings: artifact.metadata.settings.remappings,
			optimizer: artifact.metadata.settings.optimizer,
			metadata: artifact.metadata.settings.metadata,
			evmVersion: artifact.metadata.settings.evmVersion,
			libraries: artifact.metadata.settings.libraries,
		},
	};
};
