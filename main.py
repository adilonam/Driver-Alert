from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
import librosa
import numpy as np
import uvicorn
from pydantic import BaseModel
from keras.models import load_model
from scipy import signal

# Create the FastAPI app
app = FastAPI()

# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Serve the HTML page
@app.get("/", response_class=HTMLResponse)
async def get(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})





model = load_model("./Models/siren_detector_V2.h5")






# Audio configuration
RATE = 22050
num_rows = 40
num_columns = 130  # Adjust this based on your model's expected input shape
num_channels = 1
prob_thresh = 0.95  # Probability threshold for detecting the siren

# Bandpass filter configuration
sos = signal.butter(5, [50, 5000], 'bandpass', fs=RATE, output='sos')

class RealTimeResponse(BaseModel):
    message: str
    probability: str

def get_mfccs(audio):
    try:
        # Normalize the audio
        audio = 2 * ((audio - min(audio)) / (max(audio) - min(audio))) - 1

        # Apply bandpass filter
        audio = signal.sosfilt(sos, audio)

        # Extract MFCC features
        mfccs = librosa.feature.mfcc(y=audio, sr=RATE, n_mfcc=num_rows)

        #Pad or trim to ensure correct number of columns
        if mfccs.shape[1] < num_columns:
            pad_width = num_columns - mfccs.shape[1]
            mfccs = np.pad(mfccs, ((0, 0), (0, pad_width)), mode='constant')
            print("warning: audio has a low  columns")
        else:
            mfccs = mfccs[:, :num_columns]

    except Exception as e:
        print("Error extracting features:", e)
        return None

    return mfccs

@app.websocket("/ws/real-time-audio/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive binary audio chunk data from WebSocket
            data = await websocket.receive_bytes()

            # Check if the size of the received data is a multiple of np.int16
            if len(data) % 2 != 0:
                print("Received data size is not a multiple of element size for np.int16")
                await websocket.close(code=1003)
                break
            
            # Assume incoming data is in the right format for MFCC extraction
            audio_data = np.frombuffer(data, dtype=np.int16)
            
            # Extract MFCC features using the modified get_mfccs function
            mfccs = get_mfccs(audio_data.astype(float))
            
            if mfccs is None:
                await websocket.close(code=1003)
                break
            
            prediction_feature = mfccs.reshape(1, num_rows, num_columns, num_channels)
            
            # Get probability predictions
            predicted_proba_vector = model.predict(prediction_feature)
            
            
            response = RealTimeResponse(message="Sound detected", probability=str(predicted_proba_vector[0][0]))
         
            
            # Send back the response as JSON
            await websocket.send_json(response.dict())

    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)