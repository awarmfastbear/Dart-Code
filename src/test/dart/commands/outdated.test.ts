import * as assert from "assert";
import * as vs from "vscode";
import { activate, captureOutput, extApi, getPackages } from "../../helpers";

describe("pub outdated", () => {
	before("get packages", () => getPackages());
	beforeEach("activate", () => activate());

	beforeEach("skip if not supported", function () {
		if (!extApi.dartCapabilities.supportsPubOutdated)
			this.skip();
	});

	it("runs and prints output", async () => {
		const captureCommand = extApi.dartCapabilities.supportsDartPub ? "dart (hello_world)" : "pub (hello_world)";
		const commandToRun = extApi.dartCapabilities.supportsDartPub ? "dart pub outdated" : "pub outdated";

		const buffer = captureOutput(captureCommand);
		const exitCode = await vs.commands.executeCommand("pub.outdated");
		assert.equal(exitCode, 0);

		const output = buffer.join("").trim();
		assert.equal(output.startsWith(`--\n\n[hello_world] ${commandToRun}`), true);
		assert.equal(output.endsWith("exit code 0"), true);
	});
});
