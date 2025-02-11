import {Text, useInput} from 'ink';

// TODO: there's a bug here when a step automatically goes to the next step
// ie. ConstructorArguments
// it comes back to the current step. Will need to fix this

interface BackNavigationProps {
	onBack: () => void;
}

export const BackNavigation = ({onBack}: BackNavigationProps) => {
	useInput((_, key) => {
		if (key.leftArrow) {
			onBack();
		}
	});

	return (
		<Text>
			Press <Text color="blue">←</Text> to go back
		</Text>
	);
};
