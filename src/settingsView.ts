import * as vscode from 'vscode';

export class SettingsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'promptperfect-settings';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public async resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        await this._updateWebview();

        webviewView.onDidChangeVisibility(async () => {
            if (webviewView.visible) {
                await this._updateWebview();
            }
        });

        webviewView.webview.onDidReceiveMessage((data) => {
            switch (data.type) {
                case 'saveSettings':
                    this._saveSettings(data.value);
                    break;
            }
        });
    }

    private async _updateWebview() {
        if (this._view) {
            const config = vscode.workspace.getConfiguration('promptPerfect');
            const currentSettings = {
                limitPromptLength: await config.get('limitPromptLength'),
                maxTokens: await config.get('maxTokens'),
                autoCopyToClipboard: await config.get('autoCopyToClipboard'),
                treeDepthLimit: await config.get('treeDepthLimit'),
                additionalInstructions: await config.get(
                    'additionalInstructions'
                ),
                prefix: await config.get('prefix'),
            };
            this._view.webview.html = this._getHtmlForWebview(
                this._view.webview,
                currentSettings
            );
        }
    }

    private _getHtmlForWebview(
        webview: vscode.Webview,
        settings: Record<string, unknown>
    ) {
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
                    <input type="checkbox" id="limitPromptLength" ${settings.limitPromptLength ? 'checked' : ''
            }>
                    Limit prompt length?
                </label>
                <label>
                    Max tokens:
                    <input type="number" id="maxTokens" value="${settings.maxTokens
            }" ${settings.limitPromptLength ? '' : 'disabled'}>
                </label>
                <label>
                    <input type="checkbox" id="autoCopyToClipboard" ${settings.autoCopyToClipboard ? 'checked' : ''
            }>
                    Auto copy Output to clipboard
                </label>
                <label>
                    Tree depth limit:
                    <input type="number" id="treeDepthLimit" value="${settings.treeDepthLimit
            }">
                </label>
                <label>
                    Additional instructions:
                    <textarea id="additionalInstructions" rows="4">${settings.additionalInstructions
            }</textarea>
                </label>
                <label>
                    Prefix:
                    <textarea id="prefix" rows="4">${settings.prefix
            }</textarea>
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
                            additionalInstructions: document.getElementById('additionalInstructions').value,
                            prefix: document.getElementById('prefix').value
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

                // Adding this to dynamically adjust textarea height for prefix
                const prefixTextarea = document.getElementById('prefix');
                prefixTextarea.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
                prefixTextarea.dispatchEvent(new Event('input'));
            </script>
        </body>
        </html>
    `;
    }

    private async _saveSettings(settings: Record<string, unknown>) {
        const config = vscode.workspace.getConfiguration('promptPerfect');
        await config.update(
            'limitPromptLength',
            settings.limitPromptLength,
            vscode.ConfigurationTarget.Global
        );
        await config.update(
            'maxTokens',
            settings.maxTokens,
            vscode.ConfigurationTarget.Global
        );
        await config.update(
            'autoCopyToClipboard',
            settings.autoCopyToClipboard,
            vscode.ConfigurationTarget.Global
        );
        await config.update(
            'treeDepthLimit',
            settings.treeDepthLimit,
            vscode.ConfigurationTarget.Global
        );
        await config.update(
            'additionalInstructions',
            settings.additionalInstructions,
            vscode.ConfigurationTarget.Global
        );
        await config.update(
            'prefix',
            settings.prefix,
            vscode.ConfigurationTarget.Global
        );

        vscode.window.showInformationMessage('Prompt Perfect settings saved!');

        // Update the webview to reflect the new settings
        await this._updateWebview();
    }
}
