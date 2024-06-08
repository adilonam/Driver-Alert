from fastapi import FastAPI, File, UploadFile, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
import librosa
import numpy as np
import io
import soundfile as sf
import uvicorn
from pydantic import BaseModel
import pyaudio
from keras.models import load_model

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
RATE = 44100
num_rows = 40
num_columns = 130
num_channels = 1
prob_thresh = 0.98  # Probability threshold for detecting the siren

class RealTimeResponse(BaseModel):
    message: str
    probabilities: list

@app.websocket("/ws/real-time-audio/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive binary audio chunk data from WebSocket
            data = await websocket.receive_bytes()
            
            # Assume incoming data is in the right format for MFCC extraction
            audio_data = np.frombuffer(data, dtype=np.int16)
            
            mfccs = librosa.feature.mfcc(y=audio_data.astype(float), sr=RATE, n_mfcc=num_rows)
            prediction_feature = mfccs.reshape(1, num_rows, mfccs.shape[1], num_channels)
            predicted_proba_vector = model.predict_proba(prediction_feature)
            
            # Determine if siren is detected
            if predicted_proba_vector[0][1] > prob_thresh:
                response = RealTimeResponse(message="SIREN!!!", probabilities=predicted_proba_vector[0].tolist())
            else:
                response = RealTimeResponse(message="No siren. Carry on.", probabilities=predicted_proba_vector[0].tolist())
            
            # Send back the response as JSON
            await websocket.send_json(response.dict())
    
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()

if __name__ == "__main__":
    uvicorn.run("your_module_name:app", host="0.0.0.0", port=8000, reload=True)


