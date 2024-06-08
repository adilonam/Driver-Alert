document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start");
    const stopButton = document.getElementById("stop");
    const output = document.getElementById("output");

    let websocket;
    let mediaRecorder;
    let audioChunks = [];

    const RATE = 22050;
    const CHUNK = RATE * 3;
    const format = 'pcm'; // Note: Web Audio API uses 'pcm' format internally
    const CHANNELS = 1;

    startButton.onclick = async () => {
        // Initialize WebSocket connection
        websocket = new WebSocket("ws://localhost:8000/ws/real-time-audio/");

        websocket.onopen = () => {
            output.textContent = "WebSocket connection opened.";
            startButton.disabled = true;
            stopButton.disabled = false;
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            output.textContent += `\n${data.message} Probabilities: ${data.probabilities}`; 
        };

        websocket.onerror = (error) => {
            output.textContent += `\nWebSocket error: ${error.message}`;
        };

        websocket.onclose = () => {
            output.textContent += "\nWebSocket connection closed.";
            startButton.disabled = false;
            stopButton.disabled = true;
        };

        // Capture audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: RATE, channelCount: CHANNELS } });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=pcm' });

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);

            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks);
                audioChunks = [];
                
                const fileReader = new FileReader();
                fileReader.onloadend = () => {
                    const arrayBuffer = fileReader.result;
                    const audioBuffer = new Int16Array(arrayBuffer);
                    websocket.send(audioBuffer.buffer);
                };
                
                fileReader.readAsArrayBuffer(audioBlob);
            }
        };

        mediaRecorder.start(3000); // Send audio chunks every 3 seconds
    };

    stopButton.onclick = () => {
        mediaRecorder.stop();
        websocket.close();
    };
});
