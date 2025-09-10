/**
 * Growth Dashboard Component
 * Admin interface for managing growth features and viewing analytics
 */

import React, { useState, useEffect } from 'react';

interface GrowthDashboardProps {
  className?: string;
}

interface GrowthMetrics {
  totalUsers: number;
  newUsersToday: number;
  totalReferrals: number;
  completedChallenges: number;
  onboardingCompletionRate: number;
  averageStreak: number;
  activeExperiments: number;
}

export const GrowthDashboard: React.FC<GrowthDashboardProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'challenges' | 'experiments'>('overview');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      // This would typically come from a dedicated analytics endpoint
      const mockMetrics: GrowthMetrics = {
        totalUsers: 1250,
        newUsersToday: 23,
        totalReferrals: 189,
        completedChallenges: 456,
        onboardingCompletionRate: 78.5,
        averageStreak: 4.2,
        activeExperiments: 3
      };
      setMetrics(mockMetrics);
    } catch (err) {
      setError('Failed to load growth metrics');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} text-red-600`}>
        <p>{error}</p>
        <button 
          onClick={loadMetrics}
          className="mt-2 text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Growth Dashboard</h1>
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          change={`+${metrics.newUsersToday} today`}
          changeType="positive"
          icon="👥"
        />
        <MetricCard
          title="Total Referrals"
          value={metrics.totalReferrals.toLocaleString()}
          change="+12 this week"
          changeType="positive"
          icon="🔗"
        />
        <MetricCard
          title="Challenges Completed"
          value={metrics.completedChallenges.toLocaleString()}
          change="+45 today"
          changeType="positive"
          icon="🎯"
        />
        <MetricCard
          title="Onboarding Rate"
          value={`${metrics.onboardingCompletionRate}%`}
          change="+2.3% this month"
          changeType="positive"
          icon="🚀"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'referrals', label: 'Referrals' },
            { id: 'challenges', label: 'Challenges' },
            { id: 'experiments', label: 'A/B Tests' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as unknown)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'overview' && <OverviewTab metrics={metrics} />}
        {activeTab === 'referrals' && <ReferralsTab />}
        {activeTab === 'challenges' && <ChallengesTab />}
        {activeTab === 'experiments' && <ExperimentsTab />}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon }) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className={`text-sm ${changeColors[changeType]}`}>{change}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

const OverviewTab: React.FC<{ metrics: GrowthMetrics }> = ({ metrics }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-medium text-gray-900">Growth Overview</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">User Engagement</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Average Streak:</span>
            <span className="font-medium">{metrics.averageStreak} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Onboarding Rate:</span>
            <span className="font-medium">{metrics.onboardingCompletionRate}%</span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Growth Channels</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Referrals:</span>
            <span className="font-medium">{metrics.totalReferrals}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Active Experiments:</span>
            <span className="font-medium">{metrics.activeExperiments}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ReferralsTab: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">Referral Management</h3>
      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
        Export Data
      </button>
    </div>
    
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p className="text-yellow-800">
        💡 <strong>Tip:</strong> Most successful referrals come from social sharing. Consider promoting social features.
      </p>
    </div>
    
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Recent Referral Activity</h4>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600">Detailed referral analytics would be displayed here, including:</p>
        <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
          <li>Conversion rates by channel</li>
          <li>Top referring users</li>
          <li>Referral timeline analysis</li>
          <li>Geographic distribution</li>
        </ul>
      </div>
    </div>
  </div>
);

const ChallengesTab: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">Daily Challenges</h3>
      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
        Create Challenge
      </button>
    </div>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-blue-800">
        📊 <strong>Insight:</strong> Practice-based challenges have the highest completion rates (87%).
      </p>
    </div>
    
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Challenge Performance</h4>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600">Challenge analytics dashboard would include:</p>
        <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
          <li>Completion rates by challenge type</li>
          <li>User engagement trends</li>
          <li>Optimal difficulty analysis</li>
          <li>Reward effectiveness metrics</li>
        </ul>
      </div>
    </div>
  </div>
);

const ExperimentsTab: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">A/B Testing</h3>
      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
        New Experiment
      </button>
    </div>
    
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <p className="text-green-800">
        ✅ <strong>Success:</strong> New onboarding flow increased completion by 23%.
      </p>
    </div>
    
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Active Experiments</h4>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600">Experiment management interface would show:</p>
        <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
          <li>Running experiments with status</li>
          <li>Statistical significance tracking</li>
          <li>Variant performance comparison</li>
          <li>Experiment history and results</li>
        </ul>
      </div>
    </div>
  </div>
);