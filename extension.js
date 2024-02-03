const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Eu = imports.misc.extensionUtils;
const Ce = Eu.getCurrentExtension();

let siButton, siLabel;

function enable() {     
		
	siButton = new St.Button(
	{
		style_class : "panel-button"
	});
	siLabel = new St.Label({
		text: '\u{0181}',
		style_class: 'si-label',
	});
    siButton.set_child(siLabel);
	siButton.connect('button-release-event', function() {
		Eu.openPrefs();
    });
		
	Main.panel._rightBox.insert_child_at_index(siButton, 1);
	let settings = Eu.getSettings();
	let homeDir = GLib.getenv('HOME');
	let asr_path = settings.get_string('whisper-path');
    Main.wm.addKeybinding("speech-input", 
		settings,
		Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
		Shell.ActionMode.NORMAL,
		async() => { try {
			siLabel.set_style_class_name('i-label');
			const proc = Gio.Subprocess.new([homeDir+"/"+asr_path],
				Gio.SubprocessFlags.NONE);
			const success = await proc.wait_check_async(null);
			//console.log(`Speech recognizer ${success ? 'succeeded' : 'failed'}`);
			siLabel.set_style_class_name(success ? 'si-label' : 'e-label');
			} catch (e) {
			logError(e);
			}
		}
	);
}

function disable() {
    // Remove the keybinding when the extension is disabled
	Main.wm.removeKeybinding("speech-input");
	Main.panel._rightBox.remove_child(siButton);
	siLabel = null;
	siButton = null;
}

