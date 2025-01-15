import {fromFoundryArtifactPath} from '@/lib/forge/foundryProject';
import {createStandardJsonInput} from '@/actions/verify/createStandardJsonInput';
import {useQuery} from '@tanstack/react-query';

export const getStandardJsonInputQueryKey = (forgeArtifactPath: string) => [
	'standardJsonInput',
	forgeArtifactPath,
];

export const getStandardJsonInputQuery = async (forgeArtifactPath: string) => {
	const {foundryProject, contractFileName} = await fromFoundryArtifactPath(
		forgeArtifactPath,
	);

	const standardJsonInput = await createStandardJsonInput(
		foundryProject.baseDir,
		contractFileName,
	);

	return standardJsonInput;
};

export const useStandardJsonInputQuery = (forgeArtifactPath: string) => {
	return useQuery({
		queryKey: getStandardJsonInputQueryKey(forgeArtifactPath),
		queryFn: () => getStandardJsonInputQuery(forgeArtifactPath),
		staleTime: Infinity, // For the duration of the CLI session, this is cached
	});
};
