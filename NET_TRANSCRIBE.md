# Network Transcription (recommended mode)
This would be useful for Linux systems that run GNOME but do not have the power to transcribe speech efficiently.
In addition, it also shows speedup of local transcription on faster machines which run a whisper.cpp server on localhost. See below.

### Setup
Speech is recorded on the local machine and sent over to a running instance of whisper.cpp [server](https://github.com/ggerganov/whisper.cpp/tree/master/examples/server), typically on the local network.

* To make the extension work in network transcription mode, one should configure the hostname and port of the server from the extension preferences.

* **wsi** can be found in this repository and should be placed in $HOME/.local/bin. 

* The IP and port number for the server can also be entered in the configuration block of the script (they can be different from the ones in the extension).
* The fall back to the hostaname and port in the script, input any string starting with hyphen ('-') into the IP / hostname field in the extension preferences. 

* The script will check that a running server is present at the specified IP and complain if not found. To properly set up the server, please, look at its [documentation](https://github.com/ggerganov/whisper.cpp/tree/master/examples/server)
A typical invocation of the server executable would be something like this (can be placed in your .profile or set up as a startup program from the GNOME GUI):
```
/home/path_to/whisper.cpp/server --host 0.0.0.0 --port 58080 -t 8 -nt -m /dev/shm/ggml-base.en.bin &
```
or to use it from the machine it is running on (localhost) only:

```
/home/path_to/whisper.cpp/server --host 127.0.0.1 --port 58080 -t 8 -nt -m /dev/shm/ggml-base.en.bin &
```

* Please, run the script from the command line first to check for its dependencies and have them installed.

When **wsi** is properly set up, Blurt will work the same way as with local instance of whisper.cpp. Likely faster.

The next section explains why this mode of transcription may bring some speedup.

## Signifficant Speedup
### ... when running a local whisper.cpp server (on the same machine or LAN) versus using main executable

This expands on a previous observation / [comment](https://github.com/ggerganov/whisper.cpp/discussions/1706#discussioncomment-8559750):

In response to a [feature request](https://github.com/QuantiusBenignus/Blurt/issues/4), I added network transcription support (using the whisper.cpp server implementation) to [Blurt](https://github.com/QuantiusBenignus/blurt) (GNOME extension) and [BlahST](https://github.com/QuantiusBenignus/BlahST) speech-to-text input tools (based on whisper.cpp). 
There is more-than-expected speedup (much more than what can be attributed to the elliminated model loading time) of transcription when going to the server!

Before, I was getting ~30x-faster-than-realtime transcription with a local whisper.cpp (**main** executable) instance that was loading the model file on each call instead of keeping it loaded in memory.
Take a look at the transcription speed when a call to a local whisper.cpp **server** instance is made (excluding the time for speech input, the curl call takes the bulk of the time in my tools, so its timing is the bigest contributor to speed of transcription ):

The first screenshot shows that the server instance (on localhost) is processing a 12.5 second speech clip, using 8 threads and assisted by GPU with CUDA:

![Screenshot from 2024-02-22 11-55-52](https://github.com/QuantiusBenignus/blurt/assets/120202899/0e601ea2-9743-42e3-b7b5-f1cd0ca96351)


And the request itself (timed to stderr with curl itself, tcurl is just a shell function wrapper to curl with timing feedback turned on) shows ~140 ms of total transcription time:

![Screenshot from 2024-02-22 11-58-06](https://github.com/QuantiusBenignus/blurt/assets/120202899/6f0b352a-b8dd-424d-a3e9-9727dd4ba4eb)


This is almost **90x-faster-than-real-time** (~140 ms for a 12.5s speech clip). Loading the model takes about 110 ms for the "main" executable, which does not account for this big difference (3 times).
Seems like there is extra advantage to running a local server with the model preloaded.

Seeing this consistently, I would recommend using this **network** mode of operation of Blurt. 
Just use the wsi script, which makes a call to whisper.cpp **server** (server should be compiled along with main in your whisper.cpp repo).
That means that the server instance must be started on login (on local machine) or available on your LAN.

##### Two caveats:

1. If using CUDA accelleration, you will gain some speedup (say 150ms with cuBLAS, vs. 500 ms without) but if the server is running for a long time, it seems to eventually release the CUDA kernel memory (or is it hapening outside the server code, not sure, see this [issue](https://github.com/ggerganov/whisper.cpp/issues/1991#issue-2204120607) for description). When that happens, the server has to be restarted. So this mode with CUDA support for now makes sense if there is a batch of signifficant speech activity that has to be processed over a short time, rather than ocasional transcription here and there (for which I would recommend the server run without the GPU accelleration `-ng` command line flag, still ~100 ms faster than local whisper.cpp).
2. I have noticed that with the whisper.cpp server code resident in memory (including a large chunck of VRAM), running other generative AI models (e.g. Stable Diffusion) may result in a run without CUDA support (as the GPU is reported to be busy and unavailable). This could be a serious trade-off if the server is only used for occasional speech recognition.  
---
⚠️Warning: (Calling the whisper.cpp server over the open internet may not be a good idea, since, not only the latency will increase but, among other security factors, there is no encryption of the speech data and the server implementation does not sanitize the calls in any way.)
Please, note that the whisper.cpp server is still in development and may not be production-grade stable. 
An example for setting up the server with the desired model and other runtime parameters is available [here](https://github.com/ggerganov/whisper.cpp/tree/master/examples/server)
