from fastapi import FastAPI, WebSocket
import numpy as np
import librosa
from scipy.signal import find_peaks
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
import librosa
import numpy as np
import uvicorn

app = FastAPI()







# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Serve the HTML page
@app.get("/", response_class=HTMLResponse)
async def get(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})









# Define the sample rate and audio duration
SAMPLE_RATE = 22050
DURATION = 3  # 3 seconds

def detect_siren(np_audio):
    """
    Detects siren sounds in the provided np_audio array of shape (samples,)
    and returns a probability score.
    """
    # Extract the Short-Time Fourier Transform (STFT)
    D = np.abs(librosa.stft(np_audio))

    # Convert amplitude to decibel
    DB = librosa.amplitude_to_db(D, ref=np.max)

    # Get spectrogram frequencies
    freqs = librosa.fft_frequencies(sr=SAMPLE_RATE, n_fft=D.shape[0])

    # Calculate columns-wise median (to detect peaks)
    median_amplitude = np.median(DB, axis=1)

    # Detect peaks in the median amplitude
    peaks, properties = find_peaks(median_amplitude, height=20)  # tweak the height according to requirement

    # Define typical siren frequency ranges (e.g., 500–1500 Hz)
    siren_frequencies = (freqs >= 500) & (freqs <= 1500)

    siren_peaks = peaks[siren_frequencies[peaks]]

    if len(siren_peaks) == 0:
        return 0.0  # No siren detected

    # Calculate probability based on peak heights
    peak_heights = properties['peak_heights'][siren_frequencies[peaks]]
    confidence = np.mean(peak_heights)

    # Normalize the confidence to get a probability (0 to 1)
    min_confidence, max_confidence = 20, 100  # Example normalization range
    probability = (confidence - min_confidence) / (max_confidence - min_confidence)
    probability = np.clip(probability, 0, 1)

    return probability

@app.websocket("/ws/real-time-audio/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    audio_buffer = np.zeros(SAMPLE_RATE * DURATION)

    while True:
        # Receiving PCM float32 [-1, 1] audio data
        data = await websocket.receive_bytes()

        # Converting bytes to numpy array
        np_data = np.frombuffer(data, dtype=np.float32)
                # Ensure no NaNs or infinite values
        np_data = np_data[np.isfinite(np_data)]
        if np_data.size == 0:
            np_data = np.zeros(SAMPLE_RATE * DURATION)  # reset buffer if corrupted

        # Updating the buffer, maintaining 3 seconds of audio
        audio_buffer = np.roll(audio_buffer, -len(np_data))
        audio_buffer[-len(np_data):] = np_data
        
        probability = detect_siren(audio_buffer)
        await websocket.send_text(f"Siren probability: {probability:.2f}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
