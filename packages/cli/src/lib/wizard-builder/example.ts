import {createWizardStore} from '@/lib/wizard-builder/createWizardStore';
import {defineWizard} from '@/lib/wizard-builder/defineWizard';
import {z} from 'zod';

const bridgeWizard = defineWizard()
	.addStep({
		id: 'selectNetwork',
		schema: z.object({
			network: z.string(),
		}),
		title: 'Select Network',
		getSummary: state => `${state.network}`,
	})
	.addStep({
		id: 'selectChains',
		schema: z.object({
			chainIds: z.array(z.number()),
		}),
		title: 'Select Chains',
		getSummary: state => `${state.chainIds.join(', ')}`,
	})
	.addStep({
		id: 'enterAmount',
		schema: z.object({
			amount: z.bigint(),
		}),
		title: 'Enter Amount',
		getSummary: state => {
			return `Amount: ${state.amount}`;
		},
	})
	.build();

export const store = createWizardStore(bridgeWizard);
