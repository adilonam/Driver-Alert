class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.audioDataBuffer = [];
        this.sampleRate = 22050;  // Specify the sample rate
    }

    process(inputs) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputBuffer = input[0];
            const int16Array = new Int16Array(inputBuffer.length);

            for (let i = 0; i < inputBuffer.length; i++) {
                const s = Math.max(-1, Math.min(1, inputBuffer[i])); // Clamp the value to [-1, 1]
                int16Array[i] = s < 0 ? s * 32768 : s * 32767; // Convert to int16
            }

            this.audioDataBuffer.push(...int16Array);

            if (this.audioDataBuffer.length >= this.sampleRate * 3) {  // Send every 3 seconds
                this.port.postMessage(new Int16Array(this.audioDataBuffer).buffer);
                this.audioDataBuffer = [];  // Clear the buffer after sending
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
