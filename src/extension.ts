import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Starting DotCync...');

	const disposable = vscode.commands.registerCommand('dotsync.sync', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('Open project directory first');
			return;
		}

		const rootUri = workspaceFolders[0].uri;
		const envUri = vscode.Uri.joinPath(rootUri, '.env');
		const exampleUri = vscode.Uri.joinPath(rootUri, '.env.example');

		const envContent = await readFileContent(envUri);
		if (envContent === null) {
			vscode.window.showErrorMessage('No .env file found in root directory');
			return;
		}
		
		let exampleContent = await readFileContent(exampleUri);
		if (envContent === null) {
			vscode.window.showInformationMessage('No .env.example file found in root directory. The new one will be created');
			exampleContent = '';
		}

	});

	context.subscriptions.push(disposable);
}

async function readFileContent(fileUri: vscode.Uri): Promise<string | null> {
	try {
		const data = await vscode.workspace.fs.readFile(fileUri);
		return Buffer.from(data).toString('utf-8');
	} catch (error) {
		return null;
	}
}


export function deactivate() {}
