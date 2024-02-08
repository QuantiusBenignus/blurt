import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class BlurtExtension extends Extension {

enable() {     

    this._siButton = new St.Button(
    {
        style_class : "panel-button"
    });
    this._siLabel = new St.Label({
        text: '\u{0181}',
        style_class: 'si-label',
    });
    this._siButton.set_child(this._siLabel);
    this._siButton.connect('clicked', () => this.openPreferences());
	
    Main.panel._rightBox.insert_child_at_index(this._siButton, 1);
    this._settings = this.getSettings();
    let homeDir = GLib.getenv('HOME');
    let asr_path = this._settings.get_string('whisper-path');
    Main.wm.addKeybinding("speech-input", 
        this._settings,
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.NORMAL,
        async() => { try {
            this._siLabel.set_style_class_name('i-label');
            const proc = Gio.Subprocess.new([homeDir+"/"+asr_path],
                Gio.SubprocessFlags.NONE);
            const success = await proc.wait_check_async(null);
            this._siLabel.set_style_class_name(success ? 'si-label' : 'e-label');
            } catch (e) {
            logError(e);
            }
         }
    );
}

disable() {
    this._settings = null;
    Main.wm.removeKeybinding("speech-input");
    Main.panel._rightBox.remove_child(this._siButton);
    this._siLabel = null;
    this._siButton = null;
}

}
