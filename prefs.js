const { Gtk,  GObject} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init(){
}

function sanitizePortNumber(portNumber) {
	if (portNumber >= 1 && portNumber <= 65534) {
		// Valid port number, this can be more elaborate
		return portNumber;
	} else {
		// Invalid input; handle accordingly
		return null;
	}
}

function sanitizeHostname(hostname) {
	// Regular expression to match valid characters (alphanumeric, hyphen, and dot)
	const validHostnameRegex = /^[a-zA-Z0-9.-]+$/;
	// Check if the hostname matches the valid pattern
	if (validHostnameRegex.test(hostname)) {
		return hostname; // Valid hostname
	} else {
		return null; // Invalid hostname
	}
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
		let api = settings.get_boolean('use-api');
		const sipLabel = new Gtk.Label({label : '	Location of wsi: '});
		let entry = new Gtk.Entry({text: settings.get_string('whisper-path') || ''});
		entry.connect('changed', () => {
			settings.set_string('whisper-path', entry.get_text());
		});

		let hBox = new Gtk.Box();
		hBox.set_orientation(Gtk.Orientation.HORIZONTAL);
		hBox.append(sipLabel);
		hBox.append(entry);
		let clip = settings.get_boolean('use-clipboard');
		const primLabel = new Gtk.Label({label : "		 Paste with: "});
		const clipLabel = new Gtk.Label({label : clip ? " CTRL+V [SHIFT+Ins] " : "  Middle Mouse Button "});
		let switchClip = new Gtk.Switch();
		switchClip.set_active(clip); // Set the initial state
		switchClip.connect('notify::active', (switchClip) => {
			if (switchClip.get_active()) {
				clipLabel.set_text(' CTRL+V or SHIFT+Ins ');
				settings.set_boolean('use-clipboard', true);
			} else {
				clipLabel.set_text('  Middle Mouse Button ');
				settings.set_boolean('use-clipboard', false);
			}
		});

		hBox.append(primLabel);
		hBox.append(switchClip);
		hBox.append(clipLabel);
		this.append(hBox);
		let ipBox = new Gtk.Box();
		ipBox.set_orientation(Gtk.Orientation.HORIZONTAL);
		const ipLabel = new Gtk.Label({label : "	Use Server API? "});
		ipBox.append(ipLabel);
		let switchLabelIP = new Gtk.Label({ label: '  IP / Hostname: ' });
		let switchLabelPort = new Gtk.Label({ label: ' Port Number: ' });
		let switcher = new Gtk.Switch();
		switcher.set_active(settings.get_boolean('use-api')); // Set the initial state
		switcher.connect('notify::active', (switcher) => {
			if (switcher.get_active()) {
				switchLabelIP.show();
				ipEntry.show();
				switchLabelPort.show();
				portEntry.show();
				settings.set_boolean('use-api', true);
			} else {
				switchLabelIP.hide();
				ipEntry.hide();
				switchLabelPort.hide();
				portEntry.hide();
				settings.set_boolean('use-api', false);
				ipButton.hide();
			}
		});

		const ipButton = new Gtk.Button({ label:  'OK' });
		// IP address and port entry fields
		let ipEntry = new Gtk.Entry({text: settings.get_string('whisper-ip') || '127.0.0.1'});
		ipEntry.connect('changed', () => {
			ipButton.show();
		});
		let portEntry = new Gtk.Entry({text: settings.get_string('whisper-port') || '58080', max_length: 5, width_chars: 5});
		portEntry.connect('changed', () => {
			ipButton.show();
		});

		ipButton.connect('clicked', (ipButton) => {
			let sanitizedIP = sanitizeHostname(ipEntry.get_text());
			if (sanitizedIP) {
			settings.set_string('whisper-ip', sanitizedIP);
			switchLabelIP.set_label(' IP / Hostname: ');
			} else {
			// Show an error message to the user
				switchLabelIP.set_label(' Invalid host ');
				ipEntry.set_text('Enter valid IP / host');
			}
			let sanitizedPort = sanitizePortNumber(portEntry.get_text());
			if (sanitizedPort) {
				settings.set_string('whisper-port', sanitizedPort);
				switchLabelPort.set_label(' Port Number: ');
			} else {
			// Show an error message to the user
				switchLabelPort.set_label(' Port Invalid ');
				portEntry.set_text('');
			}
			ipButton.hide();
		});
		// Initially hide the IP address and port fields
		if (! api) {
			switchLabelIP.hide();
			ipEntry.hide();
			switchLabelPort.hide();
			portEntry.hide();
		}
		ipButton.hide();

		ipBox.append(switcher);
		ipBox.append(switchLabelIP);
		ipBox.append(ipEntry);
		ipBox.append(switchLabelPort);
		ipBox.append(portEntry);
		ipBox.append(ipButton);
		this.append(ipBox);

		const textL = new Gtk.Label();
		textL.set_markup("\n 	To use Blurt (<b>\u{0181}</b> in top bar), press <b>CTRL+ALT+a</b> and start talking when microphone icon appears in the top bar.\n \
	The shortcut invokes the <b>wsi</b> script which records speech and transcribes it to text as soon as silence is detected.\n \
	Alternatively, the speech recording can be stopped with a preset key combo (<b>CTRL+ALT+z</b> by default)\n \
	When the microphone icon disappears, transcribed text can be pasted anywhere with the method chosen above. \n\n \
	If using whisper.cpp server (localhost or LAN), transcription is faster at the cost of keeping the model loaded in RAM.\n \
	To use the <b>whost:wport</b> preset in <b>wsi</b> write anything starting with a hyphen '-' in the IP field above (port is ignored.)\n \
	Make sure that the <b>wsi</b> script is in the path specified above. It is relative to $HOME, e.g. <b>$HOME/.local/bin/wsi</b> \n \
	Edit the configuration section of the <b>wsi</b> script to point to the Whisper model of choice, set server <b>whost:wport</b> etc.\n \
	Check the gschema.xml file for customization of the keyboard shortcuts and adjust the key combinations as needed.\n \
	Then recompile the schema with the command '<b>glib-compile-schemas schemas/</b>' from the extension folder.\n\n \
	More details and instructions on <a href='https://github.com/QuantiusBenignus/blurt'>GitHub</a>\n \
	2024, \u{00A9}<a href='https://github.com/QuantiusBenignus'>Quantius Benignus</a>"  );
		this.append(textL);
	}
});
