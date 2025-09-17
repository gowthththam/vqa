import React from 'react';
import AgentHeader from '@/components/dashboard/AgentHeader';

interface DashboardLayoutProps {
  agentName: string;
  ticketId: string;
  callDuration: string;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onSettings: () => void;
  onFlag: () => void;
  onLogout: () => void; 
  children: React.ReactNode;
  onStopRecording?: () => void;
  freezeCountdown?: number | null;
}

const HEADER_HEIGHT = 64; // Adjust this value to match your actual header height

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  agentName,
  ticketId,
  callDuration,
  riskLevel,
  isMuted,
  onToggleMute,
  onEndCall,
  onSettings,
  onFlag,
  onLogout,
  children,
  onStopRecording,
  freezeCountdown,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header - Fixed height */}
      <AgentHeader
        agentName={agentName}
        agentNameFull={agentName}
        ticketId={ticketId}
        riskLevel={riskLevel}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onEndCall={() => {}} // Empty function since end call button is removed
        onSettings={onSettings}
        onFlag={onFlag}
        onLogout={onLogout}
        onStopRecording={onStopRecording}
        freezeCountdown={freezeCountdown} 
      />

      {/* Content area below header with constrained height */}
      <div 
        className="flex-grow overflow-hidden"
        style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
      >
        <div className="h-full grid grid-cols-12 gap-4 p-4 relative overflow-hidden">
          {children}

          {/* Voice Analysis Status Indicator */}
          {!isMuted && (
            <div className="absolute bottom-4 right-4 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 animate-pulse z-10">
              <span className="h-2 w-2 bg-green-500 rounded-full inline-block"></span>
              Voice Analysis Active
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;