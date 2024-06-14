class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.audioDataBuffer = [];
        this.sampleRate = 22050;  // Specify the sample rate
        this.framePerBuffer = 500 ;
        this.int16Array = [];
    }

    process(inputs) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputBuffer = input[0];
           

            for (let i = 0; i < inputBuffer.length; i++) {
                const s = Math.max(-1, Math.min(1, inputBuffer[i])); // Clamp the value to [-1, 1]
                if (s !== 0) {
                    this.int16Array.push(s < 0 ? s * 32768 : s * 32767);  // Convert to int16
                }
            }

            if(this.int16Array.length >= this.framePerBuffer){
                this.audioDataBuffer.push(...this.int16Array);
                this.int16Array = [];
            }
           

            if (this.audioDataBuffer.length >= this.sampleRate * 3) {  // Send every 3 seconds
                this.port.postMessage(new Int16Array(this.audioDataBuffer).buffer);
                this.audioDataBuffer = [];  // Clear the buffer after sending
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
