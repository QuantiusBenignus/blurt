import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function sanitizePortNumber(portString) {
    const portNumber = parseInt(portString, 10);
    if (!isNaN(portNumber) && portNumber >= 1 && portNumber <= 65535) {
        return portNumber.toString();
    }
    return null; // Indicate invalid
}

function sanitizeHostname(hostname) {
    if (!hostname) return null;
    // Allow IP addresses (basic check) and hostnames
    const validIpAddressRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const validHostnameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (validIpAddressRegex.test(hostname) || validHostnameRegex.test(hostname)) {
         // Further IP validation could be added (e.g., check octet ranges, restrict to local etc.)
        return hostname;
    }
    return null;
}

export default class BlurtPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
             title: _("Blurt Configuration"),
             description: _("Configure the 'wsi' script path and connection settings.")
        });
        page.add(group);

        const settings = this.getSettings();

        const pathRow = new Adw.EntryRow({
            title: _("Path to 'wsi' Directory"),
            // Do not show full path for security/privacy, only relative to HOME
        });
        // Bind setting 'whisper-path' to the row's text property
        settings.bind('whisper-path', pathRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(pathRow);

        const clipboardRow = new Adw.SwitchRow({
             title: _("Paste using Clipboard (Ctrl+V)"),
             subtitle: _("If off, uses Primary Selection (Middle Mouse Button)")
        });
        settings.bind('use-clipboard', clipboardRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(clipboardRow);

        const apiGroup = new Adw.PreferencesGroup({
             title: _("Server API Settings"),
             description: _("Use a whisper.cpp server for transcription.")
        });
        page.add(apiGroup);

        const useApiRow = new Adw.SwitchRow({
            title: _("Use Server API")
        });
        settings.bind('use-api', useApiRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        apiGroup.add(useApiRow);

        const ipRow = new Adw.EntryRow({
            title: _("Server IP / Hostname"),
        });
        settings.bind('whisper-ip', ipRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        apiGroup.add(ipRow);

        const portRow = new Adw.EntryRow({
            title: _("Server Port")
        });
        // Use Gtk.InputPurpose.NUMBER for numeric keyboard if available
        portRow.get_delegate()?.set_input_purpose(Gtk.InputPurpose.NUMBER);
        settings.bind('whisper-port', portRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        apiGroup.add(portRow);

        useApiRow.bind_property('active', ipRow, 'sensitive', GObject.BindingFlags.DEFAULT);
        useApiRow.bind_property('active', portRow, 'sensitive', GObject.BindingFlags.DEFAULT);

        const infoGroup = new Adw.PreferencesGroup({
             title: _("Usage Information")
        });
        page.add(infoGroup);

        // For simplicity, adding a basic label here. Might need wrapping.
        const infoLabel = new Gtk.Label({
            label: _(
                "Press CTRL+ALT+a (default) to start recording. Icon \u{1E04} changes style.\n" +
                "Talk, then pause or press CTRL+ALT+z (default shortcut) to stop.\n" +
                "Speech input can also be toggled START/STOP by left-clicking the Icon.\n\n" +
                "Change keyboard shortcuts via the extension's gschema.xml file.\n" +
                "Ensure 'wsi' script is executable and in the specified path relative to $HOME.\n" +
                "Edit 'wsi' script itself for model selection and server presets.\n\n" +
                "More details: github.com/QuantiusBenignus/blurt"
            ),
            wrap: true, // Enable wrapping
            xalign: 0, // Align text to the left
            css_classes: ['dim-label'] // Use standard Adwaita dim-label style
        });

        const infoRow = new Adw.ActionRow();
        infoRow.add_suffix(infoLabel); // Add label to the row
        infoGroup.add(infoRow);

        window.add(page);
    }
}
