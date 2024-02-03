const { Gtk,  GObject, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init(){
	}
	
function buildPrefsWidget() {
	let siwidget = new siPreferences();
	return siwidget;
	}

const siPreferences = new GObject.Class({

	Name : "Speech_Input_Preferences",
	GtypeName : "SpeechInputPreferences",
	Extends : Gtk.Box,
	_init : function (params) {
		this.parent(params);
		this.margin = 20;
		this.set_spacing(15);
		this.set_orientation(Gtk.Orientation.VERTICAL);
		const settings = ExtensionUtils.getSettings(); 
		const titLe = new Gtk.Label(); 
		titLe.set_markup("<span size='x-large'><b>\u{0181}lurt - a GNOME shell extension to input text from speech into any window.</b></span>");
		this.append(titLe);
		
		const sipLabel = new Gtk.Label({label : "\n	 Speech recognizer script location: "});
		let entry = new Gtk.Entry({text: settings.get_string('whisper-path') || ''});
        entry.connect('changed', () => {
			settings.set_string('whisper-path', entry.get_text());
		});
		
		let hBox = new Gtk.Box();
		hBox.set_orientation(Gtk.Orientation.HORIZONTAL);
		hBox.prepend(sipLabel);
		hBox.append(entry);
		this.append(hBox);
		
		const textL = new Gtk.Label();
		textL.set_markup("\n 	 To use Blurt (<b>\u{0181}</b> in top bar), press <b>CTRL+ALT+z</b> and start talking as soon as the microphone indicator appears in the top bar.\n \
        The shortcut invokes the <b>wsi</b> script which records an audio clip and transcribes it to text as soon as silence is detected. (about 2s)\n \
        When the microphone icon disappears (and <b>\u{0181}</b> turns white again), the transcribed text can be pasted via the middle mouse button.\n\n \
        * Make sure that the wsi script is in the path specified above. The path is relative to $HOME, e.g. <b>$HOME/.local/bin/wsi</b> \n\n \
        * Edit the configuration section of the <b>wsi</b> script to match your environment, point to the Whisper model of choice, etc.\n\n \
        * Check the gschema.xml file for the invocation keyboard shortcut and modify the key combination if needed.\n \
        The schema then has to be recompiled with '<b>glib-compile-schemas schemas/</b>' from the command line in the extension folder.\n\n \
        * Note that depending on noise environment, the silence threshold may need to be adjusted in the '<b>sox</b>' command.\n\n \
        More details and instructions on <a href='https://github.com/QuantiusBenignus/blurt'>GitHub</a>\n \
        2024, \u{00A9}<a href='https://github.com/QuantiusBenignus'>Quantius Benignus</a>"  );
		this.append(textL);
		}
});

