import {mkdirpSync} from "fs-extra";
import {SettingsFile} from "../types/SettingsFile";
import {existsSync, readFileSync, writeFileSync} from "fs";
import * as path from "path";
import * as os from "os";

const homeDir = os.homedir();
const settingsDirPath = path.join(homeDir, 'Documents', 'settings');
const settingsFilePath: string = path.join(settingsDirPath, 'settings.json');
const debug = require('debug')('streamwarden:server');

export function checkUserSettingsDirectory(): void {
	mkdirpSync(settingsDirPath);
}

export function writeCredentialsToSettings(settings: SettingsFile, email: string, pass: string): void {
	settings.userEmail = email;
	settings.userPass = pass;
	writeFileSync(path.join(settingsDirPath, 'settings.json'), JSON.stringify(settings, null, 4), {encoding: "utf8"});
}

export function fetchExistingSettings(): SettingsFile {
	let str: string;
	if(!existsSync(settingsFilePath)) return new SettingsFile({});
	try {
		str = readFileSync(settingsFilePath, {encoding: "utf8"});
	} catch (e) {
		debug(`problem reading existing settings document: ${e.toString()}`);
		return null;
	}
	try {
		const settings = JSON.parse(str);
		return new SettingsFile(settings);
	} catch (e) {
		debug(`problem parsing existing settings document: ${e.toString()}`);
		return null;
	}
}

export function fetchUserCredentials(): {email: string, password: string} {
	if(!existsSync(settingsFilePath)) return {email: null, password: null};
	const settings = fetchExistingSettings();
	return {email: settings.userEmail, password: settings.userPass}
}