import { ProgressLocation, window } from "vscode";
import { initializingFlutterMessage, noAction, showLogAction, yesAction } from "../../shared/constants";
import { LogCategory } from "../../shared/enums";
import { Logger } from "../../shared/interfaces";
import { logProcess } from "../../shared/logging";
import * as channels from "../commands/channels";
import { ringLog } from "../extension";
import { openLogContents } from "../utils";
import { safeToolSpawn } from "../utils/processes";

export async function initializeFlutterSdk(logger: Logger, flutterScript: string, promptText?: string): Promise<void> {
	const selectedItem = promptText ? await window.showInformationMessage(promptText, yesAction, noAction) : yesAction;
	if (selectedItem === yesAction) {
		logger.info(`Flutter is not initialized, running 'flutter config --machine'...`);
		try {
			await window.withProgress(
				{
					location: ProgressLocation.Notification,
					title: initializingFlutterMessage,
				},
				async (progress, cancellationToken) => {
					const proc = safeToolSpawn(undefined, flutterScript, ["doctor", "-v"]);

					// Show the output in an output channel so if it gets stuck the user can see it.
					const channel = channels.getOutputChannel(`flutter doctor`, true);
					channel.show();
					channels.runProcessInOutputChannel(proc, channel);

					cancellationToken.onCancellationRequested((e) => {
						logger.info(`User canceled!`);
						proc.kill();
					});
					// Log this to general as it's startup stuff that can't be captured with
					// Capture Logs so log it to the main log file.
					logProcess(logger, LogCategory.General, proc);
					return new Promise<void>((resolve, reject) => proc.on("exit", (code) => {
						if (code) {
							const ringLogContents = ringLog.toString();
							logger.error(`Failed to initialize Flutter: Process exited with code ${code}.`);
							window.showErrorMessage(`Failed to initialize Flutter: Process exited with code ${code}.`, showLogAction).then((chosenAction) => {
								if (chosenAction === showLogAction)
									openLogContents(undefined, ringLogContents);
							});
							reject();
						} else {
							channel.hide();
							resolve();
						}
					}));
				},
			);
			logger.info(`Flutter initialized!`);
		} catch (e) {
			logger.warn(`Flutter initialization failed, proceeding without!`);
		}
	} else {
		logger.info(`User cancelled Flutter initialization`);
	}
}
