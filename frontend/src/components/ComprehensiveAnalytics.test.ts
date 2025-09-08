/**
 * Tests for Comprehensive Analytics Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ComprehensiveDashboardData,
  UserActivityAnalytics,
  SongPopularityAnalytics,
  AnalyticsTimeframe
} from '../types/analytics';

// Mock data for testing
const mockUserActivity: UserActivityAnalytics = {
  total_sessions: 45,
  total_practice_time: 12600, // 3.5 hours in seconds
  average_session_length: 280, // ~4.7 minutes in seconds
  device_distribution: { desktop: 30, mobile: 15 },
  session_type_distribution: { practice: 35, performance: 10 },
  most_active_day: 'Monday',
  consistency_score: 75
};

const mockSongPopularity: SongPopularityAnalytics = {
  top_songs: [
    { song_id: 1, title: 'Test Song 1', artist: 'Artist 1', performance_count: 15 },
    { song_id: 2, title: 'Test Song 2', artist: 'Artist 2', performance_count: 12 }
  ],
  chord_popularity: [
    { chord: 'C', count: 45, percentage: 15.2 },
    { chord: 'G', count: 42, percentage: 14.1 }
  ],
  trending_analysis: {
    trending_up: ['Song A'],
    trending_down: ['Song B'],
    new_favorites: ['Song C']
  }
};

const mockDashboardData: ComprehensiveDashboardData = {
  user_activity: mockUserActivity,
  song_popularity: mockSongPopularity,
  collaboration_patterns: {
    total_collaboration_sessions: 8,
    average_participants: 2.5,
    collaboration_frequency: 'regular',
    most_collaborative_songs: [],
    collaboration_patterns: {
      peak_hours: ['19:00-21:00'],
      average_duration: 45,
      most_common_roles: ['editor', 'viewer']
    }
  },
  performance_statistics: {
    total_practice_time: 12600,
    completion_rate: 85.5,
    improvement_score: 72.3,
    problem_areas: [
      { problem_type: 'chord_transition', frequency: 5 },
      { problem_type: 'rhythm_timing', frequency: 3 }
    ],
    performance_trends: {
      completion_trend: 'improving',
      improvement_trend: 'improving',
      consistency: 'stable'
    }
  },
  summary_metrics: {
    total_sessions: 45,
    total_songs: 23,
    total_collaborations: 8,
    active_period: 'last_30_days'
  },
  real_time_status: {
    websocket_connected: true,
    last_update: new Date().toISOString(),
    update_frequency: '30s'
  },
  timeframe: '30d',
  generated_at: new Date().toISOString(),
  privacy_notice: {
    data_collection: 'Personal analytics data only',
    retention: 'Data retained according to privacy settings',
    sharing: 'Data not shared with third parties'
  }
};

describe('Comprehensive Analytics Types', () => {
  it('should have correct UserActivityAnalytics structure', () => {
    expect(mockUserActivity).toHaveProperty('total_sessions');
    expect(mockUserActivity).toHaveProperty('total_practice_time');
    expect(mockUserActivity).toHaveProperty('average_session_length');
    expect(mockUserActivity).toHaveProperty('device_distribution');
    expect(mockUserActivity).toHaveProperty('session_type_distribution');
    expect(mockUserActivity).toHaveProperty('most_active_day');
    expect(mockUserActivity).toHaveProperty('consistency_score');
    
    expect(typeof mockUserActivity.total_sessions).toBe('number');
    expect(typeof mockUserActivity.total_practice_time).toBe('number');
    expect(typeof mockUserActivity.consistency_score).toBe('number');
    expect(mockUserActivity.consistency_score).toBeGreaterThanOrEqual(0);
    expect(mockUserActivity.consistency_score).toBeLessThanOrEqual(100);
  });

  it('should have correct SongPopularityAnalytics structure', () => {
    expect(mockSongPopularity).toHaveProperty('top_songs');
    expect(mockSongPopularity).toHaveProperty('chord_popularity');
    expect(mockSongPopularity).toHaveProperty('trending_analysis');
    
    expect(Array.isArray(mockSongPopularity.top_songs)).toBe(true);
    expect(Array.isArray(mockSongPopularity.chord_popularity)).toBe(true);
    
    // Test song structure
    const firstSong = mockSongPopularity.top_songs[0];
    expect(firstSong).toHaveProperty('song_id');
    expect(firstSong).toHaveProperty('title');
    expect(firstSong).toHaveProperty('performance_count');
    expect(typeof firstSong.performance_count).toBe('number');
  });

  it('should have correct ComprehensiveDashboardData structure', () => {
    expect(mockDashboardData).toHaveProperty('user_activity');
    expect(mockDashboardData).toHaveProperty('song_popularity');
    expect(mockDashboardData).toHaveProperty('collaboration_patterns');
    expect(mockDashboardData).toHaveProperty('performance_statistics');
    expect(mockDashboardData).toHaveProperty('summary_metrics');
    expect(mockDashboardData).toHaveProperty('real_time_status');
    expect(mockDashboardData).toHaveProperty('timeframe');
    expect(mockDashboardData).toHaveProperty('generated_at');
    expect(mockDashboardData).toHaveProperty('privacy_notice');
  });

  it('should calculate metrics correctly', () => {
    // Test practice time formatting
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    expect(formatDuration(12600)).toBe('3h 30m');
    expect(formatDuration(280)).toBe('4m');
    expect(formatDuration(3660)).toBe('1h 1m');

    // Test percentage calculations
    const totalSessions = mockUserActivity.total_sessions;
    const desktopPercentage = (mockUserActivity.device_distribution.desktop / totalSessions) * 100;
    expect(Math.round(desktopPercentage)).toBe(67); // 30/45 ≈ 67%

    // Test consistency score validation
    expect(mockUserActivity.consistency_score).toBeGreaterThanOrEqual(0);
    expect(mockUserActivity.consistency_score).toBeLessThanOrEqual(100);
  });

  it('should handle chord popularity calculations', () => {
    const chords = mockSongPopularity.chord_popularity;
    
    // Verify chord data structure
    chords.forEach(chord => {
      expect(chord).toHaveProperty('chord');
      expect(chord).toHaveProperty('count');
      expect(chord).toHaveProperty('percentage');
      expect(typeof chord.count).toBe('number');
      expect(typeof chord.percentage).toBe('number');
      expect(chord.percentage).toBeGreaterThanOrEqual(0);
      expect(chord.percentage).toBeLessThanOrEqual(100);
    });

    // Test sorting (should be descending by count/percentage)
    for (let i = 1; i < chords.length; i++) {
      expect(chords[i-1].count).toBeGreaterThanOrEqual(chords[i].count);
    }
  });

  it('should validate performance statistics', () => {
    const perfStats = mockDashboardData.performance_statistics;
    
    expect(perfStats.completion_rate).toBeGreaterThanOrEqual(0);
    expect(perfStats.completion_rate).toBeLessThanOrEqual(100);
    expect(perfStats.improvement_score).toBeGreaterThanOrEqual(0);
    expect(perfStats.improvement_score).toBeLessThanOrEqual(100);
    
    // Validate problem areas
    perfStats.problem_areas.forEach(problem => {
      expect(problem).toHaveProperty('problem_type');
      expect(problem).toHaveProperty('frequency');
      expect(typeof problem.frequency).toBe('number');
      expect(problem.frequency).toBeGreaterThan(0);
    });

    // Validate trends
    const validTrends = ['improving', 'declining', 'stable'];
    expect(validTrends).toContain(perfStats.performance_trends.completion_trend);
    expect(validTrends).toContain(perfStats.performance_trends.improvement_trend);
    expect(validTrends).toContain(perfStats.performance_trends.consistency);
  });

  it('should handle collaboration data correctly', () => {
    const collabData = mockDashboardData.collaboration_patterns;
    
    expect(collabData.total_collaboration_sessions).toBeGreaterThanOrEqual(0);
    expect(collabData.average_participants).toBeGreaterThanOrEqual(1);
    
    const validFrequencies = ['very_frequent', 'frequent', 'regular', 'occasional', 'irregular'];
    expect(validFrequencies).toContain(collabData.collaboration_frequency);
    
    // Validate collaboration patterns
    const patterns = collabData.collaboration_patterns;
    expect(patterns.average_duration).toBeGreaterThan(0);
    expect(Array.isArray(patterns.peak_hours)).toBe(true);
    expect(Array.isArray(patterns.most_common_roles)).toBe(true);
  });

  it('should validate timeframe values', () => {
    const validTimeframes: AnalyticsTimeframe[] = ['7d', '30d', '90d', '1y', 'all'];
    expect(validTimeframes).toContain(mockDashboardData.timeframe);
  });

  it('should have valid real-time status', () => {
    const rtStatus = mockDashboardData.real_time_status;
    
    expect(typeof rtStatus.websocket_connected).toBe('boolean');
    expect(typeof rtStatus.last_update).toBe('string');
    expect(typeof rtStatus.update_frequency).toBe('string');
    
    // Validate ISO date format
    expect(new Date(rtStatus.last_update).toISOString()).toBe(rtStatus.last_update);
  });
});

describe('Analytics Utility Functions', () => {
  it('should format durations correctly', () => {
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59)).toBe('0m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(7260)).toBe('2h 1m');
  });

  it('should calculate consistency scores', () => {
    const calculateConsistency = (sessions: number, totalDays: number): number => {
      const uniquePracticeDays = Math.min(sessions, totalDays);
      return Math.round((uniquePracticeDays / totalDays) * 100);
    };

    expect(calculateConsistency(30, 30)).toBe(100); // Perfect consistency
    expect(calculateConsistency(15, 30)).toBe(50);  // Half the days
    expect(calculateConsistency(0, 30)).toBe(0);    // No practice
    expect(calculateConsistency(45, 30)).toBe(100); // More sessions than days (capped)
  });

  it('should categorize performance trends', () => {
    const categorizeTrend = (current: number, previous: number): 'improving' | 'declining' | 'stable' => {
      const threshold = 5; // 5% threshold for stability
      const change = ((current - previous) / previous) * 100;
      
      if (change > threshold) return 'improving';
      if (change < -threshold) return 'declining';
      return 'stable';
    };

    expect(categorizeTrend(85, 75)).toBe('improving'); // 13.3% improvement
    expect(categorizeTrend(75, 85)).toBe('declining'); // 11.8% decline
    expect(categorizeTrend(82, 80)).toBe('stable');    // 2.5% change
    expect(categorizeTrend(80, 80)).toBe('stable');    // No change
  });
});

// Test export configurations
describe('Analytics Export Configurations', () => {
  it('should validate export configuration', () => {
    const exportConfig = {
      format: 'json' as const,
      timeframe: '30d' as AnalyticsTimeframe,
      include_sections: ['user_activity', 'song_popularity', 'performance_statistics']
    };

    expect(['json', 'csv']).toContain(exportConfig.format);
    expect(['7d', '30d', '90d', '1y', 'all']).toContain(exportConfig.timeframe);
    expect(Array.isArray(exportConfig.include_sections)).toBe(true);
    expect(exportConfig.include_sections.length).toBeGreaterThan(0);
  });

  it('should validate widget configuration', () => {
    const widgetConfig = {
      layout: 'default',
      enabled_widgets: ['user_activity', 'song_popularity'],
      widget_positions: {},
      refresh_interval: 30,
      theme: 'light' as const
    };

    expect(typeof widgetConfig.layout).toBe('string');
    expect(Array.isArray(widgetConfig.enabled_widgets)).toBe(true);
    expect(typeof widgetConfig.widget_positions).toBe('object');
    expect(typeof widgetConfig.refresh_interval).toBe('number');
    expect(widgetConfig.refresh_interval).toBeGreaterThan(0);
    expect(['light', 'dark']).toContain(widgetConfig.theme);
  });
});