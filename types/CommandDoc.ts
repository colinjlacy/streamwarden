export type CommandDoc = {
	u: string;
	v: string;
	t: "scan" | "deliver";
	j: string;
	m?: "email";
	d?: string;
	f: boolean;
}