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


const micTask = async (idDetector , microphoneSelect,startButton, stopButton , output , signal )=>{
    await populateMicrophoneSelect(microphoneSelect);
    
    let mediaRecorder = null
    let  websocket = null

    startButton.onclick = async () => {
        const selectedDeviceId = microphoneSelect.value;
       
       let audioChunks = [];

        // Initialize WebSocket connection
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
            let prob = parseFloat(data.probability)
            let startProb = 0.9
            let gap = 0.025
           if(prob < startProb){
            signal.src = "/static/assets/signal-0.png"
           }
           else if ( prob < startProb + gap) {
            signal.src = "/static/assets/signal-25.png"
           }
           else if ( prob < startProb + 2*gap) {
            signal.src = "/static/assets/signal-50.png"
           }
           else if ( prob <  startProb + 3*gap) {
            signal.src = "/static/assets/signal-75.png"
           }
           else if (prob < startProb + 4*gap) {
            signal.src = "/static/assets/signal-100.png"
           }
           else 
           {
             signal.src = "/static/assets/signal-0.png"
           }

        

        };

        websocket.onerror = (error) => {
            output.textContent += `\nDetector ${idDetector} => WebSocket error: ${error.message}`;
        };

        websocket.onclose = () => {
            output.textContent += `\nDetector ${idDetector} => WebSocket connection closed.`;
            startButton.disabled = false;
            stopButton.disabled = true;
        };

      
   // Capture audio
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: selectedDeviceId,
                sampleRate: RATE,
                channelCount: CHANNELS
            }
        });

        let audioContext;
        
        let mediaStreamSource;
        let processor;
        let audioDataBuffer = [];
      


     
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);

        processor = audioContext.createScriptProcessor(4096, 1, 1);
        mediaStreamSource.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
            const inputBuffer = event.inputBuffer.getChannelData(0);
            const int16Array = new Int16Array(inputBuffer.length);

            for (let i = 0; i < inputBuffer.length; i++) {
                int16Array[i] = inputBuffer[i] * 32767;  // Convert float [-1, 1] to int16 range
            }

            audioDataBuffer.push(...int16Array);

            if (audioDataBuffer.length >= audioContext.sampleRate * 3) {  // Send every 3 seconds
                websocket.send(new Int16Array(audioDataBuffer).buffer);
                audioDataBuffer = [];  // Clear the buffer after sending
            }
        };





        
    };

    stopButton.onclick = () => {
        mediaRecorder.stop();
        websocket.close();
    };
}


await micTask(1 , microphoneSelect1 , startButton1, stopButton1 , outputAll , signal1)
await micTask(2 , microphoneSelect2 , startButton2, stopButton2 , outputAll , signal2)




});
