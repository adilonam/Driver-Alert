document.addEventListener("DOMContentLoaded", async () => {
    const startButton1 = document.getElementById("start1");
    const stopButton1 = document.getElementById("stop1");
    const output1 = document.getElementById("output1");
    const microphoneSelect1 = document.getElementById("microphoneSelect1");

    const startButton2 = document.getElementById("start2");
    const stopButton2 = document.getElementById("stop2");
    const output2 = document.getElementById("output2");
    const microphoneSelect2 = document.getElementById("microphoneSelect2");

    let websocket1;
    let mediaRecorder1;
    let audioChunks1 = [];

    let websocket2;
    let mediaRecorder2;
    let audioChunks2 = [];

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

    await populateMicrophoneSelect(microphoneSelect1);
    await populateMicrophoneSelect(microphoneSelect2);

    startButton1.onclick = async () => {
        const selectedDeviceId = microphoneSelect1.value;

        // Initialize WebSocket connection
        const currentHost = window.location.host;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        websocket1 = new WebSocket(`${wsProtocol}://${currentHost}/ws/real-time-audio/`);

        websocket1.onopen = () => {
            output1.textContent = "WebSocket connection opened.";
            startButton1.disabled = true;
            stopButton1.disabled = false;
        };

        websocket1.onmessage = (event) => {
            const data = JSON.parse(event.data);
            output1.textContent += `\n${data.message} probability: ${data.probability}`;
        };

        websocket1.onerror = (error) => {
            output1.textContent += `\nWebSocket error: ${error.message}`;
        };

        websocket1.onclose = () => {
            output1.textContent += "\nWebSocket connection closed.";
            startButton1.disabled = false;
            stopButton1.disabled = true;
        };

        // Capture audio
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: selectedDeviceId,
                sampleRate: RATE,
                channelCount: CHANNELS
            }
        });

        mediaRecorder1 = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=pcm' });

        mediaRecorder1.ondataavailable = (event) => {
            audioChunks1.push(event.data);

            if (audioChunks1.length > 0) {
                const audioBlob = new Blob(audioChunks1);
                audioChunks1 = [];

                const fileReader = new FileReader();
                fileReader.onloadend = () => {
                    const arrayBuffer = fileReader.result;
                    const audioBuffer = new Int16Array(arrayBuffer);
                    websocket1.send(audioBuffer.buffer);
                };

                fileReader.readAsArrayBuffer(audioBlob);
            }
        };

        mediaRecorder1.start(3000); // Send audio chunks every 3 seconds
    };

    stopButton1.onclick = () => {
        mediaRecorder1.stop();
        websocket1.close();
    };

    startButton2.onclick = async () => {
        const selectedDeviceId = microphoneSelect2.value;

        // Initialize WebSocket connection
        const currentHost = window.location.host;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        websocket2 = new WebSocket(`${wsProtocol}://${currentHost}/ws/real-time-audio/`);

        websocket2.onopen = () => {
            output2.textContent = "WebSocket connection opened.";
            startButton2.disabled = true;
            stopButton2.disabled = false;
        };

        websocket2.onmessage = (event) => {
            const data = JSON.parse(event.data);
            output2.textContent += `\n${data.message} probability: ${data.probability}`;
        };

        websocket2.onerror = (error) => {
            output2.textContent += `\nWebSocket error: ${error.message}`;
        };

        websocket2.onclose = () => {
            output2.textContent += "\nWebSocket connection closed.";
            startButton2.disabled = false;
            stopButton2.disabled = true;
        };

        // Capture audio
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: selectedDeviceId,
                sampleRate: RATE,
                channelCount: CHANNELS
            }
        });

        mediaRecorder2 = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=pcm' });

        mediaRecorder2.ondataavailable = (event) => {
            audioChunks2.push(event.data);

            if (audioChunks2.length > 0) {
                const audioBlob = new Blob(audioChunks2);
                audioChunks2 = [];

                const fileReader = new FileReader();
                fileReader.onloadend = () => {
                    const arrayBuffer = fileReader.result;
                    const audioBuffer = new Int16Array(arrayBuffer);
                    websocket2.send(audioBuffer.buffer);
                };

                fileReader.readAsArrayBuffer(audioBlob);
            }
        };

        mediaRecorder2.start(3000); // Send audio chunks every 3 seconds
    };

    stopButton2.onclick = () => {
        mediaRecorder2.stop();
        websocket2.close();
    };
});
