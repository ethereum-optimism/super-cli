import {zodSupportedNetwork} from '@/superchain-registry/fetchChainList';
import {createWizardStore} from '@/wizard-builder/createWizardStore';
import {defineWizard, InferStepId} from '@/wizard-builder/defineWizard';
import {z} from 'zod';

const deployCreate2WizardStore = defineWizard()
	.addStep({
		id: 'enter-foundry-project-path',
		schema: z.object({
			foundryProjectPath: z.string(),
		}),
		title: 'Enter Foundry Project Path',
		getSummary: state => state.foundryProjectPath,
	})
	.addStep({
		id: 'select-contract',
		schema: z.object({
			selectedContract: z.string(),
		}),
		title: 'Select Contract',
		getSummary: state => state.selectedContract,
	})
	.addStep({
		id: 'configure-constructor-arguments',
		schema: z.object({
			constructorArgs: z.array(z.string()),
		}),
		title: 'Configure Constructor Arguments',
		getSummary: state => state.constructorArgs.join(', '),
	})
	.addStep({
		id: 'configure-salt',
		schema: z.object({
			salt: z.string(),
		}),
		title: 'Configure Salt',
		getSummary: state => state.salt,
	})
	.addStep({
		id: 'select-network',
		schema: z.object({
			network: zodSupportedNetwork,
		}),
		title: 'Select Network',
		getSummary: state => state.network,
	})
	.addStep({
		id: 'select-chains',
		schema: z.object({
			chainNames: z.array(z.string()),
		}),
		title: 'Select Chains',
		getSummary: state => state.chainNames.join(', '),
	})
	// .addStep({
	// 	id: 'enter-private-key',
	// 	schema: z.object({
	// 		privateKey: zodHex,
	// 		address: zodAddress,
	// 	}),
	// 	title: 'Enter Private Key',
	// 	getSummary: state => `${state.address}`,
	// })
	.build();

export type DeployCreate2WizardStore = typeof deployCreate2WizardStore;

export type DeployCreate2WizardStepId = InferStepId<
	typeof deployCreate2WizardStore
>;

export const useDeployCreate2WizardStore = createWizardStore(
	deployCreate2WizardStore,
);

export const deployCreate2WizardIndexByStepId = deployCreate2WizardStore.reduce(
	(acc, step, index) => {
		acc[step.id] = index;
		return acc;
	},
	{} as Record<DeployCreate2WizardStepId, number>,
);
