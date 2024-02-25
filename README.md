
# <img src="resources/blurt.png" height="36px" width="36px"> Blurt - a Gnome shell extension for accurate speech-to-text input in Linux </img>
[<img src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" height="100" align="right">](https://extensions.gnome.org/extension/6742/blurt/)
**Blurt**  is a simple Gnome shell extension based on the command line utility [NoteWhispers](https://github.com/quantiusbenignus/NoteWhispers), which itself, is built around the great [whisper.cpp](https://github.com/ggerganov/whisper.cpp).
It is confirmed to work under version 43 of the GNOME shell (the current version on my Linux system).  


**UPDATE: GNOME SHELL version 45 is now supported (gshell_45 branch). Check it out from there or grab the zip archive from the main branch. It can also be installed directly from the [GNOME extensions website](https://extensions.gnome.org/extension/6742/blurt/), but in all cases, please, do not forget to get the *wsi* (or [netwsi](./NET_TRANSCRIBE.md)) script from this repository!** 

[**Now capable of transcribing over a network**](./NET_TRANSCRIBE.md) - speedier and recommended.

When the extension is installed and enabled (indicated with &#x0181; in the top bar), one can input text from speech into any window that has the keyboard focus (such as the text editor in the screencast below). This is done by pressing a key combination (<CTRL+ALT+z> is the default), triggering a speech recognizer process that records a speech clip from the microphone, transcribes it with whisper.cpp and sends the result to the PRIMARY selection/clipboard under X11 or Wayland.
When speech input is initiated, a microphone indicator icon appears in the top bar and is shown for the duration of the recording. The color of the Extension indicator &#x0181; becomes yellow while recording.
The disappearance of the microphone icon from the top bar indicates that the process is completed and the extension has "blurted" a snippet of text that can be pasted with the middle mouse button. (Note that on slower systems there may be a slight delay after the microphone icon disappears and before the text reaches the clipboard due to the time needed for transcription. On my computer it is less than 300 ms for an average paragraph of spoken text).

The convenience that this extension affords is demonstrated in this screencast (note the microphone icon at the top when recording):

[//]: # (https://github.com/QuantiusBenignus/blurt/assets/120202899/b05f0829-1f45-40ec-853c-4cadb43a403e)

<video width="424" height="240" src="https://github.com/QuantiusBenignus/blurt/assets/120202899/0b83afab-c537-404c-a085-96a7c1167961"></video>

### SYSTEM SETUP

#### PREREQUISITES:
- zsh or bash command line shell installation on a LInux system running GNOME.   
- working whisper.cpp installation (see https://github.com/ggerganov/whisper.cpp
- The orchestrator tool **wsi** (or **netwsi** - see [here](./NET_TRANSCRIBE.md) ) from this repository **must be placed in your $HOME/.local/bin/ folder**.  
- recent versions of 'sox', 'xsel' or 'wl-copy' (for Wayland)  command-line tools from your system's repositories.
-  A working microphone 
> *DISCLAIMER: Some of the proposed actions, if implemented, will alter how your system works internally (e.g. systemwide temporary file storage and memory management). The author neither takes credit nor assumes any responsibility for any outcome that may or may not result from interacting with the contents of this document. Suggestions in this section are based on the author's choice and opinion and may not fit the taste or the particular situation of everyone; please, adjust as you like.*

#### "INSTALLATION"
*(Assuming whisper.cpp is installed and the "main" executable compiled with 'make' in the cloned whisper.cpp repo. See Prerequisites section)*
* Place the script(s) **wsi**, **netwsi** in $HOME/.local/bin/  ( **It is advisable to run the script once from the command line to let it check for its dependencies** )
* Create a symbolic link (the code expects 'transcribe' in your $PATH) to the compiled "main" executable in the whisper.cpp directory. For example, create it in your `$HOME/.local/bin/` (part of your $PATH) with 
```
ln -s /full/path/to/whisper.cpp/main $HOME/.local/bin/transcribe
```
If transcribe is not in your $PATH, either edit the call to it in **wsi** to include the absolute path, or add its location to the $PATH variable. Otherwise the script and by extension, the extension:-) will fail.
* The extension can then be installed either from https://extensions.gnome.org/extension/6742/blurt/ with one-click install, or manually by clonning this repository (or just grabbing the zip archive).
If you are installing the Blurt GNOME extension manually, place the extracted folder `blurt@quantiousbenignus.local` into `$HOME/.local/share/gnome-shell/extensions` and enable it from your `Extensions` system app or from the command line with
```
gnome-extensions enable blurt@quantiusbenignus.local
```
 provided that it is detected by the system, which can be checked by inspecting the output of 
 ```
 gnome-extensions list
```
 
#### CONFIGURATION
Inside the **wsi** (or **netwsi**) script, near the begining, there is a clearly marked section, named **"USER CONFIGURATION BLOCK"**, where all the user-configurable variables (described in the following section) have been collected. 
Most can be left as is but the important one is the location of the whisper.cpp model file that you would like to use during transcription.
The location of the **wsi** script (should be in your $PATH) can be changed from the "Preferences" dialog, accessible by the system `Extensions` app or by clicking on the `Blurt` (&#x0181;) top bar indicator label.
![Preferences screenshot](resources/prefs.png)
The keyboard shortcut to initiate speech input can also be modified if necessary. Check the gschema.xml file for the key combination and modify it as desired. The schema then has to be recompiled with 
```glib-compile-schemas schemas/``` from the command line in the extension folder

#### TIPS AND TRICKS
Sox is recording in wav format at 16k rate, the only currently accepted by whisper.cpp. This is done in **wsi** with this command:
`rec -t wav $ramf rate 16k silence 1 0.1 3% 1 2.0 6% `
It will attempt to stop on silence of 2s with signal level threshold of 6%. A very noisy environment will prevent the detection of silence and the recording (of noise) will continue. This is a problem and a remedy that may not work in all cases is to adjust the duration and silence threshold in the sox filter in the `wsi` script. 
**You can use the manual interuption method below if preferred**

You can't raise the threshold arbitrarily because, if you consistently lower your voice (fadeout) at the end of your speech, it may get cut off if the threshold is high. Lower it in that case to a few %.    
It is best to try to make the speech distinguishable from noise by amplitude (speak clearly, close to the microphone), while minimizing external noise (sheltered location of the microphone, noise canceling hardware etc.)
With good speech signal level, the threshold can then be more effective, since SNR (speech-to-noise ratio:-) is effectively increased. 

##### Manual speech recording interuption
For those who want to be able to interupt the recording manually with a key combination, in the spirit of great hacks, we will not even try to rewrite the extension code because... "kiss".
Instead of writing javascript to fight with shell setups and edge cases when transfering signals from the GNOME shell to a Gio.subprocess in a new bash or zsh shell etc., we are going to, again, use the system built-in features:
* Open your GNOME system settings and find "Keyboard".
* Under "Keyboard shortcuts", "View and customize shortcuts"
* In the new window, scroll down to "Custom Shortcuts" and press it.
* Press "+" to add a new shortcut and give it a name: "Blurt it already!"
* In the "Command" field type `pkill --signal 2 rec`
* Then press "Set Shortcut" and select a (unused) key combination. For example CTRL+ALT+x
* Click Add and you are done. 
That Simple.  Just make sure that the new key binding has not been set-up already for something else.
Now when the extension is recording speech, it can be stopped with the new key combo and transcription will start immediatelly.

For the minimalists, it is trivial to extrapolate from this hack to a complete CLI solution, without a single pixel of GUI video buffering.
(A simple Adwaita widget window can cost MBs of video memory) 
Enter [BlahST](https://github.com/QuantiusBenignus/blahst/) - this more universal, lightweight tool configured for server-client transcription, has replaced Blurt completely for me.

After the speech is captured, it will be passed to `transcribe` (whisper.cpp) for speech recognition. This will happen faster than real time (especially with a fast CPU or if your whisper.cpp installation uses CUDA). One can adjust the number of processing threads used by adding  `-t n` to the command line parameters of transcribe (please, see whisper.cpp documentation). 
The script will then parse the text to remove non-speech artifacts, format it and send it to the PRIMARY selection (clipboard) using either X11 or Wayland tools. 

In principle, whisper (whisper.cpp) **is multilingual** and with the correct model file, this extension will "blurt" out UTF-8 text transcribed in the correct language. In the wsi script, the language choice can be made permanent by using `-l LC` in the `transcribe` call, where LC stands for the language code of choice, for example `-l fr` for french. 

##### Temporary directory and files
Speech-to-text transcription is memory- and CPU-intensive task and fast storage for read and write access can only help. That is why **wsi** stores temporary and resource files in memory, for speed and to reduce SSD/HDD "grinding": `TEMPD='/dev/shm'`. 
This mount point of type "tmpfs" is created in RAM (let's assume that you have enough, say, at least 8GB) and is made available by the kernel for user-space applications. When the computer is shut down it is automatically wiped out, which is fine since we do not need the intermediate files.
In fact, for some types of applications (looking at you Electron), it would be beneficial (IMHO) to have the systemwide /tmp mount point also kept in RAM. Moving /tmp to RAM may speed up application startup a bit. A welcome speedup for any Electron app. In its simplest form, this transition is easy, just run:

`echo "tmpfs /tmp tmpfs rw,nosuid,nodev" | sudo tee -a /etc/fstab`
and then restart your Linux computer.
For the aforementioned reasons, especially if HDD is the main storage media, one can also move the ASR model files needed by whisper.cpp in the same location (/dev/shm). These are large files, that can be transferred to this location at the start of a terminal session (or at system startup). This can be done using your `.profile` file by placing something like this in it: 
```
([ -f /dev/shm/ggml-base.en.bin ] || cp /path/to/your/local/whisper.cpp/models/ggml* /dev/shm/)
```

At this stage the extension, while useful, is somewhat of a "convenience hack" and can be improved by a seasoned GNOME developer who may find a better way to invoke whisper.cpp and fill the clipboard.
A virtual keyboard device implementing a legitimate IBus input method to send the text to a target text field is another direction for improvement, although I have no idea how to spy the field in focus, outside of the hacky nature of `xdotoll` and such.

#### Credits
* Open AI (for [Whisper](https://github.com/openai/whisper))
* Georgi Gerganov and community ( for Whisper's C/C++ port [whisper.cpp](https://github.com/ggerganov/whisper.cpp))
* The **sox** developers (for the venerable "Swiss Army knife of sound processing tools")
* The creators and maintainers of GNOME and utilities such as **xsel, xclip, wl-copy**, the heaviweight **ffmpeg** and others that make the Linux environment (CLI and GUI) such a powerful paradigm.
