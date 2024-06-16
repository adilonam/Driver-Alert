



async function getAudioDevices() {

    const devices = await navigator.mediaDevices.enumerateDevices();
    let aDevices = devices.filter(device => device.kind === 'audioinput' &&
        !device.label.toLowerCase().includes('default') &&
        !device.label.toLowerCase().includes('communications'));

    return aDevices

}

// Populate the microphone selection dropdown
async function populateMicrophoneSelect(microphoneSelect, audioInputDevices) {

    audioInputDevices.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text = device.label || `Microphone ${index + 1}`;
        microphoneSelect.appendChild(option);
    });
}



const stopAudioProcessing = (idDetector, deviceId, mediaStreamSource, audioProcessorNode, stream, audioContext) => {
    if (mediaStreamSource) {
        mediaStreamSource.disconnect();
    }
    if (audioProcessorNode) {
        audioProcessorNode.disconnect();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    audioContext.close().then(() => {
        console.log(`${deviceId}(${idDetector}) => Audio context closed.`);
    });
};

async function startDetector(idDetector, deviceId, microphoneSelect, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, startButton, stopButton, statusSignal) {

    const RATE = 22050;
    const CHANNELS = 1;

    microphoneSelect.value = deviceId;
    const currentHost = window.location.host;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    websocket = new WebSocket(`${wsProtocol}://${currentHost}/ws/real-time-audio/`);

    websocket.onopen = () => {
        console.log(`${deviceId}(${idDetector}) => WebSocket connection opened.`);
        startButton.disabled = true;
        stopButton.disabled = false;
    };

    websocket.onmessage = (event) => {
        statusSignal.textContent = `Sensor ${idDetector} --on`
        statusSignal.style.backgroundColor = "green";
        const data = JSON.parse(event.data);
        console.log(`${deviceId}(${idDetector}) => ${data.message} probability: ${data.probability}`);

        const prob = parseFloat(data.probability);
        const startProb = 0.1;
        const gap = 0.225;
        const maxTimer = 6;

        const statusGlobal = document.getElementById("statusGlobal")

        if (prob < startProb) {
            if ( document.body.dataset.colorTime > maxTimer) {
                statusGlobal.style.backgroundColor = 'white'
                statusGlobal.textContent = ""
            }

            signal.src = "/static/assets/signal-0.png";
        }
        else if (prob < startProb + gap) {
            if ( document.body.dataset.colorTime > maxTimer) {
                statusGlobal.style.backgroundColor = 'white'
                statusGlobal.textContent = ""
            }
            signal.src = "/static/assets/signal-25.png";
        }
        else if (prob < startProb + 2 * gap) {
            if ( document.body.dataset.colorTime > maxTimer) {
                statusGlobal.style.backgroundColor = 'white'
                statusGlobal.textContent = ""
            }
            signal.src = "/static/assets/signal-50.png";
        }
        else if (prob < startProb + 3 * gap) {
          
            if ( (document.body.dataset.colorTime > maxTimer && statusGlobal.style.backgroundColor == "red") ||  statusGlobal.style.backgroundColor == 'white' ) {
                 statusGlobal.style.backgroundColor = 'yellow'
            statusGlobal.textContent = "ATTENTION"
            document.body.dataset.colorTime =  maxTimer/2
            }
            signal.src = "/static/assets/signal-75.png";
        }
        else if (prob < startProb + 4 * gap) {
            statusGlobal.style.backgroundColor = 'red'
            statusGlobal.textContent = "ATTENTION"
            document.body.dataset.colorTime = 0
            signal.src = "/static/assets/signal-100.png";
        }
        else signal.src = "/static/assets/signal-0.png";
    };

    websocket.onerror = (error) => {
        console.log(`${deviceId}(${idDetector}) => WebSocket error: ${error.message}`);
        stopDetector(idDetector, deviceId, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal)
    };

    websocket.onclose = () => {
        console.log(`${deviceId}(${idDetector}) => WebSocket connection closed.`);
        startButton.disabled = false;
        stopButton.disabled = true;
        stopDetector(idDetector, deviceId, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal)
    };

    stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: deviceId,
            sampleRate: RATE,
            channelCount: CHANNELS,
        },
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.audioWorklet.addModule('/static/processor.js');

    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    audioProcessorNode = new AudioWorkletNode(audioContext, 'audio-processor');

    mediaStreamSource.connect(audioProcessorNode);
    audioProcessorNode.connect(audioContext.destination);

    audioProcessorNode.port.onmessage = (event) => {
        websocket.send(event.data);
    };

    stopButton.onclick = () => {
        stopDetector(idDetector, deviceId, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal)
    };

}



function stopDetector(idDetector, deviceId, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, statusSignal) {
    websocket.close();
    stopAudioProcessing(idDetector, deviceId, mediaStreamSource, audioProcessorNode, stream, audioContext);
    statusSignal.textContent = `Sensor ${idDetector} --off`
    statusSignal.style.backgroundColor = "red";
}




const micTask = async (idDetector, microphoneSelect, startButton, stopButton, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, audioInputDevices, statusSignal) => {


    await populateMicrophoneSelect(microphoneSelect, audioInputDevices);


    startButton.onclick = async () => {
        const selectedDeviceId = microphoneSelect.value;
        await startDetector(idDetector, selectedDeviceId, microphoneSelect, websocket, mediaStreamSource, audioProcessorNode, stream, audioContext, signal, startButton, stopButton, statusSignal)
    };


}
















document.addEventListener("DOMContentLoaded", async () => {

  


    //signal 1
    const startButton1 = document.getElementById("start1");
    const stopButton1 = document.getElementById("stop1");
    const microphoneSelect1 = document.getElementById("microphoneSelect1");
    const signal1 = document.getElementById("signal1");
    let websocket1 = null;
    let mediaStreamSource1 = null;
    let audioProcessorNode1 = null;
    let stream1 = null;
    let audioContext1 = null;
    const statusSignal1 = document.getElementById('statusSignal1')


    //signal 2
    const startButton2 = document.getElementById("start2");
    const stopButton2 = document.getElementById("stop2");
    const microphoneSelect2 = document.getElementById("microphoneSelect2");
    const signal2 = document.getElementById("signal2");
    let websocket2 = null;
    let mediaStreamSource2 = null;
    let audioProcessorNode2 = null;
    let stream2 = null;
    let audioContext2 = null;

    const statusSignal2 = document.getElementById('statusSignal2')


    // signal3
    const startButton3 = document.getElementById("start3");
    const stopButton3 = document.getElementById("stop3");
    const microphoneSelect3 = document.getElementById("microphoneSelect3");
    const signal3 = document.getElementById("signal3");
    let websocket3 = null;
    let mediaStreamSource3 = null;
    let audioProcessorNode3 = null;
    let stream3 = null;
    let audioContext3 = null;
    const statusSignal3 = document.getElementById('statusSignal3')



    //signal 4
    const startButton4 = document.getElementById("start4");
    const stopButton4 = document.getElementById("stop4");
    const microphoneSelect4 = document.getElementById("microphoneSelect4");
    const signal4 = document.getElementById("signal4");
    let websocket4 = null;
    let mediaStreamSource4 = null;
    let audioProcessorNode4 = null;
    let stream4 = null;
    let audioContext4 = null;
    const statusSignal4 = document.getElementById('statusSignal4')


      //timer
      document.body.dataset.colorTime = 0

      let interval = setInterval(() => {
        document.body.dataset.colorTime = parseInt(document.body.dataset.colorTime) + 1;
        console.log(`Time with color: ${document.body.dataset.colorTime}s`); // Or update a DOM element with this value
       }, 1000); // Increment the timer every second
   

    const audioInputDevices = await getAudioDevices()



    await micTask(1, microphoneSelect1, startButton1, stopButton1, websocket1, mediaStreamSource1, audioProcessorNode1, stream1, audioContext1, signal1, audioInputDevices, statusSignal1)

    await micTask(2, microphoneSelect2, startButton2, stopButton2, websocket2, mediaStreamSource2, audioProcessorNode2, stream2, audioContext2, signal2, audioInputDevices, statusSignal2 );

    await micTask(3, microphoneSelect3, startButton3, stopButton3, websocket3, mediaStreamSource3, audioProcessorNode3, stream3, audioContext3, signal3, audioInputDevices, statusSignal3);

    await micTask(4, microphoneSelect4, startButton4, stopButton4, websocket4, mediaStreamSource4, audioProcessorNode4, stream4, audioContext4, signal4, audioInputDevices, statusSignal4);



    //auto run 
    audioInputDevices.forEach(async (value, index) => {
        switch (index) {
            case 0:
                await startDetector(1, value.deviceId, microphoneSelect1, websocket1, mediaStreamSource1, audioProcessorNode1, stream1, audioContext1, signal1, startButton1, stopButton1, statusSignal1)
                break;
            case 1:
                await startDetector(2, value.deviceId, microphoneSelect2, websocket2, mediaStreamSource2, audioProcessorNode2, stream2, audioContext2, signal2, startButton2, stopButton2, statusSignal2);

                break;
            case 2:
                await startDetector(3, value.deviceId, microphoneSelect3, websocket3, mediaStreamSource3, audioProcessorNode3, stream3, audioContext3, signal3, startButton3, stopButton3, statusSignal3 );

                break;
            case 3:
                await startDetector(4, value.deviceId, microphoneSelect4, websocket4, mediaStreamSource4, audioProcessorNode4, stream4, audioContext4, signal4, startButton4, stopButton4, statusSignal4);

                break;

            default:
                break;
        }
    })


    //design 
    let container = document.getElementById('container');
    let settingContainer = document.getElementById('settingContainer');

    document.getElementById('backBtn').addEventListener('click', function () {
        container.style.zIndex = 2; // Increment z-index by 1
        settingContainer.style.zIndex = 1;

    });

    document.getElementById('settingBtn').addEventListener('click', function () {
        container.style.zIndex = 1; // Increment z-index by 1
        settingContainer.style.zIndex = 2;

    });





});
