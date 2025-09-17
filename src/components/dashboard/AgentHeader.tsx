import React, { useState, useEffect, useRef } from 'react';
import { Flag, Mic, MicOff, Settings, LogOut, User } from 'lucide-react';
import SiriLogoAnimated from './SiriLogoAnimated';
import { Badge } from "@/components/ui/badge";

interface AgentHeaderProps {
  agentName: string;
  agentNameFull?: string;
  ticketId?: string;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onSettings: () => void;
  onFlag: () => void;
  onLogout: () => void;
  // Add this new prop to handle actual recording stop
  onStopRecording?: () => void;
  freezeCountdown?: number | null;
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'Low Risk':
      return 'bg-green-200 text-black';
    case 'Medium Risk':
      return 'bg-risk-medium text-black';
    case 'High Risk':
      return 'bg-risk-high text-white';
    default:
      return 'bg-green-200 text-black';
  }
};

const AgentHeader: React.FC<AgentHeaderProps> = ({
  agentName,
  agentNameFull = '',
  ticketId,
  riskLevel,
  isMuted,
  onToggleMute,
  onSettings,
  onFlag,
  onLogout,
  onStopRecording,
  freezeCountdown
}) => {
  const [showAgent, setShowAgent] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousTicketId = useRef<string | undefined>(ticketId);

  // Reset timer and ACTUALLY stop recording when ticket changes
  useEffect(() => {
    if (previousTicketId.current !== ticketId && ticketId && ticketId !== "No Ticket Selected") {
      setSeconds(0); // Reset timer
      
      // Actually stop recording by calling the socket emit
      if (onStopRecording) {
        onStopRecording();
      }
      
      // Then update UI to muted state
      if (!isMuted) {
        onToggleMute(); // This will set isMuted to true in the UI
      }
      
      previousTicketId.current = ticketId;
    }
  }, [ticketId, onToggleMute, isMuted, onStopRecording]);

  // Timer effect: only run when not muted
  useEffect(() => {
    if (!isMuted) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMuted]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full flex justify-between items-center px-4 py-3 bg-white shadow">
      <div className="flex items-center space-x-4">
        <h2 className="font-normal text-2xl tracking-normal flex items-center gap-2" style={{ fontFamily: 'Segoe UI, Inter, Roboto, Arial, sans-serif', letterSpacing: '0.01em' }}>
          {/* <SiriLogoAnimated size={32} />
          <span className="text-[#0084FF]" style={{ fontFamily: 'inherit', fontWeight: 500, textTransform: 'capitalize' }}>auralytix</span> */}
          {ticketId && ticketId !== "No Ticket Selected" && (
            <span className="ml-3 text-base font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
              {ticketId}
            </span>
          )}
        </h2>
        <div className="flex items-center space-x-1">
  {freezeCountdown !== null ? (
    <span className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
      Freezing: {freezeCountdown}s
    </span>
  ) : (
    <span className="text-sm font-medium">{formatTime(seconds)}</span>
  )}
</div>

        <Badge className={`px-3 py-1 ${getRiskColor(riskLevel)}`}>
          <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-current"></span>
          {riskLevel}
        </Badge>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          {/* <button
            className="p-2 hover:bg-blue-100 rounded-full border border-blue-300"
            title="Show Agent Info"
            onClick={() => setShowAgent(v => !v)}
          >
            <User className="w-5 h-5 text-blue-600" />
          </button>
          {showAgent && (
            <div className="absolute right-0 mt-2 z-40 bg-white border border-gray-200 rounded shadow-lg min-w-[220px] p-4 flex flex-col items-center animate-fade-in">
              <User className="w-8 h-8 text-blue-600 mb-1" />
              <div className="font-semibold text-base text-gray-800 mb-1">Agent Name</div>
              <div className="text-sm text-gray-700 mb-1">{agentNameFull || 'N/A'}</div>
            </div>
          )} */}
        </div>
        <button
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${isMuted ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
          onClick={onToggleMute}
        >
          {isMuted ?
            <>
              <MicOff className="w-4 h-4" />
              <span className="text-sm font-medium">Muted</span>
            </> :
            <>
              <Mic className="w-4 h-4" />
              <span className="text-sm font-medium">Live</span>
            </>
          }
        </button>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-semibold"
          onClick={() => window.open('http://localhost:5000/', '_blank')}
          title="Post call analysis"
        >
          <span className="text-sm font-medium">Post call analysis</span>
        </button>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-semibold"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AgentHeader;
