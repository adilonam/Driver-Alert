from fastapi import FastAPI, WebSocket
import numpy as np
from scipy import signal
import librosa
from keras.models import load_model
import json

app = FastAPI()

RATE = 22050
sos = signal.butter(5, [50, 5000], 'bandpass', fs=RATE, output='sos')
num_rows = 40
num_columns = 130
num_channels = 1
prob_thresh = 0.98

modelSave = "./Models/siren_detector_V2.h5"
model = load_model(modelSave)


def get_mfccs(audio):
    try:
        # Convert from int16 to float32 to prevent overflow
        audio = audio.astype(np.float32)
        
        audio_min = np.min(audio)
        audio_max = np.max(audio)
        
        if audio_max - audio_min < np.finfo(float).eps:
            print("Warning: Audio has very small dynamic range")
            return None
        
        audio = 2 * ((audio - audio_min) / (audio_max - audio_min)) - 1
        audio = signal.sosfilt(sos, audio)
        mfccs = librosa.feature.mfcc(y=audio, sr=RATE, n_mfcc=num_rows)  # Ensure correct rows
        
        # Transpose or slice if dimensions do not match
        if mfccs.shape[1] != num_columns:
            print(f"Resizing MFCCs from {mfccs.shape[1]} to {num_columns}")
            if mfccs.shape[1] > num_columns:
                mfccs = mfccs[:, :num_columns]
            else:
                padding = num_columns - mfccs.shape[1]
                mfccs = np.pad(mfccs, ((0, 0), (0, padding)), mode='constant')
        
    except Exception as e:
        print("Error extracting features:", e)
        return None
    return mfccs



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_bytes()
        try:
            audio_data = np.frombuffer(data, dtype=np.int16)

            if len(audio_data) == 0:
                continue

            mfccs = get_mfccs(audio_data)
            if mfccs is not None:
                prediction_feature = mfccs.reshape(1, num_rows, num_columns, num_channels)
                predicted_proba_vector = model.predict(prediction_feature)
                print(predicted_proba_vector)
                
                # Convert NumPy float32 to native Python float
                proba = float(predicted_proba_vector[0][1])
                
                if proba > prob_thresh:
                    await websocket.send_text(json.dumps({'siren': True, 'probability': proba}))
                else:
                    await websocket.send_text(json.dumps({'siren': False, 'probability': proba}))
            else:
                await websocket.send_text(json.dumps({'error': 'Error extracting features'}))
        except ValueError as e:
            await websocket.send_text(json.dumps({'error': str(e)}))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
