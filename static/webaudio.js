async function getAudioDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device =>
        device.kind === 'audioinput' &&
        !device.label.toLowerCase().includes('default') &&
        !device.label.toLowerCase().includes('communications')
    );
}


async function getMicrophoneData() {
    try {
        const response = await fetch('/microphones');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.microphones;
    } catch (error) {
        console.error('Error fetching microphone data:', error);
        return null;
    }
}

async function updateMicrophone(id, value) {
    const url = '/microphones/update';
    const data = {
        mic_number: id,
        new_value: value
    };

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error: ${response.status} - ${errorData.detail}`);
        }

        const responseData = await response.json();
        console.log('Microphone updated successfully:', responseData);
    } catch (error) {
        console.error('Error updating microphone:', error);
    }
}


function reorderArray(array1, array2) {
    // Extract elements from array1 that are in array2
    let extractedElements = array2.filter(label => array1.includes(label));
    
    // Remove those elements from array1
    let remainingElements = array1.filter(label => !extractedElements.includes(label));
    
    // Concatenate the two arrays
    return extractedElements.concat(remainingElements);
}

async function populateMicrophoneSelect(microphoneSelect, audioInputDevices) {
    audioInputDevices.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text = device.label  || `Microphone ${index + 1}`;
        microphoneSelect.appendChild(option);
    });
}

function stopAudioProcessing(mediaStreamSource, audioProcessorNode, stream, audioContext) {
    if (mediaStreamSource) mediaStreamSource.disconnect();
    if (audioProcessorNode) audioProcessorNode.disconnect();
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (audioContext) audioContext.close().then(() => console.log("Audio context closed."));
}

function stopDetector(idDetector, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal) {
    if (websocket) websocket.close();
    stopAudioProcessing(mediaStreamSource, audioProcessorNode, stream, audioContext);
    statusSignal.textContent = `Sensor ${idDetector} --off`;
    statusSignal.style.backgroundColor = "red";
}

async function startDetector(idDetector, deviceId, microphoneSelect, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, startButton, stopButton, statusSignal) {
    const RATE = 22050;
    const CHANNELS = 1;

    microphoneSelect.value = deviceId;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    websocket = new WebSocket(`${wsProtocol}://${window.location.host}/ws/real-time-audio/`);

    websocket.onopen = () => {
        console.log(`${deviceId}(${idDetector}) => WebSocket connection opened.`);
        startButton.disabled = true;
        stopButton.disabled = false;
    };

    websocket.onmessage = (event) => handleWebSocketMessage(event, idDetector, deviceId, signal, statusSignal);

    websocket.onerror = (error) => {
        console.log(`${deviceId}(${idDetector}) => WebSocket error: ${error.message}`);
        stopDetector(idDetector, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal);
    };

    websocket.onclose = () => {
        console.log(`${deviceId}(${idDetector}) => WebSocket connection closed.`);
        startButton.disabled = false;
        stopButton.disabled = true;
        stopDetector(idDetector, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal);
    };

    stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId, sampleRate: RATE, channelCount: CHANNELS } });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.audioWorklet.addModule('/static/processor.js');

    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    audioProcessorNode = new AudioWorkletNode(audioContext, 'audio-processor');

    mediaStreamSource.connect(audioProcessorNode);
    audioProcessorNode.connect(audioContext.destination);

    audioProcessorNode.port.onmessage = (event) => websocket.send(event.data);

    stopButton.onclick = () => stopDetector(idDetector, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal);
}

function handleWebSocketMessage(event, idDetector, deviceId, signal, statusSignal) {
    statusSignal.textContent = `Sensor ${idDetector} --on`;
    statusSignal.style.backgroundColor = "green";
    const data = JSON.parse(event.data);
    console.log(`${deviceId}(${idDetector}) => ${data.message} probability: ${data.probability}`);

    const prob = parseFloat(data.probability);
    const startProb = 0.1;
    const gap = 0.225;
    const maxTimer = 6;
    const statusGlobal = document.getElementById("statusGlobal");

    if (prob < startProb) {
        if (document.body.dataset.colorTime > maxTimer) {
            statusGlobal.style.backgroundColor = 'white';
            statusGlobal.textContent = "";
        }
        signal.src = "/static/assets/signal-0.png";
    } else if (prob < startProb + gap) {
        if (document.body.dataset.colorTime > maxTimer) {
            statusGlobal.style.backgroundColor = 'white';
            statusGlobal.textContent = "";
        }
        signal.src = "/static/assets/signal-25.png";
    } else if (prob < startProb + 2 * gap) {
        if (document.body.dataset.colorTime > maxTimer) {
            statusGlobal.style.backgroundColor = 'white';
            statusGlobal.textContent = "";
        }
        signal.src = "/static/assets/signal-50.png";
    } else if (prob < startProb + 3 * gap) {
        if ((document.body.dataset.colorTime > maxTimer && statusGlobal.style.backgroundColor == "red") || statusGlobal.style.backgroundColor == 'white') {
            statusGlobal.style.backgroundColor = 'yellow';
            statusGlobal.textContent = "ATTENTION";
            document.body.dataset.colorTime = maxTimer / 2;
        }
        signal.src = "/static/assets/signal-75.png";
    } else if (prob < startProb + 4 * gap) {
        statusGlobal.style.backgroundColor = 'red';
        statusGlobal.textContent = "ATTENTION";
        document.body.dataset.colorTime = 0;
        signal.src = "/static/assets/signal-100.png";
    } else {
        signal.src = "/static/assets/signal-0.png";
    }
}



document.addEventListener("DOMContentLoaded", async () => {
    const startButtons = [
        document.getElementById("start1"),
        document.getElementById("start2"),
        document.getElementById("start3"),
        document.getElementById("start4")
    ];

    const stopButtons = [
        document.getElementById("stop1"),
        document.getElementById("stop2"),
        document.getElementById("stop3"),
        document.getElementById("stop4")
    ];

    const microphoneSelects = [
        document.getElementById("microphoneSelect1"),
        document.getElementById("microphoneSelect2"),
        document.getElementById("microphoneSelect3"),
        document.getElementById("microphoneSelect4")
    ];

    const signals = [
        document.getElementById("signal1"),
        document.getElementById("signal2"),
        document.getElementById("signal3"),
        document.getElementById("signal4")
    ];

    const statusSignals = [
        document.getElementById('statusSignal1'),
        document.getElementById('statusSignal2'),
        document.getElementById('statusSignal3'),
        document.getElementById('statusSignal4')
    ];

    const setDefaults = [
        document.getElementById('setDefault1'),
        document.getElementById('setDefault2'),
        document.getElementById('setDefault3'),
        document.getElementById('setDefault4')
    ];

    let websockets = [null, null, null, null];
    let mediaStreamSources = [null, null, null, null];
    let audioProcessorNodes = [null, null, null, null];
    let streams = [null, null, null, null];
    let audioContexts = [null, null, null, null];

    const mics = await getMicrophoneData();

    document.getElementById('backBtn').addEventListener('click', () => {
        document.getElementById('container').style.zIndex = 2;
        document.getElementById('settingContainer').style.zIndex = 1;
    });

    document.getElementById('settingBtn').addEventListener('click', () => {
        document.getElementById('container').style.zIndex = 1;
        document.getElementById('settingContainer').style.zIndex = 2;
    });


    document.body.dataset.colorTime = 0;
    setInterval(() => {
        document.body.dataset.colorTime = parseInt(document.body.dataset.colorTime) + 1;
        console.log(`Time with color: ${document.body.dataset.colorTime}s`);
    }, 1000);

    const audioInputDevices = await getAudioDevices();

    for (let i = 0; i < 4; i++) {

        await populateMicrophoneSelect(microphoneSelects[i], audioInputDevices);

        startButtons[i].onclick = async () => {
            const selectedDeviceId = microphoneSelects[i].value;
            try {
            await startDetector(i + 1, selectedDeviceId, microphoneSelects[i], websockets[i], mediaStreamSources[i], audioProcessorNodes[i], streams[i], audioContexts[i], signals[i], startButtons[i], stopButtons[i], statusSignals[i]);
        } catch (error) {
            console.error(`Failed to start detector ${i + 1}:`, error);
        }
        };

        setDefaults[i].onclick = async () =>{
            const selectedDeviceLabel = microphoneSelects[i].selectedOptions[0].label;
           await updateMicrophone(i+1 , selectedDeviceLabel)
            
        }


       
    }

//autostart
    let workingMicIds = []


    for (let index = 0; index < 4; index++) {
        for (let i = 0; i < audioInputDevices.length; i++) {
            try {
                if (audioInputDevices[i].label === mics[index] && !workingMicIds.includes(audioInputDevices[i].deviceId) ) {
                    await startDetector(
                        index + 1,
                        audioInputDevices[i].deviceId,
                        microphoneSelects[index],
                        websockets[index],
                        mediaStreamSources[index],
                        audioProcessorNodes[index],
                        streams[index],
                        audioContexts[index],
                        signals[index],
                        startButtons[index],
                        stopButtons[index],
                        statusSignals[index]
                    );
             
                    workingMicIds.push(audioInputDevices[i].deviceId)
                }
            } catch (error) {
                console.error(`Failed to start detector ${index + 1}:`, error);
            }
        }
        
    }

  
    


      







  
});
