import Adw from 'gi://Adw';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class BlurtPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // A simple info page
        const page = new Adw.PreferencesPage({
            title: _('Blurt'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('<b>\u{0181}lurt</b>'),
            description: _('<b> a GNOME shell extension to input text from speech into any window.</b>'),
        });
        page.add(group);

        // Create a new preferences row
        const row = new Adw.ExpanderRow({
            title:_("Basic Instructions for Use"),
            subtitle:_("\n 	To use Blurt (<b>\u{0181}</b> in top bar), press <b>CTRL+ALT+z</b> and start talking as soon as the microphone icon appears in the top bar.\n \
        The shortcut invokes the <b>wsi</b> script which records an audio clip and transcribes it to text when silence is detected.\n \
        When the microphone icon disappears (and <b>\u{0181}</b> turns white again), the transcribed text can be pasted via the middle mouse button.\n \
        * Make sure that the wsi script is in <b>$HOME/.local/bin/</b> and edit its CONFIG_BLOCK before use (to set whisper models etc.)\n \
        * Check the gschema.xml file for the invocation keyboard shortcut and modify the key combination if needed.\n \
        * Note that depending on noise environment, the silence threshold may need to be adjusted in the '<b>sox</b>' call in <b>wsi</b>.\n\n \
        More details and instructions on <a href='https://github.com/QuantiusBenignus/blurt'>GitHub</a>\n \
        2024, \u{00A9}<a href='https://github.com/QuantiusBenignus'>Quantius Benignus</a>"  ),
           subtitle_lines: 0
        });
        group.add(row);
    }   
}
