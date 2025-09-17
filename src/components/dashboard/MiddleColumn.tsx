import React from 'react';
import KnowledgeBasePanel from '@/components/dashboard/KnowledgeBasePanel';
import VoiceAnalysisGraphs from '@/components/dashboard/VoiceAnalysisGraphs';
import TimeAnalysis from '@/components/dashboard/TimeAnalysis';

interface MiddleColumnProps {
  pitchData: Array<{ time: string; value: number }>;
  energyData: Array<{ time: string; value: number }>;
  speakingRateData: Array<{ time: string; value: number }>;
  emotion: string;
  transcriptEmotions: Array<{
    emotion: string;
    timestamp: string;
    speaker: 'agent' | 'customer';
  }>;
  employeeTranscriptEmotions?: Array<{
    emotion: string;
    timestamp: string;
    speaker: 'agent' | 'customer' | 'employee';
    text?: string;
  }>;
  suggestions: string[];
  onCopySuggestion: (suggestion: string) => void;
  isMuted?: boolean;
  pendingTickets: TicketInfo[];
  selectedTicket: TicketInfo | null;
}

interface TicketInfo {
  id: string;
  description: string;
  urgency?: string;
}

const MiddleColumn: React.FC<MiddleColumnProps & { articles?: any[]; onCopyLink?: (id: number) => void }> = ({
  pitchData,
  energyData,
  speakingRateData,
  emotion,
  transcriptEmotions,
  employeeTranscriptEmotions = [],
  suggestions,
  onCopySuggestion,
  isMuted = false,
  pendingTickets = [],
  selectedTicket,
  articles = [],
  onCopyLink = () => {}
}) => {
  // Ensure status is a valid value for CallSummary component
  const getValidStatus = (status: string): 'Resolved' | 'In Progress' | 'Requires Escalation' => {
    switch (status) {
      case 'Resolved':
      case 'In Progress':
      case 'Requires Escalation':
        return status as 'Resolved' | 'In Progress' | 'Requires Escalation';
      default:
        return 'In Progress'; // Default fallback
    }
  };

  return (
    <div className="col-span-7 h-full flex flex-col space-y-4">
      {/* Voice Analysis Graphs - Fixed height */}
      <div className="flex-shrink-0">
        <VoiceAnalysisGraphs 
          pitchData={pitchData}
          energyData={energyData}
          speakingRateData={speakingRateData}
          emotion={emotion}
        />
      </div>

      {/* Live Sentiment Analysis Gantt Charts - Fixed height */}
      <div className="grid grid-cols-2 gap-4 flex-shrink-0">
        <TimeAnalysis 
          title="Agent Sentiment Analysis" 
          emotionData={transcriptEmotions}
          isLive={true}
          isMuted={isMuted}
        />
        <TimeAnalysis 
          title="Employee Sentiment Analysis" 
          emotionData={
            employeeTranscriptEmotions
              .filter(e => e.speaker === "employee")
              .map(e => ({
                ...e,
                speaker: "customer" as "customer" // Cast to satisfy TimeAnalysis
              }))
          }
          isLive={true}
          isMuted={isMuted}
        />
      </div>

 {/* Knowledge Base Panel - Ensure proper height constraint */}
<div className="flex-1 min-h-0 overflow-hidden">
  <KnowledgeBasePanel 
    articles={articles}
    onCopyLink={onCopyLink}
  />
</div>


      {/* Ticket Information Module */}
      {/* <TicketInformation ticket={selectedTicket} /> */}
    </div>
  );
};

export default MiddleColumn;