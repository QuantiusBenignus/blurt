import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

const SPEECH_INPUT_KEYBINDING = 'speech-input';
const STOP_RECORDING_KEYBINDING = 'stop-recording';

const STYLE_NORMAL = 'si-label';
const STYLE_RECORDING = 'i-label';
const STYLE_ERROR = 'e-label';

export default class BlurtExtension extends Extension {
    _indicator = null;
    _iconLabel = null;
    _settings = null;
    _settingsChangedId = null;
    _args = [];
    _api = false;
    _asrPath = '';
    _useClipboard = false;
    _notificationSource = null;
    _buttonPressId = null;
    _buttonReleaseId = null;
    _isRecording = false;

    _notify(title, body) { 
        const systemSource = MessageTray.getSystemSource();
        if (systemSource) {
            const notification = new MessageTray.Notification({
                source: systemSource,
                title: title,
                body: body,
                gicon: Gio.Icon.new_for_string('audio-input-microphone-symbolic'),
                'is-transient': true
            });
            systemSource.addNotification(notification);
        } else {
             log(`Blurt: Could not get systemSource to display notification: ${msg}`);
        }
    }

    _reloadSettings() {
        const homeDir = GLib.get_home_dir();
        this._args = [];
        this._api = this._settings.get_boolean('use-api');
        const whisperPath = this._settings.get_string('whisper-path');
        this._useClipboard = this._settings.get_boolean('use-clipboard');

        if (!whisperPath || !homeDir) {
             logError(new Error("Whisper path or home directory not found."), `${this.metadata.name}: Cannot build command.`);
             this._notify(_("Blurt Error"), _("Whisper path or home directory not found. Check preferences."));
             this._args = [];
             this._updateIndicatorStyle(STYLE_ERROR);
             this._isRecording = false; // Ensure state reset on error
             return;
        }

        this._asrPath = GLib.build_filenamev([homeDir, whisperPath]);
        this._asrPath += (this._asrPath.endsWith('/') ? '' : '/') + 'wsi';

        const file = Gio.File.new_for_path(this._asrPath);
        if (!file.query_exists(null) || !file.query_info('access::can-execute', Gio.FileQueryInfoFlags.NONE, null)?.get_attribute_boolean('access::can-execute')) {
             logError(new Error(`wsi script not found or not executable at: ${this._asrPath}`), this.metadata.name);
             this._args = [];
             this._updateIndicatorStyle(STYLE_ERROR);
             this._notify(_("Blurt Error"), _("wsi script not found or not executable in configured path. Check preferences."));
             this._isRecording = false; // Ensure state reset on error
             return;
        }

        this._args.push(this._asrPath);
        if (this._useClipboard) {
            this._args.push('-c');
        }
        if (this._api) {
            const host = this._settings.get_string('whisper-ip');
             if (host.startsWith('-')) {
                this._args.push('-n'); // Preset flag -n
             } else {
                 const port = this._settings.get_string('whisper-port');
                 if (host && port) {
                     this._args.push(`${host}:${port}`);
                 } else {
                    logError(new Error(`Invalid host/port for API mode: host=${host}, port=${port}`), this.metadata.name);
                     this._notify(_("Blurt Error"), _("Invalid Host or Port configured for whisper.cpp server"));
                     this._updateIndicatorStyle(STYLE_ERROR);
                     this._args = [];
                     this._isRecording = false; // Ensure state reset on error
                     return;
                 }
             }
        }
         //log(`${this.metadata.name}: Reloaded settings. Command args: ${this._args.join(' ')}`);
         if(this._iconLabel?.get_style_class_name() === STYLE_ERROR) {
             this._updateIndicatorStyle(STYLE_NORMAL);
         }
         this._isRecording = false;
         this._updateIndicatorStyle(STYLE_NORMAL);
    }

    _updateIndicatorStyle(styleClassName) {
        if (this._iconLabel) {
            this._iconLabel.set_style_class_name(styleClassName);
        }
    }

    _onSpeechInput() {
        if (this._isRecording) {
        //    log(`${this.metadata.name}: Already recording (state flag is true), ignoring speech input request.`);
            return;
        }
        if (!this._args || this._args.length === 0) {
            log(`${this.metadata.name}: Cannot run speech input, arguments invalid or empty.`);
            this._notify(_("Blurt Error"), _("Configuration incomplete or invalid. Check preferences."));
            this._updateIndicatorStyle(STYLE_ERROR);
            this._isRecording = false; // Ensure state reset
            return;
        }

        //log(`${this.metadata.name}: Running speech input: ${this._args.join(' ')}`);
        // Set state *before* starting, update style immediately for feedback
        this._isRecording=true;
        this._updateIndicatorStyle(STYLE_RECORDING);

        try {
            const proc = Gio.Subprocess.new(
                this._args,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (source, res) => {
                let stdout, stderr;
                let success = false;
                try {
                    [success, stdout, stderr] = source.communicate_utf8_finish(res);

                    if (success) {
                        //log(`${this.metadata.name}: wsi script finished successfully.`);
                        // Style updated below in finally
                    } else {
                        const wasInterrupted = stderr?.includes('Interrupted') || stderr?.includes('Signal 2');
                        if (wasInterrupted) {
                            //log(`${this.metadata.name}: wsi script stopped via signal as expected.`);
                            // Style updated below in finally
                        } else {
                             logError(new Error(stderr || "wsi script failed with non-zero exit code."), this.metadata.name);
                             this._notify(
                                 _('Blurt Error!'),
                                 stderr || (this._api ? _("Is server up and are IP:Port values correct?") : _("Unknown error executing wsi script."))
                             );
                             this._updateIndicatorStyle(STYLE_ERROR); // Show error immediately
                        }
                    }
                } catch (e) {
                     if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                        logError(e, `${this.metadata.name}: Error processing wsi script result`);
                        this._notify(_('Blurt Error!'), _('Failed to process script result: ') + e.message);
                        this._updateIndicatorStyle(STYLE_ERROR); // Show error immediately
                     } else {
                         log(`${this.metadata.name}: wsi process likely cancelled/interrupted.`);
                         // Style updated below in finally
                     }
                } finally {
                     //log(`${this.metadata.name}: Process finished. Setting _isRecording = false.`);
                     this._isRecording = false;
                     // Only reset style if it wasn't already set to ERROR
                     if (this._iconLabel?.get_style_class_name() !== STYLE_ERROR) {
                         this._updateIndicatorStyle(STYLE_NORMAL);
                     }
                }
            });
        } catch (e) {
            //logError(e, `${this.metadata.name}: Error starting wsi script`);
            this._notify(_('Blurt Error!'), _('Failed to start wsi script: ') + e.message);
            this._updateIndicatorStyle(STYLE_ERROR);
            this._isRecording = false; // Ensure state reset on start failure
        }
    }

    _onStopRecording() {
         // Check state flag - though the caller should already know
         if (!this._isRecording) {
             //log(`${this.metadata.name}: Not recording (state flag is false), ignoring stop request.`);
             // Make sure style is consistent if somehow out of sync
             if (this._iconLabel?.get_style_class_name() === STYLE_RECORDING) {
                 this._updateIndicatorStyle(STYLE_NORMAL);
             }
             return;
         }
         // Note: State (_isRecording = false) is set by the caller (_onLeftButtonPressToggle or keybinding handler)

        //log(`${this.metadata.name}: Attempting to stop recording (sending SIGINT to rec)`);
        try {
            const command = ["pkill", "-SIGINT", "rec"];
            const proc = Gio.Subprocess.new(command, Gio.SubprocessFlags.NONE);
/*
            proc.wait_check_async(null, (source, res) => {
                try {
                    source.wait_check_finish(res);
                    log(`${this.metadata.name}: pkill command finished successfully.`);
                    // Style and state reset are handled by the _onSpeechInput callback when wsi terminates.
                } catch (e) {
                    if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.FAILED_HANDLED) || e.message.includes("No such process")) {
                       log(`${this.metadata.name}: pkill found no 'rec' process to signal (might have already stopped).`);
                    } else {
                       logError(e, `${this.metadata.name}: pkill command failed unexpectedly`);
                       this._notify(_("Blurt Info"), _("Could not stop recording process (it might have finished already)."));
                    }
                    // If pkill fails, we rely on the _onSpeechInput callback detecting termination.
                }
            });
*/
        } catch (e) {
            //logError(e, `${this.metadata.name}: Failed to create subprocess`);
            // Reset the state flag. The wsi process might still be running...
            this._isRecording = false;
            this._updateIndicatorStyle(STYLE_NORMAL);
            this._notify(_("Blurt Error"), _("Failed to send stop signal to recording process."));
        }
    }

    _onLeftButtonPressToggle(actor, event) {
        if (event.get_button() === 1) { // MB1
            if (!this._isRecording) {
                 //log(`${this.metadata.name}: Left-click detected, starting recording.`);
                 //this._isRecording = true; // Check in _onSpeechInput
                 this._onSpeechInput();
            } else {
                 //log(`${this.metadata.name}: Left-click detected, stopping recording.`);
                 this._onStopRecording();
                 //this._isRecording = false; // Check in _onStopRecording
            }
            return Clutter.EVENT_STOP; // Prevent default actions
        }
        return Clutter.EVENT_PROPAGATE; // Allow others (right-click for Prefs)
    }

    // Handles right-click release only
    _onRightButtonReleasePreferences(actor, event) {
        if (event.get_button() === 3) { // Right mouse button
            this.openPreferences();
            return Clutter.EVENT_STOP; // Prevent default actions (like context menu)
        }
        return Clutter.EVENT_PROPAGATE;
    }

     // We need separate handlers for keybindings to manage the _isRecording state
     _onSpeechInputKeybinding() {
         if (!this._isRecording) {
             //log(`${this.metadata.name}: Start keybinding detected, starting recording.`);
             this._onSpeechInput();
         } else {
             log(`${this.metadata.name}: Start keybinding detected, but already recording. Ignoring.`);
         }
     }

     _onStopRecordingKeybinding() {
         if (this._isRecording) {
             //log(`${this.metadata.name}: Stop keybinding detected, stopping recording.`);
             this._onStopRecording();
             //this._isRecording = false;
         } else {
             log(`${this.metadata.name}: Stop keybinding detected, but not recording. Ignoring.`);
         }
     }

    enable() {
        log(`Enabling ${this.metadata.name}`);
        this._settings = this.getSettings();
        this._isRecording = false; // Ensure initial state

        this._indicator = new PanelMenu.Button(0, `${this.metadata.name} Indicator`, false);
        this._iconLabel = new St.Label({
            text: '\u{1E04}',
            style_class: STYLE_NORMAL,
            //reactive: true
        });
        this._indicator.add_child(this._iconLabel);

        this._buttonPressId = this._indicator.connect('button-press-event', this._onLeftButtonPressToggle.bind(this));
        this._buttonReleaseId = this._indicator.connect('button-release-event', this._onRightButtonReleasePreferences.bind(this));

        this._reloadSettings(); // Load initial settings

        this._settingsChangedId = this._settings.connect('changed', this._reloadSettings.bind(this));

        // Add Keybindings
        Main.wm.addKeybinding(
            SPEECH_INPUT_KEYBINDING,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this._onSpeechInputKeybinding.bind(this)
        );

        Main.wm.addKeybinding(
            STOP_RECORDING_KEYBINDING,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            this._onStopRecordingKeybinding.bind(this)
        );

        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');
    }

    disable() {
        log(`Disabling ${this.metadata.name}`);

        if (this._isRecording) {
            //log(`${this.metadata.name}: Disabling while recording, attempting to stop.`);
             this._onStopRecording();
        }

        Main.wm.removeKeybinding(SPEECH_INPUT_KEYBINDING);
        Main.wm.removeKeybinding(STOP_RECORDING_KEYBINDING);

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._indicator) {
            if (this._buttonPressId) {
                this._indicator.disconnect(this._buttonPressId);
                this._buttonPressId = null;
            }
            if (this._buttonReleaseId) {
                this._indicator.disconnect(this._buttonReleaseId);
                this._buttonReleaseId = null;
            }
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._notificationSource) {
            this._notificationSource.destroy();
            this._notificationSource = null;
        }

        this._iconLabel = null;
        this._settings = null;
        this._args = [];
        this._isRecording = false;

        log(`${this.metadata.name} disabled.`);
    }
}
