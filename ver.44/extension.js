const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Eu = imports.misc.extensionUtils;


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

	let homeDir = GLib.getenv('HOME');
	let api = false;
	let asr_path = '';
	let args = [];
	Main.panel._rightBox.insert_child_at_index(siButton, 1);
	let settings = Eu.getSettings();
	settings.connect('changed', () => {
		args = [];
		api = settings.get_boolean('use-api');
		asr_path = homeDir+"/"+settings.get_string('whisper-path');
		asr_path = asr_path + (asr_path.charAt(asr_path.length - 1) != '/' ? '/' : '') + 'wsi';
		args.push(asr_path);
		if (settings.get_boolean('use-clipboard')) {args.push('-c');}
		if (api) {
			let host = settings.get_string('whisper-ip');
			if ( host.startsWith('-')) {
				args.push('-n');
			} else {
				args.push(host+":"+settings.get_string('whisper-port'));
			}
		}
	});

	api = settings.get_boolean('use-api');
	asr_path = homeDir+"/"+settings.get_string('whisper-path');
	asr_path = asr_path + (asr_path.charAt(asr_path.length - 1) != '/' ? '/' : '') + 'wsi';
	args.push(asr_path);
	if (settings.get_boolean('use-clipboard')) {args.push('-c');}
	if (api) {
		let host = settings.get_string('whisper-ip');
		if ( host.startsWith('-')) {
			args.push('-n');
		} else {
			args.push(host+":"+settings.get_string('whisper-port'));
		}
	}

	Main.wm.addKeybinding("speech-input", 
		settings,
		Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
		Shell.ActionMode.NORMAL,
		async () => { try {
			siLabel.set_style_class_name('i-label');
			const proc = Gio.Subprocess.new( args, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
			// Wait asynchronously for the process to finish
			proc.communicate_utf8_async(null, null, (proc, res) => {
				try {
					const [stdout, stderr] = proc.communicate_utf8_finish(res);
					if (proc.get_successful()) {
						// Process executed successfully
						siLabel.set_style_class_name('si-label');
					} else {
						siLabel.set_style_class_name('e-label');
						Main.notify('Error!',stderr || (api ? "Is server up and are IP:Port values correct?" : "Unknown error!"),{transient: true, timeout: 5000,});
					}
				} catch (e) {
					logError(e);
				}
			});
			} catch (e) {
			logError(e);
			}
		}
	);

	Main.wm.addKeybinding("stop-recording", 
		settings,
		Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
		Shell.ActionMode.NORMAL,
		async() => { try {
			const proc = Gio.Subprocess.new(["pkill", "--signal", "2", "rec"],
				Gio.SubprocessFlags.NONE);
			const success = proc.wait_check_async(null);
			} catch (e) {
			logError(e);
			}
		}
	);
}

function disable() {
    // Remove the keybinding when the extension is disabled
	Main.wm.removeKeybinding("speech-input");
	Main.wm.removeKeybinding("stop-recording");
	Main.panel._rightBox.remove_child(siButton);
	siLabel = null;
	siButton = null;
}

