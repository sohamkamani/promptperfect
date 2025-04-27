import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import ignore from 'ignore';
import { SettingsViewProvider } from './settingsView';

interface TreeNode {
	name: string;
	type: string;
	children?: TreeNode[];
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Prompt Perfect is now active!');

	const settingsViewProvider = new SettingsViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SettingsViewProvider.viewType,
			settingsViewProvider
		)
	);

	const openEditorsDisposable = vscode.commands.registerCommand(
		'prompt-perfect.openEditors',
		() => {
			generatePrompt(false);
		}
	);

	const openEditorsAndASCIITreeDisposable = vscode.commands.registerCommand(
		'prompt-perfect.openEditorsAndASCIITree',
		() => {
			generatePrompt(true);
		}
	);

	context.subscriptions.push(
		openEditorsDisposable,
		openEditorsAndASCIITreeDisposable
	);
}

async function generatePrompt(includeASCIITree: boolean) {
	const config = vscode.workspace.getConfiguration('promptPerfect');
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

	if (!workspaceRoot) {
		vscode.window.showErrorMessage('No workspace folder is open');
		return;
	}

	// Get all open text documents, including those from inactive editors
	const allDocuments = vscode.window.tabGroups.all
		.reduce(
			(acc: vscode.Tab[], group: vscode.TabGroup) =>
				acc.concat(group.tabs),
			[]
		)
		.filter((tab: vscode.Tab) => tab.input instanceof vscode.TabInputText)
		.map((tab: vscode.Tab) => (tab.input as vscode.TabInputText).uri)
		.filter(
			(uri: vscode.Uri) =>
				uri.scheme === 'file' && uri.fsPath.startsWith(workspaceRoot)
		)
		.map((uri: vscode.Uri) => vscode.workspace.openTextDocument(uri));

	const openDocuments = await Promise.all(allDocuments);

	console.log(
		`LOGGING: allDocuments count: ${openDocuments.length}; includeASCIITree: ${includeASCIITree}`
	);

	// Load .gitignore
	const gitignorePath = path.join(workspaceRoot, '.gitignore');
	const ig = ignore();
	ig.add('.git/'); // Always ignore .git directory
	if (fs.existsSync(gitignorePath)) {
		const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
		ig.add(gitignoreContent);
	}

	let output = '';

	const prefix = config.get('prefix') as string;
	if (prefix) {
		output += `${prefix}\n\n`;
	}

	if (includeASCIITree) {
		const treeStructure = generateTreeStructure(
			workspaceRoot,
			openDocuments,
			ig,
			config.get('treeDepthLimit') as number
		);
		output += `\`\`\`Source Tree\n${treeStructure}\n\`\`\`\n\n`;
	}

	for (const document of openDocuments) {
		const relativePath = path.relative(workspaceRoot, document.uri.fsPath);
		if (relativePath && ig.ignores(relativePath)) {
			continue;
		}

		const fileContent = document.getText();
		const fileSize = Buffer.byteLength(fileContent, 'utf8');

		if (fileSize > 1024 * 1024) {
			// 1MB
			const proceed = await vscode.window.showWarningMessage(
				`Large file detected: ${relativePath} (${(
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

		output += `\`\`\`${relativePath}\n${fileContent}\n\`\`\`\n\n`;
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

export function generateTreeStructure(
	rootPath: string,
	openDocuments: readonly vscode.TextDocument[],
	ig: ReturnType<typeof ignore>,
	depthLimit: number
): string {
	const openFilePaths = openDocuments.map((doc) => doc.uri.fsPath);
	const effectiveDepthLimit = depthLimit < 0 ? Infinity : depthLimit;
	const tree = buildTree(rootPath, openFilePaths, ig, effectiveDepthLimit, 0);
	if (!tree) return '';

	return formatTreeToAscii(tree, '', true, true).trimEnd();
}

export function buildTree(
	currentPath: string,
	openFilePaths: string[],
	ig: ReturnType<typeof ignore>,
	depthLimit: number,
	currentDepth: number = 0
): TreeNode | null {
	if (currentDepth > depthLimit && depthLimit !== Infinity) {
		return null;
	}

	const stats = fs.statSync(currentPath);
	const name = path.basename(currentPath);
	const relativePath = path.relative(
		vscode.workspace.workspaceFolders![0].uri.fsPath,
		currentPath
	);

	if (relativePath && ig.ignores(relativePath)) {
		return null;
	}

	if (stats.isFile()) {
		return { name, type: 'file' };
	}

	const children = fs
		.readdirSync(currentPath)
		.map((child) => {
			const childPath = path.join(currentPath, child);
			return buildTree(
				childPath,
				openFilePaths,
				ig,
				depthLimit,
				currentDepth + 1
			);
		})
		.filter((child): child is TreeNode => child !== null);

	return { name, type: 'directory', children };
}

export function formatTreeToAscii(
	node: TreeNode,
	prefix: string = '',
	isLast: boolean = true,
	isRoot: boolean = true
): string {
	if (!node) {
		return '';
	}

	let result = isRoot
		? `${node.name}\n`
		: `${prefix}${isLast ? '└── ' : '├── '}${node.name}\n`;

	if (node.type === 'directory' && node.children) {
		const childrenCount = node.children.length;
		node.children.forEach((child: TreeNode, index: number) => {
			const isLastChild = index === childrenCount - 1;
			const newPrefix = prefix + (isRoot ? '' : isLast ? '    ' : '│   ');
			result += formatTreeToAscii(child, newPrefix, isLastChild, false);
		});
	}

	return result;
}
export function deactivate() { }
