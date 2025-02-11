import {useState, useCallback, useRef} from 'react';
import {Box, Text, useInput} from 'ink';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {useTextInputState} from '@/components/path-input/useTextInputState';
import {useTextInput} from '@/components/path-input/useTextInput';

function expandHome(p: string) {
	if (!p) return p;
	if (p.startsWith('~')) {
		return path.join(os.homedir(), p.slice(1));
	}
	return p;
}

function normalizePath(p: string) {
	const expanded = expandHome(p);
	return path.isAbsolute(expanded)
		? expanded
		: path.resolve(process.cwd(), expanded);
}

function isDirectory(p: string) {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}

function getLongestCommonPrefix(strings: string[]) {
	if (strings.length === 0) return '';
	let prefix = strings[0]!;
	for (let i = 1; i < strings.length; i++) {
		const s = strings[i]!;
		let j = 0;
		while (j < prefix.length && j < s.length && prefix[j] === s[j]) {
			j++;
		}
		prefix = prefix.slice(0, j);
		if (prefix === '') return '';
	}
	return prefix;
}

interface PathInputProps {
	defaultValue?: string;
	onSubmit?: (path: string) => void;
}

export function PathInput({defaultValue = '', onSubmit}: PathInputProps) {
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [submittedPath, setSubmittedPath] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const lastValueRef = useRef<string>('');
	const lastSuggestionsRef = useRef<string[]>([]);
	const tabCountRef = useRef<number>(0);

	// Handle submission - only allow directory paths
	const handleSubmit = useCallback(
		(finalValue: string) => {
			const resolvedPath = normalizePath(finalValue);
			if (!isDirectory(resolvedPath)) {
				setError('Please select a valid directory');
				return;
			}
			setError(null);
			setSubmittedPath(resolvedPath);
			onSubmit?.(resolvedPath);
		},
		[onSubmit],
	);

	// Clear suggestions if user manually edits
	const handleChange = useCallback(() => {
		setSuggestions([]);
		setError(null);
		tabCountRef.current = 0;
	}, []);

	// Initialize text input state
	const state = useTextInputState({
		defaultValue,
		suggestions: [],
		onChange: handleChange,
		onSubmit: handleSubmit,
	});

	const {inputValue} = useTextInput({
		isDisabled: false,
		placeholder: '',
		state,
	});

	const completeDirectoryPath = useCallback((fullPath: string) => {
		const dir = path.dirname(fullPath);
		const base = path.basename(fullPath);
		if (!fs.existsSync(dir)) {
			return [];
		}
		const files = fs.readdirSync(dir);
		// Filter to only include directories
		const dirs = files.filter(file => {
			const fullFilePath = path.join(dir, file);
			return isDirectory(fullFilePath);
		});
		return base === ''
			? dirs.map(d => path.join(dir, d))
			: dirs.filter(dir => dir.startsWith(base)).map(d => path.join(dir, d));
	}, []);

	useInput((input, key) => {
		if (key.ctrl && input === 'u') {
			state.clear();
			setSuggestions([]);
			lastSuggestionsRef.current = [];
			return;
		}

		if (key.tab) {
			const currentValue = state.value;
			const fullPath = normalizePath(currentValue);

			// Check if input changed since last tab press
			if (currentValue === lastValueRef.current) {
				tabCountRef.current += 1;
			} else {
				tabCountRef.current = 1; // new tab cycle
			}

			lastValueRef.current = currentValue;

			// Handle directory logic
			if (fs.existsSync(fullPath) && isDirectory(fullPath)) {
				// If doesn't end with slash, add it first on tab press to mimic zsh
				if (!currentValue.endsWith(path.sep)) {
					state.insert(path.sep);
					setSuggestions([]);
					lastSuggestionsRef.current = [];
					return;
				} else {
					// Already ends with slash, attempt to complete items inside
					const dirs = fs
						.readdirSync(fullPath)
						.filter(file => isDirectory(path.join(fullPath, file)));

					if (dirs.length === 0) {
						// Empty directory or no subdirectories
						setSuggestions([]);
						lastSuggestionsRef.current = [];
						return;
					} else if (dirs.length === 1) {
						// Single match: complete it
						const single = dirs[0]!;
						for (const char of single) {
							state.insert(char);
						}
						state.insert(path.sep);
						setSuggestions([]);
						lastSuggestionsRef.current = [];
						return;
					} else {
						// Multiple matches
						const commonPrefix = getLongestCommonPrefix(dirs);

						if (commonPrefix.length > 0) {
							// Can partially complete
							for (const char of commonPrefix) {
								state.insert(char);
							}
							// After partial completion, don't show the list yet (zsh behavior),
							// another tab press would be needed to show full list.
							setSuggestions([]);
							lastSuggestionsRef.current = dirs.map(d =>
								path.join(fullPath, d),
							);
							return;
						} else {
							// No partial completion possible
							// Show all matches immediately
							const candidates = dirs.map(d => path.join(fullPath, d));
							setSuggestions(candidates);
							lastSuggestionsRef.current = candidates;
							return;
						}
					}
				}
			}

			// Normal directory completion logic
			const candidates = completeDirectoryPath(fullPath);
			if (candidates.length === 0) {
				// No matches
				setSuggestions([]);
				lastSuggestionsRef.current = [];
			} else if (candidates.length === 1) {
				// Single match
				const partial = path.basename(fullPath);
				const match = path.basename(candidates[0]!);
				const completion = match.slice(partial.length);
				for (const char of completion) {
					state.insert(char);
				}
				state.insert(path.sep);
				setSuggestions([]);
				lastSuggestionsRef.current = [];
			} else {
				// Multiple matches
				const partial = path.basename(fullPath);
				const names = candidates.map(c => path.basename(c));
				const commonPrefix = getLongestCommonPrefix(names);

				if (commonPrefix.length > partial.length) {
					// We can complete further
					const completion = commonPrefix.slice(partial.length);
					for (const char of completion) {
						state.insert(char);
					}
					// After this partial completion, user would press tab again to see all matches
					setSuggestions([]);
					lastSuggestionsRef.current = candidates;
				} else {
					// No further completion possible
					// Show all matches immediately
					setSuggestions(candidates);
					lastSuggestionsRef.current = candidates;
				}
			}
		}
	});

	return (
		<Box flexDirection="column">
			<Box>
				<Text dimColor>❯ </Text>
				<Text>{inputValue}</Text>
			</Box>

			{error && (
				<Box marginTop={1}>
					<Text color="red">✗ {error}</Text>
				</Box>
			)}

			{submittedPath && !error && (
				<Box marginTop={1}>
					<Text color="green">✓ Directory selected: </Text>
					<Text>{submittedPath}</Text>
				</Box>
			)}

			{suggestions.length > 0 && (
				<Box>
					<Text>{suggestions.map(s => path.basename(s) + '/').join(' ')}</Text>
				</Box>
			)}
		</Box>
	);
}
