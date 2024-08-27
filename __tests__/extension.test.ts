import {
	generateTreeStructure,
	buildTree,
	formatTreeToAscii,
} from '../src/extension';
import * as vscode from 'vscode';
import ignore from 'ignore';
import * as path from 'path';
import * as fs from 'fs';

// Mock vscode
jest.mock(
	'vscode',
	() => ({
		workspace: {
			workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
		},
		window: {
			showWarningMessage: jest.fn(),
		},
	}),
	{ virtual: true }
);

// Mock fs
jest.mock('fs', () => ({
	statSync: jest.fn(),
	readdirSync: jest.fn(),
	existsSync: jest.fn(),
	readFileSync: jest.fn(),
}));

describe('Project Structure Generator', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('binary files are included in tree structure', () => {
		const fs = require('fs');
		fs.statSync.mockImplementation((path: string) => ({
			isFile: () => !path.endsWith('/mock/workspace'),
			isDirectory: () => path.endsWith('/mock/workspace'),
		}));
		fs.readdirSync.mockReturnValue(['text.txt', 'binary.bin']);

		const ig = ignore();
		const openDocuments = [
			{ uri: { fsPath: '/mock/workspace/text.txt' } },
			{ uri: { fsPath: '/mock/workspace/binary.bin' } },
		] as vscode.TextDocument[];

		const result = generateTreeStructure(
			'/mock/workspace',
			openDocuments,
			ig,
			1
		);

		expect(result).toContain('text.txt');
		expect(result).toContain('binary.bin');
	});

	test('negative numbers are not allowed for tree depth limit', () => {
		const fs = require('fs');
		fs.statSync.mockImplementation(() => ({
			isFile: () => false,
			isDirectory: () => true,
		}));
		fs.readdirSync.mockReturnValue([]);

		const ig = ignore();
		const openDocuments: vscode.TextDocument[] = [];

		const result = generateTreeStructure(
			'/mock/workspace',
			openDocuments,
			ig,
			-1
		);
		expect(result.trim()).toBe('workspace');
	});

	test('ignored files are not included in the output', () => {
		const fs = require('fs');
		fs.statSync.mockImplementation((path: string) => ({
			isFile: () => !path.endsWith('/mock/workspace'),
			isDirectory: () => path.endsWith('/mock/workspace'),
		}));
		fs.readdirSync.mockReturnValue(['included.txt', 'ignored.txt']);
		fs.existsSync.mockReturnValue(true);
		fs.readFileSync.mockReturnValue('ignored.txt');

		const ig = ignore().add('ignored.txt');
		const openDocuments: vscode.TextDocument[] = [];

		const result = generateTreeStructure(
			'/mock/workspace',
			openDocuments,
			ig,
			1
		);
		expect(result).toContain('included.txt');
		expect(result).not.toContain('ignored.txt');
	});

	test('ASCII tree is correctly generated', () => {
		const mockTree: any = {
			name: 'root',
			type: 'directory',
			children: [
				{ name: 'file1.txt', type: 'file' },
				{
					name: 'folder1',
					type: 'directory',
					children: [{ name: 'file2.txt', type: 'file' }],
				},
			],
		};

		const result = formatTreeToAscii(mockTree);
		expect(result).toBe(
			'root\n' +
				'├── file1.txt\n' +
				'└── folder1\n' +
				'    └── file2.txt\n'
		);
	});

	test('tree structure respects the configured depth limit', () => {
		const fs = require('fs');
		fs.statSync.mockImplementation(() => ({
			isFile: () => false,
			isDirectory: () => true,
		}));
		fs.readdirSync
			.mockReturnValueOnce(['folder1'])
			.mockReturnValueOnce(['folder2'])
			.mockReturnValueOnce(['file.txt']);

		const ig = ignore();
		const openDocuments: vscode.TextDocument[] = [];

		const result = generateTreeStructure(
			'/mock/workspace',
			openDocuments,
			ig,
			2
		);
		expect(result.trim()).toBe(
			'workspace\n' + '└── folder1\n' + '    └── folder2'
		);
	});

	test('tree structure respects the configured depth limit', () => {
		const fs = require('fs');
		fs.statSync.mockImplementation(() => ({
			isFile: () => false,
			isDirectory: () => true,
		}));
		fs.readdirSync
			.mockReturnValueOnce(['folder1'])
			.mockReturnValueOnce(['folder2'])
			.mockReturnValueOnce(['file.txt']);

		const ig = ignore();
		const openDocuments: vscode.TextDocument[] = [];

		const result = generateTreeStructure(
			'/mock/workspace',
			openDocuments,
			ig,
			2
		);

		expect(result.trim()).toBe(
			'workspace\n' + '└── folder1\n' + '    └── folder2'
		);
	});

	test('file paths are correctly generated relative to the workspace root', () => {
		const fs = require('fs');
		fs.statSync.mockImplementation((path: string) => ({
			isFile: () => path.includes('file'),
			isDirectory: () => !path.includes('file'),
		}));
		fs.readdirSync
			.mockReturnValueOnce(['folder', 'file.txt'])
			.mockReturnValueOnce([]);

		const ig = ignore();
		const openDocuments: vscode.TextDocument[] = [];

		const result = generateTreeStructure(
			'/mock/workspace',
			openDocuments,
			ig,
			2
		);
		expect(result.trim()).toBe(
			'workspace\n' + '├── folder\n' + '└── file.txt'
		);
	});
});
