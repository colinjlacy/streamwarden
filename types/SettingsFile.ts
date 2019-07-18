export class SettingsFile {
	
	userEmail: string;
	userPass: string;
	
	constructor(init: {[key: string]: any}) {
		for (let key in init) { this[key] = init[key]; }
	}
	
}