import {queryClient} from '@/commands/_app';
import {readForgeArtifact} from '@/forge/readForgeArtifact';
import {QueryOptions, useQuery} from '@tanstack/react-query';

export const getForgeArtifactQueryParams = (artifactPath: string) => {
	return {
		queryKey: ['forgeArtifact', artifactPath],
		queryFn: () => readForgeArtifact(artifactPath),
	} satisfies QueryOptions;
};

export const queryForgeArtifact = async (artifactPath: string) => {
	return queryClient.fetchQuery(getForgeArtifactQueryParams(artifactPath));
};

export const useForgeArtifact = (artifactPath: string) => {
	return useQuery({
		...getForgeArtifactQueryParams(artifactPath),
		staleTime: Infinity, // For the duration of the CLI session, we want to use the cached artifact
	});
};
