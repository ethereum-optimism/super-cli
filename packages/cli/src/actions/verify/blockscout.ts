import {Address} from 'viem';
// TODO switch to a real type
export const verifyContractOnBlockscout = async (
	blockscoutApiBaseUrl: string,
	contractAddress: Address,
	contractName: string,
	standardJsonInput: any,
) => {
	// ie. https://eth.blockscout.com/api/v2/smart-contracts/0x9c1c619176b4f8521a0ab166945d785b92aef453/verification/via/standard-input
	const url = `${blockscoutApiBaseUrl}/api/v2/smart-contracts/${contractAddress}/verification/via/standard-input`;

	const formData = new FormData();

	const jsonBlob = new Blob([JSON.stringify(standardJsonInput)], {
		type: 'application/json',
	});

	formData.append('compiler_version', standardJsonInput.version);
	formData.append('license_type', 'mit');
	formData.append('contract_name', contractName);
	formData.append('autodetect_constructor_args', 'false');
	formData.append('constructor_args', '');
	formData.append('files[0]', jsonBlob, 'temp-input.json');

	const response = await fetch(url, {
		method: 'POST',
		body: formData,
	});

	const result = await response.json();

	if (
		result.message === 'Smart-contract verification started' ||
		result.message === 'Already verified'
	) {
		return;
	}

	throw new Error(result.message);
	// TODO poll for result - although blockscout doesn't have that endpoint
};
