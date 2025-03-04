import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {Box, Text} from 'ink';
import {Spinner} from '@inkjs/ui';
import {useUpdateUserContext, useUserContext} from '@/queries/userContext';
import {PathInput} from '@/components/path-input/PathInput';
import {findFoundryRootDown} from '@/util/forge/foundryProject';
import {useState} from 'react';

export const EnterFoundryProjectPath = () => {
	const {submitEnterFoundryProjectPath} = useDeployCreate2WizardStore();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [foundRoot, setFoundRoot] = useState<string | null>(null);

	const {data: userContext, isLoading: isUserContextLoading} = useUserContext();

	const {mutate: updateUserContext} = useUpdateUserContext();

	// if (wizardState.stepId !== 'enter-foundry-project-path') {
	// 	console.log('Invalid state', wizardState.stepId);
	// 	throw new Error('Invalid state');
	// }

	if (isUserContextLoading || !userContext) {
		return <Spinner />;
	}

	return (
		<Box flexDirection="column">
			<Box>
				<Text>Enter the path to your </Text>
				<Text color="cyan" bold>
					Foundry
				</Text>
				<Text> project </Text>
				<Text>(press </Text>
				<Text bold>Tab</Text>
				<Text> for autocomplete, </Text>
				<Text bold>Ctrl+U</Text>
				<Text> to clear, default: </Text>
				<Text color="green" bold>
					.
				</Text>
				<Text>)</Text>
				<Text>:</Text>
			</Box>
			{errorMessage && (
				<Box>
					<Text color="yellow">{errorMessage} </Text>
					{foundRoot && (
						<Text color="cyan" bold>
							{foundRoot}
						</Text>
					)}
				</Box>
			)}
			<PathInput
				defaultValue={userContext.forgeProjectPath ?? ''}
				onSubmit={async foundryProjectPath => {
					const projectPath = foundryProjectPath.trim();
					// setErrorMessage(null);
					// setFoundRoot(null);

					let foundryRoot: string | undefined;
					try {
						foundryRoot = await findFoundryRootDown(projectPath, 4);

						if (foundryRoot && foundryRoot !== projectPath) {
							setErrorMessage(
								'No foundry.toml found here, but one was found at:',
							);
							setFoundRoot(foundryRoot);
							return;
						}

						if (projectPath !== '') {
							updateUserContext({
								forgeProjectPath: projectPath,
							});
						}

						submitEnterFoundryProjectPath({
							foundryProjectPath: projectPath === '' ? '.' : projectPath,
						});
					} catch (e) {
						setErrorMessage('Could not find a Foundry project (foundry.toml)');
					}
				}}
			/>
		</Box>
	);
};
