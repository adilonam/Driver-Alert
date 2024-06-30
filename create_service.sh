#!/bin/bash

# Prompt for the Python path and repo path
read -p "Enter the path to the Python executable: " python_path
read -p "Enter the path to the Driver-Alert repository: " repo_path

# Create the service content
service_content="[Unit]
Description=FastAPI Application with Chromium Kiosk
After=network-online.target
Wants=network-online.target

[Service]
User=$(whoami)
WorkingDirectory=$repo_path
ExecStart=$python_path $repo_path/main.py
ExecStartPost=/bin/bash -c 'while ! curl -s http://localhost:8000 > /dev/null; do sleep 1; done; export DISPLAY=:0 && /usr/bin/chromium --kiosk --incognito --use-fake-ui-for-media-stream http://localhost:8000 &'
Restart=always

[Install]
WantedBy=multi-user.target
"

# Create the systemd service file
echo "$service_content" | sudo tee /etc/systemd/system/eva.service > /dev/null

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable eva.service
sudo systemctl start eva.service

# Check the service status
sudo systemctl status eva.service
