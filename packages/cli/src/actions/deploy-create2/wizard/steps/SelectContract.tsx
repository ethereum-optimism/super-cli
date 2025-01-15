import {useFoundryProjectSolidityFiles} from '@/queries/listFoundryProjectSolidityFiles';
import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {Select, Spinner} from '@inkjs/ui';
import {Box, Text} from 'ink';

export const SelectContract = () => {
	const {wizardState, submitSelectContract} = useDeployCreate2WizardStore();

	if (wizardState.stepId !== 'select-contract') {
		throw new Error('Invalid state');
	}

	const {
		data: contractFileNames,
		isLoading,
		error,
	} = useFoundryProjectSolidityFiles(wizardState.foundryProjectPath);

	if (isLoading) {
		return (
			<Box flexDirection="column">
				<Spinner label="Loading contracts..." />
			</Box>
		);
	}

	if (error || !contractFileNames) {
		return (
			<Box flexDirection="column">
				<Text color="red">❌ Failed to load contracts</Text>
				{error && <Text>{error.toString()}</Text>}
			</Box>
		);
	}

	if (contractFileNames.length === 0) {
		return (
			<Box flexDirection="column">
				<Text color="yellow">⚠️ No contracts found in project</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1} paddingX={1}>
			<Text>Select which contract you want to deploy</Text>
			<Select
				options={contractFileNames.map(contractFileName => ({
					label: contractFileName,
					value: contractFileName,
				}))}
				onChange={value => submitSelectContract({selectedContract: value})}
			/>
		</Box>
	);
};
