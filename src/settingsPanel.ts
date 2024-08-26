import * as vscode from 'vscode'

export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined

    private readonly _panel: vscode.WebviewPanel
    private readonly _extensionUri: vscode.Uri
    private _disposables: vscode.Disposable[] = []

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined

        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel._panel.reveal(column)
            return
        }

        const panel = vscode.window.createWebviewPanel(
            'promptPerfectSettings',
            'Prompt Perfect Settings',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        )

        SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri)
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel
        this._extensionUri = extensionUri

        this._update()

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'saveSettings':
                        this._saveSettings(message.settings)
                        return
                }
            },
            null,
            this._disposables
        )
    }

    private _update() {
        const webview = this._panel.webview
        this._panel.title = 'Prompt Perfect Settings'
        this._panel.webview.html = this._getHtmlForWebview(webview)
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const config = vscode.workspace.getConfiguration('promptPerfect')

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prompt Perfect Settings</title>
            </head>
            <body>
                <h1>Prompt Perfect Settings</h1>
                <form id="settingsForm">
                    <label>
                        <input type="checkbox" id="limitPromptLength" ${config.get('limitPromptLength') ? 'checked' : ''}>
                        Limit prompt length?
                    </label>
                    <br>
                    <label>
                        Max tokens:
                        <input type="number" id="maxTokens" value="${config.get('maxTokens')}" ${config.get('limitPromptLength') ? '' : 'disabled'}>
                    </label>
                    <br>
                    <label>
                        <input type="checkbox" id="autoCopyToClipboard" ${config.get('autoCopyToClipboard') ? 'checked' : ''}>
                        Auto copy Output to clipboard
                    </label>
                    <br>
                    <label>
                        Tree depth limit:
                        <input type="number" id="treeDepthLimit" value="${config.get('treeDepthLimit')}">
                    </label>
                    <br>
                    <label>
                        Additional instructions:
                        <textarea id="additionalInstructions">${config.get('additionalInstructions')}</textarea>
                    </label>
                    <br>
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
                            command: 'saveSettings',
                            settings: {
                                limitPromptLength: limitPromptLength.checked,
                                maxTokens: parseInt(maxTokens.value),
                                autoCopyToClipboard: document.getElementById('autoCopyToClipboard').checked,
                                treeDepthLimit: parseInt(document.getElementById('treeDepthLimit').value),
                                additionalInstructions: document.getElementById('additionalInstructions').value
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `
    }

    private _saveSettings(settings: any) {
        const config = vscode.workspace.getConfiguration('promptPerfect')
        config.update('limitPromptLength', settings.limitPromptLength, vscode.ConfigurationTarget.Global)
        config.update('maxTokens', settings.maxTokens, vscode.ConfigurationTarget.Global)
        config.update('autoCopyToClipboard', settings.autoCopyToClipboard, vscode.ConfigurationTarget.Global)
        config.update('treeDepthLimit', settings.treeDepthLimit, vscode.ConfigurationTarget.Global)
        config.update('additionalInstructions', settings.additionalInstructions, vscode.ConfigurationTarget.Global)
        vscode.window.showInformationMessage('Prompt Perfect settings saved!')
    }

    public dispose() {
        SettingsPanel.currentPanel = undefined

        this._panel.dispose()

        while (this._disposables.length) {
            const x = this._disposables.pop()
            if (x) {
                x.dispose()
            }
        }
    }
}