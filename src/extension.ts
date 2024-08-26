import * as vscode from 'vscode';
import * as asciiTree from 'ascii-tree';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsPanel } from './settingsPanel';

export function activate(context: vscode.ExtensionContext) {
	console.log('Prompt Perfect is now active!');

	let openEditorsDisposable = vscode.commands.registerCommand(
		'prompt-perfect.openEditors',
		() => {
			generatePrompt(false);
		}
	);

	let openEditorsAndASCIITreeDisposable = vscode.commands.registerCommand(
		'prompt-perfect.openEditorsAndASCIITree',
		() => {
			generatePrompt(true);
		}
	);

	let settingsPanelDisposable = vscode.commands.registerCommand(
		'prompt-perfect.openSettings',
		() => {
			SettingsPanel.createOrShow(context.extensionUri);
		}
	);

	context.subscriptions.push(
		openEditorsDisposable,
		openEditorsAndASCIITreeDisposable,
		settingsPanelDisposable
	);
}

async function generatePrompt(includeASCIITree: boolean) {
	const config = vscode.workspace.getConfiguration('promptPerfect');
	const allDocuments = vscode.workspace.textDocuments;

	console.log(
		`LOGGING: allDocuments count: ${allDocuments.length}; includeASCIITree: ${includeASCIITree}`
	);

	let output = '';

	if (includeASCIITree) {
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		if (workspaceRoot) {
			const treeStructure = generateTreeStructure(
				workspaceRoot,
				allDocuments,
				config.get('treeDepthLimit') as number
			);
			const asciiTreeOutput = asciiTree.generate(treeStructure);
			output += `\`\`\`Source Tree\n${asciiTreeOutput}\n\`\`\`\n\n`;
		}
	}

	for (const document of allDocuments) {
		// Skip documents that are not file-based (e.g., git commit messages)
		if (document.uri.scheme !== 'file') {
			continue;
		}

		const filePath = vscode.workspace.asRelativePath(document.uri);
		const fileContent = document.getText();
		const fileSize = Buffer.byteLength(fileContent, 'utf8');

		if (fileSize > 1024 * 1024) {
			// 1MB
			const proceed = await vscode.window.showWarningMessage(
				`Large file detected: ${filePath} (${(
					fileSize /
					1024 /
					1024
				).toFixed(2)} MB). Include it?`,
				'Yes',
				'No'
			);
			if (proceed !== 'Yes') {
				continue;
			}
		}

		output += `\`\`\`${filePath}\n${fileContent}\n\`\`\`\n\n`;
	}

	const additionalInstructions = config.get(
		'additionalInstructions'
	) as string;
	if (additionalInstructions) {
		output += `Additional Instructions:\n${additionalInstructions}\n`;
	}

	if (config.get('limitPromptLength')) {
		const maxTokens = config.get('maxTokens') as number;
		const tokenCount = output.split(/\s+/).length; // This is a very simple token count, you might want to use a more sophisticated method
		if (tokenCount > maxTokens) {
			vscode.window.showWarningMessage(
				`Token limit exceeded. Required: ${tokenCount}, Limit: ${maxTokens}`
			);
			return;
		}
	}

	const outputChannel = vscode.window.createOutputChannel('Prompt Perfect');
	outputChannel.clear();
	outputChannel.append(output);
	outputChannel.show();

	if (config.get('autoCopyToClipboard')) {
		await vscode.env.clipboard.writeText(output);
		vscode.window.showInformationMessage('Prompt copied to clipboard!');
	}
}

function generateTreeStructure(
	rootPath: string,
	openDocuments: readonly vscode.TextDocument[],
	depthLimit: number
): string {
	console.log('LOGGING: entering generateTreeStructure');

	const openFilePaths = openDocuments.map((doc) => doc.uri.fsPath);
	const tree = buildTree(rootPath, openFilePaths, depthLimit);
	return formatTree(tree);
}

function buildTree(
	currentPath: string,
	openFilePaths: string[],
	depthLimit: number,
	currentDepth: number = 0
): any {
	console.log(
		`LOGGING: entering buildTree, with ${openFilePaths.length} open files`
	);

	if (currentDepth >= depthLimit && depthLimit !== -1) {
		return null;
	}

	const stats = fs.statSync(currentPath);
	const name = path.basename(currentPath);

	if (stats.isFile()) {
		return openFilePaths.includes(currentPath) ? name : null;
	}

	const children = fs
		.readdirSync(currentPath)
		.map((child) =>
			buildTree(
				path.join(currentPath, child),
				openFilePaths,
				depthLimit,
				currentDepth + 1
			)
		)
		.filter((child) => child !== null);

	return children.length > 0 ? { [name]: children } : null;
}

function formatTree(tree: any): string {
	console.log('LOGGING: entering formatTree');
	if (typeof tree === 'string') {
		return tree;
	}

	const entries = Object.entries(tree);
	if (entries.length === 0) {
		return '';
	}

	const [name, children] = entries[0];
	if (!Array.isArray(children)) {
		return name;
	}

	return `${name}\n${children
		.map((child: any) => `  ${formatTree(child)}`)
		.join('\n')}`;
}

export function deactivate() {}
