import {
	deployCreate2WizardIndexByStepId,
	DeployCreate2WizardStepId,
	useDeployCreate2WizardStore,
} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {Box, Text} from 'ink';
import {EnterFoundryProjectPath} from '@/actions/deploy-create2/wizard/steps/EnterFoundryProjectPath';
import {SelectContract} from '@/actions/deploy-create2/wizard/steps/SelectContract';
import {ConfigureConstructorArguments} from '@/actions/deploy-create2/wizard/steps/ConfigureConstructorArguments';
import {ConfigureSalt} from '@/actions/deploy-create2/wizard/steps/ConfigureSalt';
import {SelectNetwork} from '@/actions/deploy-create2/wizard/steps/SelectNetwork';
import {SelectChains} from '@/actions/deploy-create2/wizard/steps/SelectChains';
import {ShouldVerifyContract} from '@/actions/deploy-create2/wizard/steps/ShouldVerifyContract';
import {getArtifactPathForContract} from '@/util/forge/foundryProject';
import {useSaveWizardProgress} from '@/hooks/useSaveWizardProgress';
import {DeployCreate2Command} from '@/actions/deploy-create2/DeployCreate2Command';
import {toCliFlags} from '@/util/toCliFlags';
import {BackNavigation} from '@/components/navigation/BackNavigation';
import path from 'path';

type StepStatus = 'done' | 'current' | 'upcoming';

type StepProgress = {
	status: StepStatus;
	title: string;
	summary?: string;
};

const useStepProgress = ({
	stepId,
}: {
	stepId: DeployCreate2WizardStepId;
}): StepProgress => {
	const {steps, wizardState} = useDeployCreate2WizardStore();

	const currentIndex = deployCreate2WizardIndexByStepId[wizardState.stepId];
	const stepIndex = deployCreate2WizardIndexByStepId[stepId];

	const step = steps[stepIndex]!;

	if (stepIndex < currentIndex) {
		return {
			status: 'done' as const,
			title: step.title,
			summary: step.getSummary
				? step.getSummary(wizardState as unknown as any)
				: undefined,
		};
	}

	if (stepIndex === currentIndex) {
		return {
			status: 'current' as const,
			title: step.title,
		};
	}

	return {
		status: 'upcoming' as const,
		title: step.title,
	};
};

const WizardProgressForStep = ({
	stepId,
}: {
	stepId: DeployCreate2WizardStepId;
}) => {
	const {status, title, summary} = useStepProgress({stepId});

	return (
		<Box gap={1} paddingX={1}>
			<Text
				color={
					status === 'done' ? 'green' : status === 'current' ? 'blue' : 'gray'
				}
			>
				{status === 'done' ? '✓' : status === 'current' ? '>' : '○'}
			</Text>
			<Text color={status === 'current' ? 'blue' : 'white'}> {title}</Text>
			{status === 'done' && summary && <Text color="yellow">{summary}</Text>}
		</Box>
	);
};

const WizardProgress = () => {
	const {steps, wizardState, goToPreviousStep} = useDeployCreate2WizardStore();
	if (wizardState.stepId === 'completed') {
		return (
			<Box>
				<Text>Completed</Text>
			</Box>
		);
	}

	const isFirstStep = wizardState.stepId === steps[0]?.id;

	return (
		<Box flexDirection="column">
			{steps
				.filter(({id}) => id !== 'completed')
				.map(({id}) => {
					return <WizardProgressForStep stepId={id} key={id} />;
				})}
			{!isFirstStep && (
				<Box marginTop={1}>
					<BackNavigation onBack={goToPreviousStep} />
				</Box>
			)}
		</Box>
	);
};

export const DeployCreate2Wizard = ({
	isPrepareMode,
}: {
	isPrepareMode?: boolean;
}) => {
	const {wizardState} = useDeployCreate2WizardStore();

	useSaveWizardProgress('deployCreate2', wizardState, ['completed']);

	const stepId = wizardState.stepId;

	if (stepId === 'completed') {
		const options = {
			chains: wizardState.chainNames,
			salt: `"${wizardState.salt}"`,
			forgeArtifactPath: path.relative(
				process.cwd(),
				getArtifactPathForContract(
					wizardState.foundryProjectPath,
					wizardState.selectedContract,
				),
			),
			constructorArgs: wizardState.constructorArgs.join(','),
			network: wizardState.network,
			verify: wizardState.shouldVerifyContract,
		};

		if (isPrepareMode) {
			console.log(`sup deploy create2 ${toCliFlags(options)}`);

			// TODO: hacky way to quit until we remove pastel
			setTimeout(() => {
				process.exit(0);
			}, 1);

			return null;
		}

		return <DeployCreate2Command options={options} />;
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold color="blue">
				🚀 Deploy Create2 Wizard
			</Text>
			<WizardProgress />
			{stepId === 'enter-foundry-project-path' && <EnterFoundryProjectPath />}
			{stepId === 'select-contract' && <SelectContract />}
			{stepId === 'configure-constructor-arguments' && (
				<ConfigureConstructorArguments />
			)}
			{stepId === 'configure-salt' && <ConfigureSalt />}
			{stepId === 'select-network' && <SelectNetwork />}
			{stepId === 'select-chains' && <SelectChains />}
			{stepId === 'should-verify-contract' && <ShouldVerifyContract />}
		</Box>
	);
};
