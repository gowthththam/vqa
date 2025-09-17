// AgentAudioCapture.tsx
// React component to capture agent's microphone audio and send chunks to backend via Socket.IO

import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'https://cceabf4cecca.ngrok-free.app/'; // Ngrok public backend URL
const CHUNK_MS = 1000; // Send audio chunks every 1 second

const AgentAudioCapture: React.FC = () => {
  const socketRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    let stream: MediaStream;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(s => {
        stream = s;
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current.ondataavailable = async (event: BlobEvent) => {
          if (event.data.size > 0) {
            const arrayBuffer = await event.data.arrayBuffer();
            // Optionally convert WebM/Opus to Int16 PCM here if backend requires
            socketRef.current.emit('agent_audio_chunk', arrayBuffer);
          }
        };
        mediaRecorderRef.current.start(CHUNK_MS);
      })
      .catch(err => {
        console.error('Microphone access denied:', err);
      });

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div>
      <p>Agent microphone is streaming audio to backend...</p>
    </div>
  );
};

export default AgentAudioCapture;
