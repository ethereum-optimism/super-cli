import {queryClient} from '@/commands/_app';
import {findSolidityFiles} from '@/lib/forge/findSolidityFiles';
import {getSrcDir} from '@/lib/forge/foundryProject';
import {QueryOptions, useQuery} from '@tanstack/react-query';

const getQueryParams = (foundryProjectPath: string) => {
	return {
		queryKey: ['listFoundryProjectSolidityFiles', foundryProjectPath],
		queryFn: () => findSolidityFiles(getSrcDir(foundryProjectPath)),
	} satisfies QueryOptions;
};

export const queryFoundryProjectSolidityFiles = async (
	foundryProjectPath: string,
) => {
	return queryClient.fetchQuery(getQueryParams(foundryProjectPath));
};

export const useFoundryProjectSolidityFiles = (foundryProjectPath: string) => {
	return useQuery({
		...getQueryParams(foundryProjectPath),
		staleTime: Infinity, // For the duration of the CLI session, we want to use the cached artifact
	});
};
