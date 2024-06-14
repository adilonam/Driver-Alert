document.addEventListener("DOMContentLoaded", async () => {
    const outputAll = document.getElementById("output");

    //signal 1
    const startButton1 = document.getElementById("start1");
    const stopButton1 = document.getElementById("stop1");
    const microphoneSelect1 = document.getElementById("microphoneSelect1");
    const signal1 = document.getElementById("signal1");

//signal 2
const startButton2 = document.getElementById("start2");
const stopButton2 = document.getElementById("stop2");
const microphoneSelect2 = document.getElementById("microphoneSelect2");
const signal2 = document.getElementById("signal2");

// signal3
const startButton3 = document.getElementById("start3");
const stopButton3 = document.getElementById("stop3");
const microphoneSelect3 = document.getElementById("microphoneSelect3");
const signal3 = document.getElementById("signal3");


//signal 4
const startButton4 = document.getElementById("start4");
const stopButton4 = document.getElementById("stop4");
const microphoneSelect4 = document.getElementById("microphoneSelect4");
const signal4 = document.getElementById("signal4");



    const RATE = 22050;
    const CHANNELS = 1;

    // Populate the microphone selection dropdown
    async function populateMicrophoneSelect(microphoneSelect) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        audioInputDevices.forEach((device, index) => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${index + 1}`;
            microphoneSelect.appendChild(option);
        });
    }


    const micTask = async (idDetector, microphoneSelect, startButton, stopButton, output, signal) => {
        await populateMicrophoneSelect(microphoneSelect);
        
        let websocket = null;

        startButton.onclick = async () => {
            const selectedDeviceId = microphoneSelect.value;
            
            const currentHost = window.location.host;
            const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            websocket = new WebSocket(`${wsProtocol}://${currentHost}/ws/real-time-audio/`);

            websocket.onopen = () => {
                output.textContent += `\nDetector ${idDetector} => WebSocket connection opened.`;
                startButton.disabled = true;
                stopButton.disabled = false;
            };

            websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                output.textContent += `\nDetector ${idDetector} => ${data.message} probability: ${data.probability}`;

                const prob = parseFloat(data.probability);
                const startProb = 0.1;
                const gap = 0.225;

                if (prob < startProb) signal.src = "/static/assets/signal-0.png";
                else if (prob < startProb + gap) signal.src = "/static/assets/signal-25.png";
                else if (prob < startProb + 2 * gap) signal.src = "/static/assets/signal-50.png";
                else if (prob < startProb + 3 * gap) signal.src = "/static/assets/signal-75.png";
                else if (prob < startProb + 4 * gap) signal.src = "/static/assets/signal-100.png";
                else signal.src = "/static/assets/signal-0.png";
            };

            websocket.onerror = (error) => {
                output.textContent += `\nDetector ${idDetector} => WebSocket error: ${error.message}`;
            };

            websocket.onclose = () => {
                output.textContent += `\nDetector ${idDetector} => WebSocket connection closed.`;
                startButton.disabled = false;
                stopButton.disabled = true;
            };

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId,
                    sampleRate: RATE,
                    channelCount: CHANNELS,
                },
            });

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await audioContext.audioWorklet.addModule('/static/processor.js');
            
            const mediaStreamSource = audioContext.createMediaStreamSource(stream);
            const audioProcessorNode = new AudioWorkletNode(audioContext, 'audio-processor');
            
            mediaStreamSource.connect(audioProcessorNode);
            audioProcessorNode.connect(audioContext.destination);

            audioProcessorNode.port.onmessage = (event) => {
                websocket.send(event.data);
            };
        };

        stopButton.onclick = () => {
            websocket.close();
        };
    }


await micTask(1 , microphoneSelect1 , startButton1, stopButton1 , outputAll , signal1)
await micTask(2 , microphoneSelect2 , startButton2, stopButton2 , outputAll , signal2)

await micTask(3 , microphoneSelect3 , startButton3, stopButton3 , outputAll , signal3)
await micTask(4 , microphoneSelect4 , startButton4, stopButton4 , outputAll , signal4)


});
