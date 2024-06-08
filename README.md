# Emergency Driver Alert (EVA) Software Repository

### This is a project led by Gabriel Sarch, Sylvester Benson-Sesay, and Phuc Do as part of the University of Rochester Biomedical Engineering Senior Design Project.
### The problem was pitched to us by Marlene Sutliff and Steven Barnett from the UR Community/Deaf Wellness Center, and Dan Brooks, President of HLAA NYS Association.

### Problem Statement:
There is a need to ensure that drivers are alerted of approaching emergency vehicles so that they can quickly and safely move out of the way. This is particularly challenging for deaf, hard-of-hearing, and distracted drivers, making it difficult to identify emergency signals and increasing the risk of collisions with emergency vehicles. The focus of this project is to develop an in-car device that detects emergency vehicles and notifies the driver of their presence in real time.

**The code in this repository can be used to train and implement a real-time siren detector.**

## About the Detector
The detector uses a standard convolutional neural network (CNN) to detect sirens amidst urban and car noise.

### Video of Working Detector (click the image to go to the video):

[![Alt text](https://img.youtube.com/vi/yw6vhPHvPNU/0.jpg)](https://www.youtube.com/watch?v=yw6vhPHvPNU)

### CNN Architecture:
- Simple convolutional architecture that can run on a small device (supports CPU or small GPU).
- Output: probability of "siren present" and "siren not present."

### Training Data
- Training data is gathered from the UrbanSounds8k dataset (https://urbansounddataset.weebly.com/urbansound8k.html), YouTube, and some field recordings taken in Rochester, NY while driving.
- The CNN is trained on 3-second audio chunks.
- Mel-cepstral frequency coefficients (MFCCs) are extracted and used as input to the CNN.
- Siren audio and background noise are randomly scrambled before each training batch.
- Various signal-to-noise ratios between the siren and background noise are generated to improve generalization.

## Files in Repository
There are four main files:
1. **convertWav2Txt** & **generateTrainingData**: Format collected audio, split data into chunks, and save as numpy arrays.
2. **trainSirenDetector**: Set up the CNN architecture and train it.
3. **Real-Time Siren Detector**: Real-time detector that works with any microphone.
4. **main.py**: FastAPI server with WebSocket for real-time audio streaming.

The **Models/** folder contains our trained models which can be used by the Real-time Siren Detector. See CNN architecture for more info.

## Adding FastAPI WebSocket Streaming
We have integrated FastAPI's WebSocket for streaming audio, allowing real-time detection.
