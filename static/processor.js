class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.audioDataBuffer = [];  // This should hold the 2D array (nested arrays of samples)
        this.sampleRate = 22050;
        this.framePerBuffer = 128;
        this.tempInt16Array = [];
    }

    flattenArray(arr) {
        return arr.reduce((acc, val) => acc.concat(val), []);
    }

    process(inputs) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputBuffer = input[0];

            for (let i = 0; i < inputBuffer.length; i++) {
                const s = Math.max(-1, Math.min(1, inputBuffer[i])); // Clamp the value to [-1, 1]
                if (s!==0) {
                    this.tempInt16Array.push(s < 0 ? s * 32768 : s * 32767); // Convert to int16
                }
            }

            if (this.tempInt16Array.length >= this.framePerBuffer) {
                this.audioDataBuffer.push(this.tempInt16Array.slice());
                this.tempInt16Array.length = 0; // Clear the temporary array
            }

            const totalLength = this.audioDataBuffer.reduce((acc, arr) => acc + arr.length, 0);
            if (totalLength >= this.sampleRate * 3) {  // Send every 3 seconds
                const flattenedBuffer = this.flattenArray(this.audioDataBuffer);
                this.port.postMessage(new Int16Array(flattenedBuffer).buffer);
                this.audioDataBuffer = [];  // Clear the buffer after sending
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
