const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Eu = imports.misc.extensionUtils;
const Ce = Eu.getCurrentExtension();

let siButton, siLabel;

function getSettings() {
	let GS = Gio.SettingsSchemaSource;
	let schemaSrc = GS.new_from_directory(
	Ce.dir.get_child("schemas").get_path(),
	GS.get_default(),
	false);
	let schObj = schemaSrc.lookup('org.gnome.shell.extensions.blurt',true);
	if(!schObj) {throw new Error('Cannot locate schema!');}
	return new Gio.Settings({settings_schema : schObj});
	}

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
		let settings = getSettings();
		let homeDir = GLib.getenv('HOME');
		let asr_path = settings.get_string('whisper-path');
        Main.wm.addKeybinding("speech-input", 
        settings,
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.NORMAL,
        () => {GLib.spawn_command_line_async(homeDir+"/"+asr_path);}
    );

}

function disable() {
    // Remove the keybinding when the extension is disabled
  Main.wm.removeKeybinding("speech-input");
  Main.panel._rightBox.remove_child(siButton);
}

