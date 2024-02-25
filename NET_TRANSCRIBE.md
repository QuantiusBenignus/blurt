# Network Transcription (recommended mode)
This would be useful for Linux systems that run GNOME but do not have the power to transcribe speech efficiently.
In addition, it also shows speedup of local transcription on faster machines which run a whisper.cpp server on localhost. See below.

### Setup
Speech is recorded on the local machine and sent over to a running instance of whisper.cpp [server](https://github.com/ggerganov/whisper.cpp/tree/master/examples/server), typically on the local network.

* To make the extension work in network transcription mode, one should change the **wsi** script with **netwsi**, either from the extension preferences, or by simply renaming the scripts.

* **netwsi** can be found in this repository and should be placed in $HOME/.local/bin. 

* The IP and port number for the server should be entered in the configuration block of the script.

* The script will check that a running server is present at the specified IP and complain if not found. To properly set up the server, please, look at its [documentation](https://github.com/ggerganov/whisper.cpp/tree/master/examples/server)

* Please, run the script from the command line first to check for its dependencies and have them installed.

When **netwsi** is properly set up, Blurt will work the same way as with local instance of whisper.cpp. Likely faster.

The next section explains why this mode of transcription is recommended.

## Signifficant Speedup
### ... when running a local whisper.cpp server (on the same machine or LAN) versus using main executable

This expands on a previous observation / [comment](https://github.com/ggerganov/whisper.cpp/discussions/1706#discussioncomment-8559750):

In response to a [feature request](https://github.com/QuantiusBenignus/Blurt/issues/4), I added network transcription support (using the whisper.cpp server implementation) to [Blurt](https://github.com/QuantiusBenignus/blurt) (GNOME extension) and [BlahST](https://github.com/QuantiusBenignus/BlahST) speech-to-text input tools (based on whisper.cpp). 
There is more-than-expected speedup (much more than what can be attributed to the elliminated model loading time) of transcription when going to the server!

Before, I was getting ~30x-faster-than-realtime transcription with a local whisper.cpp (**main** executable) instance that was loading the model file on each call instead of keeping it loaded in memory.
Take a look at the transcription speed when a call to a local whisper.cpp **server** instance is made (excluding the time for speech input, the curl call takes the bulk of the time in my tools, so its timing is the bigest contributor to speed of transcription ):

The first screenshot shows that the server instance (on localhost) is processing a 12.5 second speech clip, using 8 threads and assisted by GPU with CUDA.
![Screenshot from 2024-02-22 11-55-52](https://github.com/QuantiusBenignus/blurt/assets/120202899/0e601ea2-9743-42e3-b7b5-f1cd0ca96351)


And the request itself (timed to stderr with curl itself, tcurl is just a shell function wrapper to curl with timing feedback turned on) shows ~140 ms of total transcription time
![Screenshot from 2024-02-22 11-58-06](https://github.com/QuantiusBenignus/blurt/assets/120202899/6f0b352a-b8dd-424d-a3e9-9727dd4ba4eb)


This is almost **90x-faster-than-real-time** (~140 ms for a 12.5s speech clip). Loading the model takes about 110 ms for the "main" executable, which does not account for this big difference (3 times).
Seems like there is extra advantage to running a local server with the model preloaded.

Seeing this consistently, I would recommend using this **network** mode of operation of Blurt. 
Just use the netwsi script, which makes a call to whisper.cpp **server** (server should be compiled along with main in your whisper.cpp repo).
That means that the server instance must be started on login (on local machine) or available on your LAN. 
(Calling the whisper.cpp server over the open internet may not be a good idea, since, not only the latency will increase but, among other security factors, there is no encryption of the speech data and the server implementation does not sanitize the calls in any way.)

An example for setting up the server with the desired model and other runtime parameters is available [here](https://github.com/ggerganov/whisper.cpp/tree/master/examples/server)
