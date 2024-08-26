import * as vscode from 'vscode';

export class SettingsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'promptperfect-settings';

	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((data) => {
			switch (data.type) {
				case 'saveSettings':
					this._saveSettings(data.value);
					break;
			}
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const config = vscode.workspace.getConfiguration('promptPerfect');

		return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Prompt Perfect Settings</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    padding: 10px;
                }
                input[type="checkbox"] {
                    margin-right: 5px;
                }
                input[type="number"], textarea {
                    width: 100%;
                    margin-top: 5px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                }
                button {
                    margin-top: 10px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                label {
                    display: block;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <h2>Prompt Perfect Settings</h2>
            <form id="settingsForm">
                <label>
                    <input type="checkbox" id="limitPromptLength" ${
						config.get('limitPromptLength') ? 'checked' : ''
					}>
                    Limit prompt length?
                </label>
                <label>
                    Max tokens:
                    <input type="number" id="maxTokens" value="${config.get(
						'maxTokens'
					)}" ${config.get('limitPromptLength') ? '' : 'disabled'}>
                </label>
                <label>
                    <input type="checkbox" id="autoCopyToClipboard" ${
						config.get('autoCopyToClipboard') ? 'checked' : ''
					}>
                    Auto copy Output to clipboard
                </label>
                <label>
                    Tree depth limit:
                    <input type="number" id="treeDepthLimit" value="${config.get(
						'treeDepthLimit'
					)}">
                </label>
                <label>
                    Additional instructions:
                    <textarea id="additionalInstructions" rows="4">${config.get(
						'additionalInstructions'
					)}</textarea>
                </label>
                <button type="submit">Save Changes</button>
            </form>
            <script>
                const vscode = acquireVsCodeApi();
                const form = document.getElementById('settingsForm');
                const limitPromptLength = document.getElementById('limitPromptLength');
                const maxTokens = document.getElementById('maxTokens');

                limitPromptLength.addEventListener('change', (e) => {
                    maxTokens.disabled = !e.target.checked;
                });

                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    vscode.postMessage({
                        type: 'saveSettings',
                        value: {
                            limitPromptLength: limitPromptLength.checked,
                            maxTokens: parseInt(maxTokens.value),
                            autoCopyToClipboard: document.getElementById('autoCopyToClipboard').checked,
                            treeDepthLimit: parseInt(document.getElementById('treeDepthLimit').value),
                            additionalInstructions: document.getElementById('additionalInstructions').value
                        }
                    });
                });
                
                // Adding this to dynamically adjust textarea height
                const textarea = document.getElementById('additionalInstructions');
                textarea.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
                // Trigger the event on load
                textarea.dispatchEvent(new Event('input'));
            </script>
        </body>
        </html>
    `;
	}

	private _saveSettings(settings: any) {
		const config = vscode.workspace.getConfiguration('promptPerfect');
		config.update(
			'limitPromptLength',
			settings.limitPromptLength,
			vscode.ConfigurationTarget.Global
		);
		config.update(
			'maxTokens',
			settings.maxTokens,
			vscode.ConfigurationTarget.Global
		);
		config.update(
			'autoCopyToClipboard',
			settings.autoCopyToClipboard,
			vscode.ConfigurationTarget.Global
		);
		config.update(
			'treeDepthLimit',
			settings.treeDepthLimit,
			vscode.ConfigurationTarget.Global
		);
		config.update(
			'additionalInstructions',
			settings.additionalInstructions,
			vscode.ConfigurationTarget.Global
		);
		vscode.window.showInformationMessage('Prompt Perfect settings saved!');
	}
}
