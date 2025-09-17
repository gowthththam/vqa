import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface VoiceData {
  time: string;
  pitch: {
    value: number;
    raw: number;
  };
  energy: {
    value: number;
    raw: number;
  };
  speakingRate: {
    value: number;
    raw: number;
  };
  emotion: string;
  is_speech: boolean;
}

interface EmotionData {
  emotion: string;
  prob: number;
  timestamp: string;
  speaker: 'agent' | 'customer';
}

interface TranscriptEmotionData {
  emotion: string;
  timestamp: string;
  speaker: 'agent' | 'customer';
  text?: string; // Add transcript text
}

interface VoiceAnalysisState {
  isConnected: boolean;
  isRecording: boolean;
  voiceData: VoiceData | null;
  pitchData: Array<{ time: string; value: number }>;
  energyData: Array<{ time: string; value: number }>;
  speakingRateData: Array<{ time: string; value: number }>;
  emotion: string;
  emotionData: EmotionData[];
  transcriptEmotions: TranscriptEmotionData[];
  startRecording: () => void;
  stopRecording: () => void;
  clearData: () => void;
  addTranscriptEmotion: (emotion: string, speaker: 'agent' | 'customer') => void;
}

// Updated configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://wipgenai.lwpcoe.com/vqa_live';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://wipgenai.lwpcoe.com';
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/vqa_live/socket.io/';

export { BACKEND_URL };

export function useVoiceAnalysis(): VoiceAnalysisState & { quickResponses: string[] } {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceData, setVoiceData] = useState<VoiceData | null>(null);
  const [pitchData, setPitchData] = useState<Array<{ time: string; value: number }>>([]);
  const [energyData, setEnergyData] = useState<Array<{ time: string; value: number }>>([]);
  const [speakingRateData, setSpeakingRateData] = useState<Array<{ time: string; value: number }>>([]);
  const [emotion, setEmotion] = useState('Neutral');
  const [emotionData, setEmotionData] = useState<EmotionData[]>([]);
  const [transcriptEmotions, setTranscriptEmotions] = useState<TranscriptEmotionData[]>([]);
  const [quickResponses, setQuickResponses] = useState<string[]>([]);
  const [agentAudioCapture, setAgentAudioCapture] = useState<AgentAudioCapture | null>(null);

  // Limit data points to prevent performance issues
  const MAX_DATA_POINTS = 20;
  const MAX_EMOTION_DATA = 50;

  useEffect(() => {
    // Initialize socket connection with separate socket URL
    const newSocket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ['polling', 'websocket']
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to voice analysis server');
      setIsConnected(true);
      const audioCapture = new AgentAudioCapture(newSocket);
      setAgentAudioCapture(audioCapture);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from voice analysis server');
      setIsConnected(false);
      setIsRecording(false);
    });
    
// Handle graph data (separate from emotion)
newSocket.on('graph_data', (data: VoiceData) => {
  console.log('Received graph data:', data);
  setVoiceData(data);
  
  // Update chart data - multiply values by 2 for better visibility
  setPitchData(prev => {
    const newData = [...prev, { time: data.time, value: data.pitch.value * 2 }];
    return newData.slice(-MAX_DATA_POINTS);
  });
  
  setEnergyData(prev => {
    const newData = [...prev, { time: data.time, value: data.energy.value * 2 }];
    return newData.slice(-MAX_DATA_POINTS);
  });
  
  setSpeakingRateData(prev => {
    const newData = [...prev, { time: data.time, value: data.speakingRate.value * 2 }];
    return newData.slice(-MAX_DATA_POINTS);
  });
});


    // Handle emotion data from live transcription
    newSocket.on('emotion_data', (data: { emotion: string; prob: number; transcript?: string }) => {
      console.log('Received emotion data:', data);
      setEmotion(data.emotion);
      const timestamp = new Date().toISOString();
      const newEmotionData: EmotionData = {
        emotion: data.emotion,
        prob: data.prob,
        timestamp,
        speaker: 'agent' // Default to agent, can be enhanced
      };
      setEmotionData(prev => {
        const newData = [...prev, newEmotionData];
        return newData.slice(-MAX_EMOTION_DATA);
      });
      // Only add to transcriptEmotions if transcript is non-empty and different from last
      setTranscriptEmotions(prev => {
        if (!data.transcript || data.transcript.trim() === '') return prev;
        if (prev.length > 0 && prev[prev.length - 1].text === data.transcript) return prev;
        return [
          ...prev,
          {
            emotion: data.emotion,
            timestamp,
            speaker: 'agent',
            text: data.transcript || ''
          }
        ];
      });
    });

    // In your useEffect socket setup:
    newSocket.on('quick_response', (data: { suggestions: string[]; suggestion: string }) => {
      console.log('Received quick response:', data);
      if (data && data.suggestions && Array.isArray(data.suggestions)) {
        setQuickResponses(data.suggestions.slice(0, 3)); // Keep only latest 3
      } else if (data && data.suggestion) {
        // Fallback for single suggestion format
        setQuickResponses([data.suggestion]);
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      // Clean up agent audio capture
      if (agentAudioCapture) {
        agentAudioCapture.stopRecording();
      }
      newSocket.disconnect();
    };
  }, []);

  const startRecording = async () => {
    if (socket && isConnected && agentAudioCapture) {
      console.log('Starting voice recording...');
      
      try {
        // Start agent audio capture
        await agentAudioCapture.startRecording();
        
        // Emit start_recording to enable employee processing too
        socket.emit('start_recording');
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start agent audio recording:', error);
      }
    } else {
      console.log('Cannot start recording: socket not connected or audio capture not ready');
    }
  };
  
  const stopRecording = () => {
    if (socket && isConnected && agentAudioCapture) {
      console.log('Stopping voice recording...');
      
      // Stop agent audio capture
      agentAudioCapture.stopRecording();
      
      // Emit stop_recording to disable employee processing too
      socket.emit('stop_recording');
      setIsRecording(false);
    } else {
      console.log('Cannot stop recording: socket not connected');
    }
  };

  const clearData = () => {
    setPitchData([]);
    setEnergyData([]);
    setSpeakingRateData([]);
    setEmotion('Neutral');
    setEmotionData([]);
    setTranscriptEmotions([]);
  };

  const addTranscriptEmotion = (emotion: string, speaker: 'agent' | 'customer') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    const newEmotion: TranscriptEmotionData = {
      emotion,
      timestamp,
      speaker
    };
    
    setTranscriptEmotions(prev => [...prev, newEmotion]);
  };

  class AgentAudioCapture {
    private socket: Socket | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private isRecording: boolean = false;
    private readonly sampleRate = 16000;

    constructor(socket: Socket) {
      this.socket = socket;
    }

    async startRecording(): Promise<void> {
      try {
        // Get microphone access
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: this.sampleRate,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        // Create audio context for processing
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: this.sampleRate
        });

        const source = this.audioContext.createMediaStreamSource(this.stream);
        
        // Create ScriptProcessorNode for real-time audio processing
        const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
          if (!this.isRecording || !this.socket) return;
          
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Convert Float32 to Int16
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = sample * 32767;
          }
          
          // Send to backend via socket
          this.socket.emit('agent_audio_chunk', int16Data.buffer);
        };

        source.connect(processor);
        processor.connect(this.audioContext.destination);
        
        this.isRecording = true;
        console.log('Agent audio recording started');
        
      } catch (error) {
        console.error('Error starting agent audio recording:', error);
        throw error;
      }
    }

    stopRecording(): void {
      this.isRecording = false;
      
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      console.log('Agent audio recording stopped');
    }
  }

  return {
    isConnected,
    isRecording,
    voiceData,
    pitchData,
    energyData,
    speakingRateData,
    emotion,
    emotionData,
    transcriptEmotions,
    startRecording,
    stopRecording,
    clearData,
    addTranscriptEmotion,
    quickResponses
  };
}