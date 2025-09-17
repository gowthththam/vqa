import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  Tooltip
} from 'recharts';

interface VoiceAnalysisGraphsProps {
  pitchData: Array<{ time: string; value: number }>;
  energyData: Array<{ time: string; value: number }>;
  speakingRateData: Array<{ time: string; value: number }>;
  emotion: string;
}

const VoiceAnalysisGraphs: React.FC<VoiceAnalysisGraphsProps> = ({
  pitchData,
  energyData,
  speakingRateData,
  emotion
}) => {
  // Fixed normalization function that preserves true zeros
  const normalize = (values: number[], minTarget: number, maxTarget: number) => {
    // Filter out zeros for normalization calculation
    const nonZeroValues = values.filter(v => v > 0.001);
    
    if (nonZeroValues.length === 0) {
      return values.map(() => 0); // All zeros case
    }
    
    const min = Math.min(...nonZeroValues);
    const max = Math.max(...nonZeroValues);
    
    return values.map(value => {
      if (value <= 0.001) return 0; // Preserve zeros/silence
      return ((value - min) / (max - min + 1e-6)) * (maxTarget - minTarget) + minTarget;
    });
  };

  const smoothData = (data: Array<{ time: string; value: number }>) => {
    return data.map((point, index, arr) => {
      // Don't smooth zero values (silence periods)
      if (point.value <= 0.001) return { ...point, value: 0 };
      
      const window = arr.slice(Math.max(index - 2, 0), Math.min(index + 3, arr.length));
      const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;
      return { ...point, value: Math.round(avg) };
    });
  };

  // Normalize pitch data with zero preservation (data already multiplied by 2)
  const rawPitchValues = pitchData.map(p => p.value);
  const normPitchValues = normalize(rawPitchValues, 50, 400);
  const adjustedPitchData = pitchData.map((p, i) => ({ 
    time: p.time, 
    value: p.value <= 0.001 ? 0 : normPitchValues[i] 
  }));

  // Normalize energy data with zero preservation (data already multiplied by 2)
  const rawEnergyValues = energyData.map(p => p.value);
  const normEnergyValues = normalize(rawEnergyValues, 0, 6);
  const processedEnergyData = energyData.map((p, i) => ({ 
    time: p.time, 
    value: p.value <= 0.001 ? 0 : normEnergyValues[i] 
  }));
  const smoothedEnergyData = smoothData(processedEnergyData);

  // Normalize speaking rate data with zero preservation (data already multiplied by 2)
  const rawSpeakingRateValues = speakingRateData.map(p => p.value);
  const normSpeakingRateValues = normalize(rawSpeakingRateValues, 50, 250);
  const processedSpeakingRateData = speakingRateData.map((p, i) => ({ 
    time: p.time, 
    value: p.value <= 0.001 ? 0 : normSpeakingRateValues[i] 
  }));
  const smoothedSpeakingRateData = smoothData(processedSpeakingRateData);

  const renderGraph = (
    title: string,
    data: Array<{ time: string; value: number }> = [],
    color: string,
    threshold: number,
    unit: string,
    yMax: number
  ) => (
    <div className="h-[150px] relative">
      <h4 className="text-sm font-medium mb-1">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9 }}
            label={{ value: 'Time (frames)', position: 'insideBottom', offset: 0, fontSize: 10 }}
            interval={Math.floor(data.length / 5) || 1}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 9 }}
            label={{ value: unit, angle: -90, position: 'outsideLeft', fontSize: 10 }}
          />
          <Tooltip formatter={(value) => [`${value}`, title]} labelFormatter={(label) => `Frame: ${label}`} />
          <ReferenceLine
            y={threshold}
            stroke="red"
            strokeDasharray="5 3"
            label={{ position: 'right', value: 'Intensity Threshold', fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          {data.length > 0 && (
            <ReferenceDot
              x={data[data.length - 1].time}
              y={data[data.length - 1].value}
              r={4}
              fill={color}
              stroke={color}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute top-7 right-2 bg-white/70 px-1.5 py-0.5 rounded text-xs font-medium">
        Score: {data.length > 0 ? data[data.length - 1].value.toFixed(1) : '0.0'}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-md border border-gray-200 p-4">
      <h3
        className="mb-2 text-center px-2 py-1 text-lg font-semibold text-gray-800"
        style={{ letterSpacing: '0.01em', background: 'none', border: 'none', borderRadius: 0, boxShadow: 'none' }}
      >
        <span className="text-gray-800">Real Time Voice Analysis</span>
        <span className="mx-2 text-gray-400 font-normal">|</span>
        <span className="text-green-700 font-medium">Detected Emotion: {emotion}</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3 flex flex-col items-stretch">
          {renderGraph('Pitch', adjustedPitchData, '#33C3F0', 300, 'Pitch (Hz)', 400)}
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3 flex flex-col items-stretch">
          {renderGraph('Energy', smoothedEnergyData, '#FFC107', 4.5, 'Energy (norm)', 6)}
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3 flex flex-col items-stretch">
          {renderGraph('Speaking Rate (WPM)', smoothedSpeakingRateData, '#4CAF50', 160, 'Speaking Rate (WPM)', 250)}
        </div>
      </div>
    </div>
  );
};

export default VoiceAnalysisGraphs;