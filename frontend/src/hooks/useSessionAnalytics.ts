import { useMemo } from "react";
import type { SavedPracticeSessionSummary } from "../lib/api";

export type SessionAnalytics = {
  totalSessions: number;
  averageScore: number | null;
  bestScore: number | null;
  latestScore: number | null;
  averageWpm: number | null;
  averageFillerRate: number | null; // fillers per minute
  averageCameraFacing: number | null;
  modeCounts: Record<string, number>;
  mostRecentMode: string | null;
  scoreTrend: Array<{ date: string; score: number }>;
  metricTrends: Array<{ date: string; wpm: number; camera: number; filler: number }>;
};

export function useSessionAnalytics(sessions: SavedPracticeSessionSummary[]): SessionAnalytics {
  return useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: null,
        bestScore: null,
        latestScore: null,
        averageWpm: null,
        averageFillerRate: null,
        averageCameraFacing: null,
        modeCounts: {},
        mostRecentMode: null,
        scoreTrend: [],
        metricTrends: [],
      };
    }

    // Sessions from API might be newest first or oldest first. Let's sort oldest to newest for trends.
    const sortedOldestToNewest = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const sortedNewestToOldest = [...sortedOldestToNewest].reverse();

    const totalSessions = sessions.length;
    
    let totalScore = 0;
    let scoreCount = 0;
    let bestScore = -1;
    
    let totalWpm = 0;
    let wpmCount = 0;
    
    let totalCamera = 0;
    let cameraCount = 0;
    
    let totalFillers = 0;
    let totalDurationMinutes = 0;

    const modeCounts: Record<string, number> = {};

    const scoreTrend: Array<{ date: string; score: number }> = [];
    const metricTrends: Array<{ date: string; wpm: number; camera: number; filler: number }> = [];

    for (const session of sortedOldestToNewest) {
      // mode counts
      modeCounts[session.mode] = (modeCounts[session.mode] || 0) + 1;

      const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric' 
      });

      // scores
      if (session.overallScore !== null) {
        totalScore += session.overallScore;
        scoreCount++;
        if (session.overallScore > bestScore) {
          bestScore = session.overallScore;
        }
        scoreTrend.push({ date: dateStr, score: session.overallScore });
      }

      // metrics
      if (session.wordsPerMinute !== null) {
        totalWpm += session.wordsPerMinute;
        wpmCount++;
      }
      
      if (session.cameraFacingScore !== null) {
        totalCamera += session.cameraFacingScore;
        cameraCount++;
      }

      totalFillers += session.fillerWordCount;
      totalDurationMinutes += session.durationSeconds / 60;
      
      metricTrends.push({
        date: dateStr,
        wpm: session.wordsPerMinute ?? 0,
        camera: session.cameraFacingScore ?? 0,
        filler: session.durationSeconds > 0 ? (session.fillerWordCount / (session.durationSeconds / 60)) : 0,
      });
    }

    const latestScore = sortedNewestToOldest.find((s) => s.overallScore !== null)?.overallScore ?? null;
    const mostRecentMode = sortedNewestToOldest[0]?.mode ?? null;

    return {
      totalSessions,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : null,
      bestScore: bestScore >= 0 ? bestScore : null,
      latestScore,
      averageWpm: wpmCount > 0 ? Math.round(totalWpm / wpmCount) : null,
      averageFillerRate: totalDurationMinutes > 0 ? Number((totalFillers / totalDurationMinutes).toFixed(1)) : null,
      averageCameraFacing: cameraCount > 0 ? Math.round(totalCamera / cameraCount) : null,
      modeCounts,
      mostRecentMode,
      scoreTrend,
      metricTrends,
    };
  }, [sessions]);
}
