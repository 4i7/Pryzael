import { validateLab } from "./r4_lab.mjs";

const report = validateLab();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
