/**
 * Tests for Comprehensive Analytics Dashboard Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ComprehensiveAnalyticsDashboard from '../ComprehensiveAnalyticsDashboard';
import UserActivityWidget from '../widgets/UserActivityWidget';
import SongPopularityWidget from '../widgets/SongPopularityWidget';
import PerformanceStatsWidget from '../widgets/PerformanceStatsWidget';

// Mock the hooks
vi.mock('../../hooks/useComprehensiveAnalytics', () => ({
  useComprehensiveAnalytics: vi.fn(),
  useRealTimeAnalytics: vi.fn()
}));

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key
  })
}));

// Mock data
const mockDashboardData = {
  user_activity: {
    total_sessions: 45,
    total_practice_time: 12600, // 3.5 hours
    average_session_length: 280, // ~4.7 minutes
    device_distribution: { desktop: 30, mobile: 15 },
    session_type_distribution: { practice: 35, performance: 10 },
    most_active_day: 'Monday',
    consistency_score: 75
  },
  song_popularity: {
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
  },
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
  }
};

const mockWidgetConfig = {
  layout: 'default',
  enabled_widgets: ['user_activity', 'song_popularity', 'performance_stats'],
  widget_positions: {},
  refresh_interval: 30,
  theme: 'light' as const
};

describe('ComprehensiveAnalyticsDashboard', () => {
  const mockHookReturn = {
    dashboardData: mockDashboardData,
    userActivity: mockDashboardData.user_activity,
    songPopularity: mockDashboardData.song_popularity,
    collaborationPatterns: mockDashboardData.collaboration_patterns,
    widgetConfig: mockWidgetConfig,
    availableWidgets: [
      { id: 'user_activity', name: 'User Activity', description: 'Practice sessions and activity trends' },
      { id: 'song_popularity', name: 'Song Popularity', description: 'Most played songs and trending music' }
    ],
    updateWidgetConfig: vi.fn(),
    loading: false,
    error: null,
    lastUpdated: new Date(),
    isRealTimeConnected: true,
    refresh: vi.fn(),
    setTimeframe: vi.fn(),
    exportData: vi.fn(),
    subscribeToRealTimeUpdates: vi.fn(),
    unsubscribeFromRealTimeUpdates: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const { useComprehensiveAnalytics, useRealTimeAnalytics } = require('../../hooks/useComprehensiveAnalytics');
    useComprehensiveAnalytics.mockReturnValue(mockHookReturn);
    useRealTimeAnalytics.mockReturnValue({
      updates: [],
      isConnected: true
    });
  });

  it('renders dashboard with header and summary cards', () => {
    render(<ComprehensiveAnalyticsDashboard />);
    
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('23')).toBeInTheDocument(); // Total songs
    expect(screen.getByText('8')).toBeInTheDocument(); // Total collaborations
  });

  it('shows loading state', () => {
    const { useComprehensiveAnalytics } = require('../../hooks/useComprehensiveAnalytics');
    useComprehensiveAnalytics.mockReturnValue({
      ...mockHookReturn,
      loading: true,
      dashboardData: null
    });

    render(<ComprehensiveAnalyticsDashboard />);
    
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const { useComprehensiveAnalytics } = require('../../hooks/useComprehensiveAnalytics');
    useComprehensiveAnalytics.mockReturnValue({
      ...mockHookReturn,
      loading: false,
      error: 'Failed to load analytics',
      dashboardData: null
    });

    render(<ComprehensiveAnalyticsDashboard />);
    
    expect(screen.getByText('Analytics Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
  });

  it('handles timeframe changes', () => {
    render(<ComprehensiveAnalyticsDashboard />);
    
    const timeframeSelect = screen.getByDisplayValue('Last 30 days');
    fireEvent.change(timeframeSelect, { target: { value: '7d' } });
    
    expect(mockHookReturn.setTimeframe).toHaveBeenCalledWith('7d');
  });

  it('shows real-time connection status', () => {
    render(<ComprehensiveAnalyticsDashboard />);
    
    expect(screen.getByText('Live updates')).toBeInTheDocument();
  });

  it('handles refresh action', () => {
    render(<ComprehensiveAnalyticsDashboard />);
    
    const refreshButton = screen.getByTitle('Refresh');
    fireEvent.click(refreshButton);
    
    expect(mockHookReturn.refresh).toHaveBeenCalled();
  });
});

describe('UserActivityWidget', () => {
  const mockUserActivity = mockDashboardData.user_activity;

  it('renders user activity data correctly', () => {
    render(
      <UserActivityWidget
        data={mockUserActivity}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('User Activity')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // Total sessions
    expect(screen.getByText('3h 30m')).toBeInTheDocument(); // Practice time
    expect(screen.getByText('Monday')).toBeInTheDocument(); // Most active day
    expect(screen.getByText('75%')).toBeInTheDocument(); // Consistency score
  });

  it('shows loading state', () => {
    render(
      <UserActivityWidget
        data={null}
        timeframe="30d"
        loading={true}
        error={null}
      />
    );

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows no data message', () => {
    render(
      <UserActivityWidget
        data={null}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('displays device distribution', () => {
    render(
      <UserActivityWidget
        data={mockUserActivity}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('desktop')).toBeInTheDocument();
    expect(screen.getByText('mobile')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // Desktop count
    expect(screen.getByText('15')).toBeInTheDocument(); // Mobile count
  });
});

describe('SongPopularityWidget', () => {
  const mockSongPopularity = mockDashboardData.song_popularity;

  it('renders song popularity data correctly', () => {
    render(
      <SongPopularityWidget
        data={mockSongPopularity}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Song Popularity')).toBeInTheDocument();
    expect(screen.getByText('Test Song 1')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('15x')).toBeInTheDocument(); // Performance count
  });

  it('shows no songs message when empty', () => {
    render(
      <SongPopularityWidget
        data={{ top_songs: [], chord_popularity: [], trending_analysis: { trending_up: [], trending_down: [], new_favorites: [] } }}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('No songs practiced yet')).toBeInTheDocument();
  });

  it('displays chord popularity', () => {
    render(
      <SongPopularityWidget
        data={mockSongPopularity}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Popular Chords')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument(); // C chord percentage
  });

  it('shows trending analysis', () => {
    render(
      <SongPopularityWidget
        data={mockSongPopularity}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Song A')).toBeInTheDocument(); // Trending up
  });
});

describe('PerformanceStatsWidget', () => {
  const mockPerformanceStats = mockDashboardData.performance_statistics;

  it('renders performance statistics correctly', () => {
    render(
      <PerformanceStatsWidget
        data={mockPerformanceStats}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Performance Stats')).toBeInTheDocument();
    expect(screen.getByText('3h 30m')).toBeInTheDocument(); // Total practice time
    expect(screen.getByText('86%')).toBeInTheDocument(); // Completion rate
    expect(screen.getByText('72/100')).toBeInTheDocument(); // Improvement score
  });

  it('displays performance trends', () => {
    render(
      <PerformanceStatsWidget
        data={mockPerformanceStats}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Trends')).toBeInTheDocument();
    expect(screen.getByText('improving')).toBeInTheDocument();
    expect(screen.getByText('stable')).toBeInTheDocument();
  });

  it('shows problem areas', () => {
    render(
      <PerformanceStatsWidget
        data={mockPerformanceStats}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Areas to Focus')).toBeInTheDocument();
    expect(screen.getByText('chord transition')).toBeInTheDocument();
    expect(screen.getByText('rhythm timing')).toBeInTheDocument();
  });

  it('shows no problems message when no issues', () => {
    const statsWithoutProblems = {
      ...mockPerformanceStats,
      problem_areas: []
    };

    render(
      <PerformanceStatsWidget
        data={statsWithoutProblems}
        timeframe="30d"
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Great job! No major problem areas identified.')).toBeInTheDocument();
  });
});