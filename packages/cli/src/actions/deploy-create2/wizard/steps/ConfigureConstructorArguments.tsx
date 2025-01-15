import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {getConstructorAbi} from '@/lib/abi';
import {Box} from 'ink';
import {AbiItemForm} from '@/components/AbiItemForm';
import {getArtifactPathForContract} from '@/lib/forge/foundryProject';
import {useForgeArtifact} from '@/queries/forgeArtifact';
import {Spinner} from '@inkjs/ui';
import {useEffect} from 'react';

export const ConfigureConstructorArguments = () => {
	const {wizardState, submitConfigureConstructorArguments} =
		useDeployCreate2WizardStore();

	if (wizardState.stepId !== 'configure-constructor-arguments') {
		throw new Error('Invalid state');
	}

	const path = getArtifactPathForContract(
		wizardState.foundryProjectPath,
		wizardState.selectedContract,
	);

	const {data: artifact, isLoading} = useForgeArtifact(path);

	const constructorAbi =
		artifact === undefined ? undefined : getConstructorAbi(artifact.abi);

	useEffect(() => {
		if (artifact && !constructorAbi) {
			// Some contracts don't have a constructor
			submitConfigureConstructorArguments({constructorArgs: []});
		}
	}, [artifact]);

	if (isLoading || !artifact) {
		return (
			<Box flexDirection="column">
				<Spinner label="Loading artifact..." />
			</Box>
		);
	}

	if (!constructorAbi) {
		return null;
	}

	return (
		<Box flexDirection="column">
			<AbiItemForm
				abiItem={constructorAbi}
				onSubmit={result => {
					// @ts-ignore TODO fix type
					submitConfigureConstructorArguments({constructorArgs: result});
				}}
			/>
		</Box>
	);
};
