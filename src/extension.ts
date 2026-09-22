import * as vscode from 'vscode';

/**
 * Точка входа в расширение. Вызывается при активации расширения.
 * Регистрирует команду синхронизации .env файлов.
 * 
 * @param {vscode.ExtensionContext} context Контекст расширения.
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Starting DotSync...');

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
		if (exampleContent === null) {
			vscode.window.showInformationMessage('No .env.example file found in root directory. The new one will be created');
			exampleContent = '';
		}
		
		const newExampleContent = generateNewExampleContent(envContent, exampleContent);

		if (newExampleContent === exampleContent) {
			vscode.window.showInformationMessage('Files are already synchronized');
			return;
		}

		try {
			await vscode.workspace.fs.writeFile(exampleUri, Buffer.from(newExampleContent));
			vscode.window.showInformationMessage('Successfully synchronized .env.example file');
		} catch (error) {
			vscode.window.showErrorMessage('Error saving .env.example file');
		}

	});

	context.subscriptions.push(disposable);
}

/**
 * Асинхронно читает содержимое файла по заданному URI.
 * 
 * @param {vscode.Uri} fileUri URI файла для чтения.
 * @returns {Promise<string | null>} Содержимое файла или null в случае ошибки чтения.
 */
async function readFileContent(fileUri: vscode.Uri): Promise<string | null> {
	try {
		const data = await vscode.workspace.fs.readFile(fileUri);
		return Buffer.from(data).toString('utf-8');
	} catch (error) {
		return null;
	}
}

/**
 * Читает старый файл .env.example и извлекает существующие ключи
 * вместе с их полными строками (для сохранения дефолтных значений).
 * 
 * @param {string} exampleContent Текущее содержимое .env.example.
 * @returns {Map<string, string>} Словарь (Ключ -> Полная строка с дефолтным значением).
 */
function getExistingExampleLines(exampleContent: string): Map<string, string> {
	const map = new Map<string, string>();
	const lines = exampleContent.split(/\r?\n/);

	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (trimmed.length > 0 && !trimmed.startsWith('#')) {
			const splitIndex = trimmed.indexOf('=');
			if (splitIndex > 0) {
				const key = trimmed.substring(0, splitIndex).trim();
				map.set(key, lines[i]);
			}
		}
	}
	
	return map;
}

/**
 * Генерирует содержимое для нового .env.example.
 * Построчно обходит .env, переносит пустые строки, разрешенные комментарии (#!)
 * и ключи. При наличии ключа в старом .env.example, берет строку оттуда.
 * 
 * @param {string} envContent Содержимое файла .env.
 * @param {string} exampleContent Текущее содержимое файла .env.example.
 * @returns {string} Новое содержимое для записи.
 */
function generateNewExampleContent(envContent: string, exampleContent: string): string {
	const existingExampleLines = getExistingExampleLines(exampleContent);
	const envLines = envContent.split(/\r?\n/);
	const newLines: string[] = [];

	for (let i = 0; i < envLines.length; i++) {
		const line = envLines[i];
		const trimmed = line.trim();

		if (trimmed.length === 0) {
			newLines.push('');
			continue;
		}

		if (trimmed.startsWith('#')) {
			if (trimmed.startsWith('#!')) {
				newLines.push(line);
			}
			continue;
		}

		const splitIndex = line.indexOf('=');
		if (splitIndex > 0) {
			const key = line.substring(0, splitIndex).trim();

			if (existingExampleLines.has(key)) {
				newLines.push(existingExampleLines.get(key)!);
			} else {
				newLines.push(`${key}=`);
			}
		}
	}
	return newLines.join('\n');
}

export function deactivate() {}
