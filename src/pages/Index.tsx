import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CommonHeader from '@/components/common/CommonHeader';
import { useToast } from "@/hooks/use-toast";
import { useVoiceAnalysis, BACKEND_URL } from '@/hooks/useVoiceAnalysis';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import LeftColumn from '@/components/dashboard/LeftColumn';
import MiddleColumn from '@/components/dashboard/MiddleColumn';
import PendingTickets from '@/components/dashboard/PendingTickets';
import RightColumn from '@/components/dashboard/RightColumn';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, msalInstance } from '@/config/msal-config';
import FloatingFooter from '@/components/common/FloatingFooter';
import { io, Socket } from "socket.io-client";
import { azureBlobStorageService } from '@/services/azureBlobStorage';

// Use the correct PendingTicket structure everywhere:
type PendingTicket = {
  category: string;
  number: string;
  opened_at: string;
  priority: string;
  short_description: string;
  state: string;
  urgency: string;
  // Optionally, you can add assigned_to?: string if needed
};

// TicketInfo type expected by MiddleColumn
type TicketInfo = {
  id: string;
  description: string;
  status: string;
  urgency?: string;
  state?: string;
  category?: string;
  priority?: string;
  openedDate?: string;
  // ...any other fields you want to pass through
};
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://wipgenai.lwpcoe.com';
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/vqa_live/socket.io/';
const Index = () => {

   // --- Socket.IO for employee sentiment (replaces WebSocket on port 7000) ---
   const [employeeSocket, setEmployeeSocket] = useState<Socket | null>(null);
   const [isEmployeeSocketConnected, setIsEmployeeSocketConnected] = useState(false);
   const audioStreamRef = useRef<MediaStream | null>(null);
   const audioContextRef = useRef<AudioContext | null>(null);
   const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  // Handler to replace KB articles panel content
  const handleSelectKbArticles = useCallback(async (ticket) => {
    if (!ticket || !ticket.short_description) return;
    setKbArticlesLoading(true);
    setKbLoading(true);
    setKbError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/kb_articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: ticket.short_description })
      });
      const data = await res.json();
      if (data.articles) {
        setKnowledgeArticles(data.articles.map((a, idx) => ({
          id: idx + 1,
          title: a.title || a.short_description || 'Untitled',
          content: a.content || a.text || '',
          category: a.category || 'General',
          sys_id: a.sys_id || ''
        })));
        setKbError(null);
      } else {
        setKnowledgeArticles([]);
        setKbError(data.error || 'No articles found');
      }
    } catch (err) {
      setKnowledgeArticles([]);
      setKbError('Error fetching KB articles');
    } finally {
      setKbArticlesLoading(false);
      setKbLoading(false);
    }
  }, []);

  // Employee transcript/emotion state (must be first for scope)
  const [employeeTranscriptEmotions, setEmployeeTranscriptEmotions] = useState<Array<{
    emotion: string;
    timestamp: string;
    speaker: 'agent' | 'customer' | 'employee';
    text?: string;
  }>>([]);
  const [isCallCompleting, setIsCallCompleting] = useState(false);
  const [freezeStartTime, setFreezeStartTime] = useState<number | null>(null);
  const [frozenData, setFrozenData] = useState<{
    pitchData: any[];
    energyData: any[];
    speakingRateData: any[];
    transcriptEmotions: any[];
    employeeTranscriptEmotions: any[];
    emotion: string;
    callDuration: string;
    progressValue: number;
    resolutionTime?: string;
    overallRiskLevel?: 'Low Risk' | 'Medium Risk' | 'High Risk';
    issueComplexity?: string;
  } | null>(null);


  // Add this state for freeze countdown
  const [freezeCountdown, setFreezeCountdown] = useState<number | null>(null);

  // Add this useEffect to track freeze countdown
  useEffect(() => {
    if (isCallCompleting && freezeStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - freezeStartTime;
        const remaining = Math.max(0, 15 - Math.floor(elapsed / 1000));
        setFreezeCountdown(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          setFreezeCountdown(null);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setFreezeCountdown(null);
    }
  }, [isCallCompleting, freezeStartTime]);


  // Ticket selection state for Ticket Information
  const [selectedTicket, setSelectedTicket] = useState<PendingTicket | null>(null);

  // 🔥 ADD THESE THREE EMPLOYEE STATE VARIABLES HERE 🔥
  const [employeeData, setEmployeeData] = useState({
    name: '',
    email: '',
    employeeId: ''
  });
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  // Debug: log selectedTicket whenever it changes
  useEffect(() => {
    console.log('[DEBUG] selectedTicket changed:', selectedTicket);
  }, [selectedTicket]);

  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(true); // Start muted by default
  const [callDuration, setCallDuration] = useState('00:00:00');
  const [notes, setNotes] = useState('');
  const [isCallActive, setIsCallActive] = useState(true); // Track if call is active
  const timerRef = useRef<number | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [progressValue, setProgressValue] = useState(1); // Start at 1%
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPort7000Connected, setIsPort7000Connected] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'Low Risk' | 'Medium Risk' | 'High Risk'>('Low Risk');
  const [resolutionTime, setResolutionTime] = useState<string>("");
  const [callStartTimestamp, setCallStartTimestamp] = useState<number | null>(null);
  const [issueComplexity, setIssueComplexity] = useState<string>("");
  const [issueComplexityLoading, setIssueComplexityLoading] = useState(false);

  // Use voice analysis hook
  const {
    isConnected,
    isRecording,
    pitchData,
    energyData,
    speakingRateData,
    emotion,
    transcriptEmotions,
    startRecording,
    stopRecording,
    clearData,
    addTranscriptEmotion,
    quickResponses
  } = useVoiceAnalysis();

  // Dynamic conversation messages from live transcript
  // Helper to get IST time string in HH:mm:ss 24h format
  const getISTTime = (date?: string | Date) => {
    let d: Date;
    if (typeof date === 'string') {
      // Try to parse ISO or Zulu string
      d = new Date(date);
      if (isNaN(d.getTime())) d = new Date();
    } else {
      d = date ? new Date(date) : new Date();
    }
    // Convert to IST
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(utc + istOffset);
    return ist.toTimeString().slice(0, 8); // HH:mm:ss
  };

  // Restore true timestamp-based order: show messages in the real spoken sequence
  const messages = useMemo(() => {
    // Merge all agent and employee utterances into a single array with their true ISO timestamp
    const allUtterances = [
      ...(transcriptEmotions || []).filter(e => e.speaker === 'agent' && e.text && e.text.trim() !== '').map(e => ({
        sender: 'Agent' as const,
        text: e.text,
        timestamp: e.timestamp,
        displayTime: new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false }),
      })),
      ...(employeeTranscriptEmotions || []).filter(e => e.speaker === 'employee' && e.text && e.text.trim() !== '').map(e => ({
        sender: 'Employee' as const,
        text: e.text,
        timestamp: e.timestamp,
        displayTime: new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false }),
      }))
    ];

    // Sort by true ISO timestamp (oldest at top, newest at bottom)
    allUtterances.sort((a, b) => {
      const ta = Date.parse(a.timestamp);
      const tb = Date.parse(b.timestamp);
      return ta - tb;
    });

    // Assign sequential IDs after sorting, and format WhatsApp style
    const withIds = allUtterances.map((msg, idx) => ({
      id: idx + 1,
      sender: msg.sender,
      text: msg.text,
      timestamp: `${msg.sender} - ${msg.displayTime} - ${msg.text}`,
      displayTime: msg.displayTime
    }));

    if (withIds.length === 0) {
      return [
        { id: 1, sender: 'Agent' as 'Agent', text: 'Waiting for the Agent...', timestamp: 'Agent - --:--:-- - Waiting for the Agent...', displayTime: '--:--:--' },
        { id: 2, sender: 'Employee' as 'Employee', text: 'Waiting for the Employee...', timestamp: 'Employee - --:--:-- - Waiting for the Employee...', displayTime: '--:--:--' }
      ];
    }
    return withIds;
  }, [transcriptEmotions, employeeTranscriptEmotions]);

  useEffect(() => {
    if (!isCallActive) return; // Don't start timer if call is not active

    let seconds = 0;
    let minutes = 0;
    let hours = 0;

    const updateDuration = () => {
      seconds++;
      if (seconds >= 60) {
        seconds = 0;
        minutes++;
      }
      if (minutes >= 60) {
        minutes = 0;
        hours++;
      }

      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');

      setCallDuration(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    };

    timerRef.current = window.setInterval(updateDuration, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);

  const handleToggleMute = useCallback(() => {
    if (isConnected) {
      if (isMuted) {
        // Unmuting - start recording
        startRecording();
        
        // Start backend recording session - use optional chaining
        employeeSocket?.emit('start_recording_session', { session_id: `session_${Date.now()}` });
        
        toast({
          title: "Microphone Unmuted",
          description: "Voice analysis and recording started",
          duration: 2000,
        });
        setProgressValue((prev) => prev < 1 ? 1 : prev + 1);
      } else {
        // Muting - stop recording
        stopRecording();
        
        // Stop backend recording session - use optional chaining
        employeeSocket?.emit('stop_recording_session');
        
        toast({
          title: "Microphone Muted",
          description: "Voice analysis and recording paused",
          duration: 2000,
        });
      }
    } else {
      toast({
        title: "Connection Error",
        description: "Not connected to voice analysis server. Please make sure the backend is running.",
        variant: "destructive",
        duration: 3000,
      });
    }
  
    setIsMuted(!isMuted);
  }, [isMuted, isConnected, startRecording, stopRecording, toast, employeeSocket]);
  

  // Handle initial connection notification
  useEffect(() => {
    if (isConnected) {
      toast({
        title: "Voice Analysis Connected",
        description: "Real-time voice analysis is now available. Click the mic button to start.",
        duration: 3000,
      });
    }
  }, [isConnected, toast]);

  // Mock function to simulate emotion detection from transcript
  const analyzeTranscriptEmotion = (text: string, speaker: 'Agent' | 'Employee'): string => {
    const lowerText = text.toLowerCase();

    // Simple keyword-based emotion detection for demo
    if (lowerText.includes('frustrat') || lowerText.includes('slow') || lowerText.includes('problem') || lowerText.includes('trouble')) {
      return 'frustrated';
    }
    if (lowerText.includes('thank') || lowerText.includes('help') || lowerText.includes('assist') || lowerText.includes('hello')) {
      return 'happy';
    }
    if (lowerText.includes('understand') || lowerText.includes('troubleshoot') || lowerText.includes('started')) {
      return 'neutral';
    }

    return 'neutral';
  };

  // 🔥 ADD THIS FUNCTION AFTER analyzeTranscriptEmotion 🔥
  const fetchEmployeeDetails = async (assignedToSysId: string) => {
    if (!assignedToSysId) return;

    setEmployeeLoading(true);
    setEmployeeError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employee/${assignedToSysId}`);

      if (response.ok) {
        const data = await response.json();
        setEmployeeData(data.employee);
        setEmployeeError(null);
      } else {
        const errorData = await response.json();
        setEmployeeError(errorData.error || 'Failed to fetch employee details');
      }
    } catch (error: any) {
      setEmployeeError(error.message || 'Network error');
      console.error('Error fetching employee details:', error);
    } finally {
      setEmployeeLoading(false);
    }
  };

  // Enhanced simulation for real-time emotion detection from transcript
  useEffect(() => {
    if (isRecording) {
      // More realistic emotion sequence based on conversation flow
      const sampleEmotions = [
        { emotion: 'happy', speaker: 'agent' as const, delay: 1000 },
        { emotion: 'frustrated', speaker: 'customer' as const, delay: 3000 },
        { emotion: 'neutral', speaker: 'agent' as const, delay: 5000 },
        { emotion: 'satisfied', speaker: 'customer' as const, delay: 7000 },
        { emotion: 'happy', speaker: 'agent' as const, delay: 9000 },
        { emotion: 'neutral', speaker: 'customer' as const, delay: 11000 },
        // Additional emotions for longer conversation
        { emotion: 'annoyed', speaker: 'customer' as const, delay: 13000 },
        { emotion: 'optimism', speaker: 'agent' as const, delay: 15000 },
        { emotion: 'pleased', speaker: 'customer' as const, delay: 17000 },
      ];

      const timeouts = sampleEmotions.map(({ emotion, speaker, delay }) =>
        setTimeout(() => {
          addTranscriptEmotion(emotion, speaker);
          console.log(`Added emotion: ${emotion} for ${speaker}`);
        }, delay)
      );

      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [isRecording, addTranscriptEmotion]);

  // Dynamic KB articles state
  const [knowledgeArticles, setKnowledgeArticles] = useState<any[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);

  // Fetch KB articles when selectedTicket changes
  useEffect(() => {
    if (!selectedTicket || !selectedTicket.short_description) {
      setKnowledgeArticles([]);
      return;
    }
    setKbLoading(true);
    setKbError(null);
    console.log('[DEBUG] Fetching KB articles for searchTerm:', selectedTicket.short_description);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/kb_articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm: selectedTicket.short_description })
    })
      .then(res => res.json())
      .then(data => {
        if (data.articles) {
          // Map ServiceNow KB format to KnowledgeBasePanel format
          setKnowledgeArticles(data.articles.map((a: any, idx: number) => ({
            id: idx + 1,
            title: a.title || a.short_description || 'Untitled',
            content: a.content || a.text || '',
            category: a.category || 'General',
            sys_id: a.sys_id || ''
          })));
        } else {
          setKnowledgeArticles([]);
          setKbError(data.error || 'No articles found');
        }
      })
      .catch(err => {
        setKnowledgeArticles([]);
        setKbError('Error fetching KB articles');
      })
      .finally(() => setKbLoading(false));
  }, [selectedTicket]);

  const progressSteps = [
    { id: 'step1', label: 'Identity Verified', checked: true },
    { id: 'step2', label: 'Issue Identified', checked: true },
    { id: 'step3', label: 'Cause Analysis', checked: false },
    { id: 'step4', label: 'Solution Suggested', checked: false },
    { id: 'step5', label: 'Issue Fixed', checked: false },
  ];

  const previousCalls = [
    { id: 1, team: 'L1 Team', duration: '8 minutes' },
    { id: 2, team: 'Technical Support', duration: '15 minutes' }
  ];

  // Pending tickets state (fetched from backend)
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  // Map PendingTicket[] to TicketInfo[] for MiddleColumn
  const ticketInfoList: TicketInfo[] = useMemo(() => {
    return pendingTickets.map((t) => ({
      id: t.number,
      description: t.short_description,
      status: t.state,
      urgency: t.urgency,
      state: t.state,
      category: t.category,
      priority: t.priority,
      openedDate: t.opened_at,
      // ...spread t if you want all fields
      ...t,
    }));
  }, [pendingTickets]);

  const selectedTicketInfo: TicketInfo | null = useMemo(() => {
    if (!selectedTicket) return null;
    return {
      id: selectedTicket.number,
      description: selectedTicket.short_description,
      status: selectedTicket.state,
      urgency: selectedTicket.urgency,
      state: selectedTicket.state,
      category: selectedTicket.category,
      priority: selectedTicket.priority,
      openedDate: selectedTicket.opened_at,
      ...selectedTicket,
    };
  }, [selectedTicket]);

  // 🔥 REMOVE THE INITIAL TICKET FETCHING USEEFFECT 🔥

  // 🔥 ADD THIS useEffect AFTER THE TICKET FETCHING useEffect 🔥
  useEffect(() => {
    if (selectedTicket && (selectedTicket as any).assigned_to) {
      fetchEmployeeDetails((selectedTicket as any).assigned_to);
    } else {
      // Only clear employee info if no employee has been selected via search
      if (!lastSelectedEmployeeRef.current) {
        setEmployeeData({
          name: '',
          email: '',
          employeeId: ''
        });
      } else {
        setEmployeeData(lastSelectedEmployeeRef.current);
      }
      setEmployeeError(null);
    }
  }, [selectedTicket]);

  // Generate fixed time segments for sentiment analysis (only once)
  const generateFixedTimeSegments = () => {
    const emotions = ['positive', 'negative', 'neutral', 'silence'] as const;
    const timeSegments = [];

    // Create segments with proper timestamps (00:00, 00:30, 01:00, etc.)
    for (let i = 0; i < 5; i++) {
      const minutes = Math.floor(i / 2);
      const seconds = (i % 2) * 30;
      const time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const segments = [];
      let remainingPercentage = 100;

      // Create 2-4 segments for each time block
      const segmentCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < segmentCount; j++) {
        const isLast = j === segmentCount - 1;
        const duration = isLast ? remainingPercentage : Math.floor(remainingPercentage / (segmentCount - j));

        const emotion = emotions[Math.floor(j % emotions.length)];
        segments.push({ emotion, duration });
        remainingPercentage -= duration;
      }

      timeSegments.push({ time, segments });
    }

    return timeSegments;
  };

  // Use useMemo to ensure these are generated only once
  const agentTimeSegment = useMemo(() => generateFixedTimeSegments(), []);
  const customerTimeSegment = useMemo(() => generateFixedTimeSegments(), []);

  // Event handlers
  const handleEndCall = () => {
    stopRecording();
    toast({
      title: "Call Ended",
      description: "The call has been terminated",
      variant: "destructive",
    });
  };

  const handleSettings = () => {
    toast({
      title: "Settings",
      description: "Settings panel would open here",
    });
  };

  const handleFlag = () => {
    toast({
      title: "Call Flagged",
      description: "This call has been flagged for review",
    });
  };

  const handleToggleStep = (id: string, checked: boolean) => {
    toast({
      title: checked ? "Step Completed" : "Step Unchecked",
      description: `${id} has been ${checked ? 'marked as complete' : 'unmarked'}`,
    });
  };

  const handleCopyLink = (id: number) => {
    toast({
      title: "Link Copied",
      description: `Article #${id} link copied to clipboard`,
    });
  };

  const handleCopySuggestion = (suggestion: string) => {
    toast({
      title: "Response Copied",
      description: "Quick response copied to clipboard",
    });
  };

  const handleSaveNotes = (newNotes: string) => {
    setNotes(newNotes);
    toast({
      title: "Notes Saved",
      description: "Your notes have been saved",
    });
  };
  const handleCompleteCall = async () => {
    // Stop the timer and recording immediately
    setIsCallActive(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    stopRecording();
  
    // Stop backend recording session
    if (employeeSocket) {
      employeeSocket.emit('stop_recording_session');
    }
  
    // Stop audio streams immediately
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `call_${timestamp}`;
  
    // Send request to backend to generate and download files
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/generate_call_files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          //filename: filename,
          agentName: userName,
          ticketId: selectedTicket?.number || 'no-ticket'
        })
      });
  
      if (response.ok) {
        const result = await response.json();
        
       // Prepare files for operations
      const filesToDownload = [];
      const filesToUpload = [];
      
      if (result.files.transcript) {
        downloadFile(result.files.transcript);
        filesToDownload.push(result.files.transcript.filename);
        filesToUpload.push(result.files.transcript);
      }
      if (result.files.agent_audio) {
        downloadFile(result.files.agent_audio);
        filesToDownload.push(result.files.agent_audio.filename);
        filesToUpload.push(result.files.agent_audio);
      }
      if (result.files.employee_audio) {
        downloadFile(result.files.employee_audio);
        filesToDownload.push(result.files.employee_audio.filename);
        filesToUpload.push(result.files.employee_audio);
      }
      
      // Show initial success toast
      toast({
        title: "Files Downloaded",
        description: `Files downloaded: ${filesToDownload.join(', ')}`,
      });

// Upload to cloud storage for backup
if (filesToUpload.length > 0) {
  try {
    toast({
      title: "Backing Up Call Files",
      description: "Securely storing call recording and transcript...",
    });

    const uploadedFileUrls = await azureBlobStorageService.uploadFiles(filesToUpload);
    
    toast({
      title: "Files Backed Up Successfully",
      description: `Call files have been securely stored and are available for review`,
    });

    console.log('Cloud backup successful. File URLs:', uploadedFileUrls);
  } catch (uploadError) {
    console.error('Cloud backup failed:', uploadError);
    toast({
      title: "Backup Failed",
      description: "Files were downloaded locally but cloud backup failed. Please contact IT support if needed.",
      variant: "destructive",
    });
  }
}


      
    } else {
      throw new Error('Failed to generate call files');
    }
  } catch (error) {
    console.error('Error generating call files:', error);
    toast({
      title: "Error",
      description: "Failed to generate call files",
      variant: "destructive",
    });
  }
  
    // Continue with existing logic...
    setIssueComplexityLoading(true);
  
    // Calculate resolution time based on call duration
    const callStart = callStartTimestamp || Date.now();
    const callEnd = Date.now();
    const durationMinutes = Math.floor((callEnd - callStart) / (1000 * 60));
  
    let calculatedResolutionTime = "";
    if (durationMinutes <= 5) {
      calculatedResolutionTime = "Low";
    } else if (durationMinutes <= 10) {
      calculatedResolutionTime = "Medium";
    } else {
      calculatedResolutionTime = "High";
    }
  
    // Calculate overall risk level
    const agentNegCount = countAgentNegativeEmotions();
    const conversationText = getConversationText();
  
    let calculatedOverallRisk: 'Low Risk' | 'Medium Risk' | 'High Risk' = 'Low Risk';
  
    // Risk calculation logic
    if (riskLevel === 'High Risk' || agentNegCount >= 3) {
      calculatedOverallRisk = 'High Risk';
    } else if (riskLevel === 'Medium Risk' || agentNegCount >= 1) {
      calculatedOverallRisk = 'Medium Risk';
    } else {
      calculatedOverallRisk = 'Low Risk';
    }
  
    // Set the calculated values immediately
    setResolutionTime(calculatedResolutionTime);
    setOverallRiskLevel(calculatedOverallRisk);
    setCallCompleted(true);
  
    // Continue with existing complexity calculation...
    const complexityPromise = new Promise<string>((resolve) => {
      setTimeout(() => {
        const complexities = ['Low', 'Medium', 'High'];
        const randomComplexity = complexities[Math.floor(Math.random() * complexities.length)];
        resolve(randomComplexity);
      }, Math.random() * 8000 + 2000);
    });
  
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('Service Unable'), 10000);
    });
  
    try {
      const calculatedComplexity = await Promise.race([complexityPromise, timeoutPromise]);
      setIssueComplexity(calculatedComplexity);
    } catch (error) {
      setIssueComplexity('Service Unable');
    } finally {
      setIssueComplexityLoading(false);
    }
  
    // Freeze all data by capturing current state WITH calculated values
    const currentFrozenData = {
      pitchData: [...pitchData],
      energyData: [...energyData],
      speakingRateData: [...speakingRateData],
      transcriptEmotions: [...transcriptEmotions],
      employeeTranscriptEmotions: [...employeeTranscriptEmotions],
      emotion: emotion,
      callDuration: callDuration,
      progressValue: progressValue,
      resolutionTime: calculatedResolutionTime,
      overallRiskLevel: calculatedOverallRisk,
      issueComplexity: '',
    };
  
    setFrozenData(currentFrozenData);
    setIsCallCompleting(true);
    setFreezeStartTime(Date.now());
  
    toast({
      title: "Call Completed",
      description: "Calculating final metrics... Data will be frozen for 15 seconds, then reset",
    });
  
    // After 15 seconds, reset everything
    setTimeout(() => {
      resetEverything();
    }, 15000);
  };
  
  // Add this helper function for downloading files
  const downloadFile = (fileData: { filename: string; content: string; type: string }) => {
    try {
      // Decode base64 content
      const binaryContent = atob(fileData.content);
      const bytes = new Uint8Array(binaryContent.length);
      for (let i = 0; i < binaryContent.length; i++) {
        bytes[i] = binaryContent.charCodeAt(i);
      }
      
      // Create blob and download
      const blob = new Blob([bytes], { type: fileData.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', fileData.filename, error);
    }
  };
  

  // Add a reset function to clear all dashboard states when switching tickets
  const resetDashboardState = useCallback(() => {
    // Reset conversation/messages
    setNotes('');
    setCallDuration('00:00:00');
    setElapsedSeconds(0);
    setProgressValue(1);
    setIsMuted(true);
    setIsCallActive(true);
    setCallCompleted(false);
    setRiskLevel('Low Risk');
    setOverallRiskLevel('Low Risk');
    setResolutionTime('');
    setIssueComplexity('');
    setIssueComplexityLoading(false);
    setCallStartTimestamp(null);
    setEmployeeTranscriptEmotions([]);
    clearData(); // from useVoiceAnalysis, resets transcriptEmotions etc.
    setKnowledgeArticles([]);
    setKbError(null);
    setKbLoading(false);
    setTicketSwitchLoading(false);
    setKbArticlesLoading(false);
    // Optionally reset selectedEmployee if you want to clear employee info
    // setSelectedEmployee(null);
    // ...add any other resets as needed...
  }, [clearData]);

  const resetEverything = useCallback(() => {
    // Show loading message
    toast({
      title: "Resetting System",
      description: "Reloading dashboard...",
    });

    // Clear all states first
    setIsCallCompleting(false);
    setFreezeStartTime(null);
    setFrozenData(null);
    setCallCompleted(false);
    setFreezeCountdown(null); // Add this line

    // Stop all recordings and clear timers
    stopRecording();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

// Clear employee socket and audio streams with safety checks
if (audioProcessorRef.current) {
  audioProcessorRef.current.disconnect();
  audioProcessorRef.current = null;
}
if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
  audioContextRef.current.close();
  audioContextRef.current = null;
}
if (audioStreamRef.current) {
  audioStreamRef.current.getTracks().forEach((track) => track.stop());
  audioStreamRef.current = null;
}

    // Reset all dashboard states
    resetDashboardState();

    // After a brief delay, reload the page
    setTimeout(() => {
      try {
        window.location.reload();
      } catch (error) {
        console.error('Reload failed:', error);
        // Fallback: navigate to current path
        window.location.href = window.location.pathname;
      }
    }, 1500); // Increased delay to 1.5 seconds for better UX

  }, [stopRecording, toast, resetDashboardState]);

  const [overallRiskLevel, setOverallRiskLevel] = useState<'Low Risk' | 'Medium Risk' | 'High Risk'>('Low Risk');

  // Add this helper function after your state declarations
  const getDisplayData = useCallback(() => {
    if (isCallCompleting && frozenData) {
      return {
        pitchData: frozenData.pitchData,
        energyData: frozenData.energyData,
        speakingRateData: frozenData.speakingRateData,
        transcriptEmotions: frozenData.transcriptEmotions,
        employeeTranscriptEmotions: frozenData.employeeTranscriptEmotions,
        emotion: frozenData.emotion,
        callDuration: frozenData.callDuration,
        progressValue: frozenData.progressValue,
        // Use frozen calculated values if available, otherwise use current state
        resolutionTime: frozenData.resolutionTime || resolutionTime,
        overallRiskLevel: frozenData.overallRiskLevel || overallRiskLevel,
      };
    }
    return {
      pitchData,
      energyData,
      speakingRateData,
      transcriptEmotions,
      employeeTranscriptEmotions,
      emotion,
      callDuration,
      progressValue,
      resolutionTime,
      overallRiskLevel,
    };
  }, [isCallCompleting, frozenData, pitchData, energyData, speakingRateData, transcriptEmotions, employeeTranscriptEmotions, emotion, callDuration, progressValue, resolutionTime, overallRiskLevel]);

  const displayData = getDisplayData();

  // Utility to extract display name as per requirements
  const getDisplayName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 3) {
      return parts[1]; // middle name
    }
    if (parts.length === 2) {
      return parts[0]; // first name
    }
    return fullName;
  };

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const user = accounts[0];
        setUserName(user.name || ''); // Agent name (from SSO)
        setUserEmail(user.username || ''); // Agent email (from SSO)
      } else {
        setUserName('');
        setUserEmail('');
      }
    };
    fetchUserData();
  }, []);

  // 🔥 REPLACE THE HARDCODED callerProfile WITH DYNAMIC DATA 🔥
  const callerProfile = {
    name: employeeData.name,
    email: employeeData.email,
    employeeId: employeeData.employeeId,
    role: 'Customer',
    location: 'Unknown'
  };

  // Add logout handler for MSAL
  const handleLogout = () => {
    msalInstance.logoutRedirect();
  };

 

  // Setup Socket.IO connection for employee sentiment
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ['polling', 'websocket']
    });
    setEmployeeSocket(socket);

    socket.on("connect", () => setIsEmployeeSocketConnected(true));
    socket.on("disconnect", () => setIsEmployeeSocketConnected(false));

    // Listen for employee emotion results
    socket.on("audio_result", (data) => {
      if (data && data.speaker === "employee") {
        setEmployeeTranscriptEmotions((prev) => [
          ...prev,
          {
            emotion: data.emotion,
            timestamp: data.timestamp || new Date().toISOString(),
            speaker: "employee",
            text: data.transcript,
          },
        ]);
      }
    });

    return () => {
      socket.disconnect();
      setEmployeeSocket(null);
    };
  }, []);


  // Track connection for progress bar logic
  useEffect(() => {
    setIsPort7000Connected(isEmployeeSocketConnected);
  }, [isEmployeeSocketConnected]);

  // Audio capture and streaming for employee sentiment
  useEffect(() => {
    // Only start streaming if call is active and not muted
    if (!isCallActive || isMuted || !isEmployeeSocketConnected) {
      // Stop audio stream if running
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        audioProcessorRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      return;
    }

    let stopped = false;
    let processor: ScriptProcessorNode | null = null;
    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;

    const startAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);

        // 16000 Hz, 1 channel, 2048 samples per buffer
        processor = context.createScriptProcessor(4096, 1, 1);
        audioProcessorRef.current = processor;

        const SAMPLE_RATE = 16000;
        const BYTES_PER_SAMPLE = 2;

        // Resample to 16kHz if needed
        processor.onaudioprocess = (e) => {
          if (!employeeSocket || !isEmployeeSocketConnected || stopped) return;
          const input = e.inputBuffer.getChannelData(0);
          // Downsample to 16kHz
          let downsampled;
          if (context!.sampleRate !== SAMPLE_RATE) {
            const factor = context!.sampleRate / SAMPLE_RATE;
            downsampled = new Float32Array(Math.floor(input.length / factor));
            for (let i = 0; i < downsampled.length; i++) {
              downsampled[i] = input[Math.floor(i * factor)];
            }
          } else {
            downsampled = input;
          }
          // Convert to Int16 PCM
          const pcm = new Int16Array(downsampled.length);
          for (let i = 0; i < downsampled.length; i++) {
            let s = Math.max(-1, Math.min(1, downsampled[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          // Send as ArrayBuffer (not Buffer)
          // employeeSocket.emit("audio_chunk", pcm.buffer);
        };

        source.connect(processor);
        processor.connect(context.destination);
      } catch (err) {
        console.error("Microphone error:", err);
      }
    };

    startAudio();

    return () => {
      stopped = true;
      if (processor) processor.disconnect();
      if (context && context.state !== 'closed') context.close(); // ✅ Added safety check
      if (stream) stream.getTracks().forEach((track) => track.stop());
      audioProcessorRef.current = null;
      audioContextRef.current = null;
      audioStreamRef.current = null;
    };    
  }, [isCallActive, isMuted, isEmployeeSocketConnected, employeeSocket]);

  // Progress bar logic: only increment if both ports are connected and call is unmuted/active
  useEffect(() => {
    let interval: number | undefined;
    if (
      isCallActive &&
      !isMuted &&
      isConnected && // port 5000
      isPort7000Connected // port 7000
    ) {
      interval = window.setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= 420) return 420;
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isCallActive, isMuted, isConnected, isPort7000Connected]);

  // Update progressValue based on elapsedSeconds
  useEffect(() => {
    // 1% at start, 100% at 420 seconds (7 min)
    const progress = Math.min(1 + (elapsedSeconds / 420) * 99, 100);
    setProgressValue(progress);
  }, [elapsedSeconds]);

  // Reset progress if call is ended or muted
  useEffect(() => {
    if (!isCallActive || isMuted) {
      setElapsedSeconds((prev) => prev); // Pause, do not reset
    }
  }, [isCallActive, isMuted]);

  // Calculate Escalation Risk based on agent and employee/customer sentiments
  useEffect(() => {
    // Rolling window: last 5 segments (approx 1-2 minutes)
    const windowSize = 5;

    // Helper to get last N emotions for a speaker
    const getLastEmotions = (arr: any[], speaker: string) =>
      arr.filter(e => e.speaker === speaker).slice(-windowSize).map(e => (e.emotion || '').toLowerCase());

    const agentEmotions = getLastEmotions(transcriptEmotions, 'agent');
    const employeeEmotions = getLastEmotions(
      (Array.isArray(employeeTranscriptEmotions) ? employeeTranscriptEmotions : []),
      'employee'
    );

    // Count positives and negatives
    const positiveList = [
      "admiration", "amusement", "approval", "caring", "desire", "excitement", "gratitude", "joy", "love", "optimism", "pride", "relief", "happy", "satisfied", "pleased"
    ];
    const negativeList = [
      "anger", "annoyance", "confusion", "disappointment", "disapproval", "disgust", "embarrassment", "fear", "grief", "nervousness", "remorse", "sadness", "frustrated", "annoyed"
    ];

    const agentNeg = agentEmotions.filter(e => negativeList.includes(e)).length;
    const agentPos = agentEmotions.filter(e => positiveList.includes(e)).length;
    const employeeNeg = employeeEmotions.filter(e => negativeList.includes(e)).length;
    const employeePos = employeeEmotions.filter(e => positiveList.includes(e)).length;

    // Trend: check if employee sentiment is getting worse (last 3)
    const employeeTrend = employeeEmotions.slice(-3);
    const trendWorse = employeeTrend.length === 3 &&
      negativeList.includes(employeeTrend[2]) &&
      (employeeTrend[0] === "positive" || employeeTrend[0] === "neutral") &&
      (employeeTrend[1] === "neutral" || negativeList.includes(employeeTrend[1]));

    // Heuristic mapping
    let newRisk: 'Low Risk' | 'Medium Risk' | 'High Risk' = 'Low Risk';

    if (
      (employeeNeg >= 2 && employeePos === 0 && agentPos === 0) ||
      (agentNeg + employeeNeg >= 3 && agentPos === 0 && employeePos === 0)
    ) {
      newRisk = 'Medium Risk';
    }
    if (
      (employeeNeg >= 3 && agentNeg >= 1) ||
      (employeeNeg >= 2 && agentEmotions.every(e => e === "neutral")) ||
      trendWorse
    ) {
      newRisk = 'High Risk';
    }
    if (
      agentNeg === 0 && employeeNeg === 0 &&
      (agentPos > 0 || employeePos > 0)
    ) {
      newRisk = 'Low Risk';
    }

    setRiskLevel(newRisk);
  }, [transcriptEmotions, employeeTranscriptEmotions]);

  // Compute customerTone from latest employee emotion (from port 7000)
  const customerTone = useMemo(() => {
    if (!employeeTranscriptEmotions || employeeTranscriptEmotions.length === 0) return "Neutral";
    // Take the last employee emotion
    const last = employeeTranscriptEmotions.filter(e => e.speaker === "employee").slice(-1)[0];
    if (!last) return "Neutral";
    // Map go_emotions to positive/negative/neutral
    const positive = [
      "admiration", "amusement", "approval", "caring", "desire", "excitement", "gratitude", "joy", "love", "optimism", "pride", "relief", "happy", "satisfied", "pleased"
    ];
    const negative = [
      "anger", "annoyance", "confusion", "disappointment", "disapproval", "disgust", "embarrassment", "fear", "grief", "nervousness", "remorse", "sadness", "frustrated", "annoyed"
    ];
    const e = (last.emotion || "").toLowerCase();
    if (positive.includes(e)) return "Positive";
    if (negative.includes(e)) return "Negative";
    return "Neutral";
  }, [employeeTranscriptEmotions]);

  // Track call start time when call becomes active
  useEffect(() => {
    if (isCallActive && callStartTimestamp === null) {
      setCallStartTimestamp(Date.now());
    }
    // Reset callStartTimestamp if call is reset
    if (!isCallActive && callStartTimestamp !== null) {
      // do not reset here, only set on new call
    }
  }, [isCallActive, callStartTimestamp]);

  // Helper to combine agent and employee conversation for severity prediction
  const getConversationText = () => {
    // Combine transcriptEmotions (agent) and employeeTranscriptEmotions (employee)
    const agentLines = transcriptEmotions
      .filter(e => e.speaker === "agent" && e.text && e.text.trim() !== "")
      .map(e => `Agent: ${e.text}`);
    const employeeLines = (employeeTranscriptEmotions || [])
      .filter(e => e.speaker === "employee" && e.text && e.text.trim() !== "")
      .map(e => `Employee: ${e.text}`);
    // Interleave by timestamp order if possible, else just concatenate
    const allLines = [...agentLines, ...employeeLines].sort((a, b) => {
      // Try to sort by timestamp if available
      const getTime = (line: string) => {
        // Extract timestamp from original objects if needed
        // Not strictly necessary, as order is usually fine
        return 0;
      };
      return getTime(a) - getTime(b);
    });
    return allLines.join('\n');
  };

  // 🔥 Add these states for employee search and ticket workflow
  const [selectedEmployee, setSelectedEmployee] = useState<{
    email: string;
    employee_number: string;
    name: string;
  } | null>(null);

  // Add a ref to track the last selected employee to avoid clearing employee info after ticket selection
  const lastSelectedEmployeeRef = useRef<{ name: string; email: string; employeeId: string } | null>(null);

  // Update handleEmployeeSelect to set the ref
  const handleEmployeeSelect = async (employee: {
    email: string;
    employee_number: string;
    name: string;
  }) => {
    setEmployeeLoading(true);
    const empData = {
      name: employee.name,
      email: employee.email,
      employeeId: employee.employee_number
    };
    setEmployeeData(empData);
    lastSelectedEmployeeRef.current = empData;
    setSelectedEmployee(employee);
    await fetchTicketsForEmployee(employee.email);
    setEmployeeLoading(false);
  };

  // Fetch tickets for selected employee
  const fetchTicketsForEmployee = async (email: string) => {
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/pending-tickets?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        // Use the backend ticket structure directly
        const mappedTickets: PendingTicket[] = (Array.isArray(data) ? data : []);
        setPendingTickets(mappedTickets);
        if (mappedTickets.length > 0) {
          setSelectedTicket(mappedTickets[0]);
        } else {
          setSelectedTicket(null);
        }
      } else {
        const errorData = await response.json();
        setTicketsError(errorData.error || 'Failed to fetch tickets');
        setPendingTickets([]);
        setSelectedTicket(null);
      }
    } catch (error: any) {
      setTicketsError(error.message || 'Network error');
      setPendingTickets([]);
      setSelectedTicket(null);
    } finally {
      setTicketsLoading(false);
    }
  };

  // Add state for overall risk level

  const [callCompleted, setCallCompleted] = useState(false);

  // Computed risk level that both AgentHeader and RiskPanel should use
  const currentRiskLevel = callCompleted ? overallRiskLevel : riskLevel;

  // Utility: Count negative agent emotions
  const countAgentNegativeEmotions = () => {
    const negativeList = [
      "anger", "annoyance", "confusion", "disappointment", "disapproval", "disgust", "embarrassment", "fear", "grief", "nervousness", "remorse", "sadness", "frustrated", "annoyed"
    ];
    return transcriptEmotions.filter(
      e => e.speaker === "agent" && negativeList.includes((e.emotion || '').toLowerCase())
    ).length;
  };

  // New state to manage ticket switching
  const [switchingTicket, setSwitchingTicket] = useState(false);
  const [ticketSwitchLoading, setTicketSwitchLoading] = useState(false);
  const [kbArticlesLoading, setKbArticlesLoading] = useState(false);



  // Handler for selecting a ticket and resetting dashboard state
  const handleTicketSelect = useCallback(
    async (ticket: PendingTicket | null) => {
      if (ticket && ticket.number !== selectedTicket?.number) {
        setTicketSwitchLoading(true);
        setSwitchingTicket(true);
        resetDashboardState();
        setSelectedTicket(ticket);
        await new Promise(resolve => setTimeout(resolve, 800));
        setTicketSwitchLoading(false);
        setSwitchingTicket(false);
      } else if (!ticket) {
        setSelectedTicket(null);
      }
    },
    [resetDashboardState, selectedTicket]
  );

  return (
    <>
      <CommonHeader />
      <div className="pt-16">
        {/* Enhanced Loading overlay when switching tickets */}
        {(switchingTicket || ticketSwitchLoading) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md w-full mx-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Switching Ticket
                  </h3>
                  <p className="text-gray-600">
                    Loading ticket {selectedTicket?.number}...
                  </p>
                  <div className="mt-3 flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Freeze Overlay - Fixed positioning */}
        {isCallCompleting && freezeCountdown !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40 pointer-events-none">
            <div className="bg-white rounded-lg p-6 shadow-xl border">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-700 font-medium">
                  Data frozen - Resetting in {freezeCountdown} seconds...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* KB Articles loading overlay - Fixed positioning */}
        {kbArticlesLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-30">
            <div className="bg-white rounded-lg p-6 shadow-xl border flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 font-medium">Loading KB Articles...</span>
            </div>
          </div>
        )}


        <DashboardLayout
          agentName={userName}
          ticketId={selectedTicket?.number || "No Ticket Selected"}
          callDuration={callDuration}
          riskLevel={currentRiskLevel}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onEndCall={handleEndCall}
          onSettings={handleSettings}
          onFlag={handleFlag}
          onLogout={handleLogout}
          freezeCountdown={freezeCountdown}
          onStopRecording={() => {
            // Always stop recording when switching tickets, regardless of current mute state
            if (!isMuted) {
              // If currently unmuted, mute it (this will stop recording)
              handleToggleMute();
            }
            // If already muted, we still want to ensure recording is actually stopped
            stopRecording(); // Call the socket stop directly
            console.log('Ticket switch - ensuring recording is stopped');
          }}
        >
          <LeftColumn
            agentProfile={{
              name: employeeData.name || "",
              email: employeeData.email || "",
              employeeId: employeeData.employeeId || "",
              role: 'Customer',
              location: 'Unknown'
            }}
            progressSteps={progressSteps}
            sentimentScore={75}
            previousCalls={previousCalls}
            pendingTickets={pendingTickets}
            notes={notes}
            onToggleStep={handleToggleStep}
            onSaveNotes={handleSaveNotes}
            ticketsLoading={ticketsLoading}
            ticketsError={ticketsError}
            onSelectTicket={handleTicketSelect}
            selectedTicketId={selectedTicket?.number}
            onSelectKbArticles={handleSelectKbArticles}
            employeeLoading={employeeLoading}
            employeeError={employeeError}
            onEmployeeSelect={handleEmployeeSelect}
            riskLevel={currentRiskLevel}
            riskLabel={callCompleted ? "Overall Risk" : "Risk Level"}
            customerTone={customerTone}
            issueComplexity={issueComplexity}
            issueComplexityLoading={issueComplexityLoading}
            resolutionTime={resolutionTime}
            progressValue={progressValue}
          />

          <MiddleColumn
            pitchData={displayData.pitchData}
            energyData={displayData.energyData}
            speakingRateData={displayData.speakingRateData}
            emotion={displayData.emotion}
            transcriptEmotions={
              displayData.transcriptEmotions.length === 0
                ? [{
                  emotion: "neutral",
                  timestamp: new Date().toISOString().slice(11, 19),
                  speaker: "agent",
                  text: "Waiting for the Agent..."
                }]
                : displayData.transcriptEmotions
            }
            suggestions={quickResponses}
            onCopySuggestion={handleCopySuggestion}
            pendingTickets={ticketInfoList}
            selectedTicket={selectedTicketInfo}
            employeeTranscriptEmotions={
              displayData.employeeTranscriptEmotions.length === 0
                ? [{
                  emotion: "neutral",
                  timestamp: new Date().toISOString().slice(11, 19),
                  speaker: "employee",
                  text: "Waiting for the Employee..."
                }]
                : displayData.employeeTranscriptEmotions
            }
            articles={knowledgeArticles}
            onCopyLink={handleCopyLink}
          />


          <RightColumn
            messages={messages}
            riskLevel={riskLevel}
            customerTone={customerTone}
            issueComplexity={issueComplexity}
            issueComplexityLoading={issueComplexityLoading}
            resolutionTime={resolutionTime}
            progressValue={progressValue}
            articles={knowledgeArticles}
            onCopyLink={handleCopyLink}
            onCompleteCall={handleCompleteCall}
            selectedTicket={selectedTicket}
          // summaryLoading will be handled inside TranscriptPanel
          />
        </DashboardLayout>
        {/* Optionally, display the overall risk level */}
        {/* <div className="fixed bottom-20 right-4 bg-white border px-4 py-2 rounded shadow text-sm">
          Overall Risk Level: <span className="font-bold">{overallRiskLevel}</span>
        </div> */}
      </div>
      <FloatingFooter />
    </>
  );
};

export default Index;