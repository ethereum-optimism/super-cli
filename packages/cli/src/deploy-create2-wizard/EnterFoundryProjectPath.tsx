import {useDeployCreate2WizardStore} from '@/deploy-create2-wizard/deployCreate2WizardStore';
import {Box, Text} from 'ink';
import {Spinner} from '@inkjs/ui';
import {useUpdateUserContext, useUserContext} from '@/queries/userContext';
import {PathInput} from '@/components/path-input/PathInput';

export const EnterFoundryProjectPath = () => {
	const {wizardState, submitEnterFoundryProjectPath} =
		useDeployCreate2WizardStore();

	const {data: userContext, isLoading: isUserContextLoading} = useUserContext();

	const {mutate: updateUserContext} = useUpdateUserContext();

	if (wizardState.stepId !== 'enter-foundry-project-path') {
		throw new Error('Invalid state');
	}

	if (isUserContextLoading || !userContext) {
		return <Spinner />;
	}

	return (
		<Box flexDirection="column">
			<Box>
				<Text>Enter the path to your foundry project (default: "."):</Text>
			</Box>
			<PathInput
				defaultValue={userContext.forgeProjectPath ?? ''}
				onSubmit={foundryProjectPath => {
					const projectPath = foundryProjectPath.trim();
					if (projectPath !== '') {
						updateUserContext({
							forgeProjectPath: projectPath,
						});
					}

					submitEnterFoundryProjectPath({
						foundryProjectPath: projectPath === '' ? '.' : projectPath,
					});
				}}
			/>
		</Box>
	);
};
