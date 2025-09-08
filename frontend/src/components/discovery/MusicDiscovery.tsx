import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import { 
  PersonalizedRecommendations, 
  TrendingSongsResponse, 
  MusicRecommendation,
  TrendingSong,
  DiscoveryTimeframe
} from '../../types/analytics';

interface MusicDiscoveryProps {
  className?: string;
}

const MusicDiscovery: React.FC<MusicDiscoveryProps> = ({ className = '' }) => {
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendations | null>(null);
  const [trendingSongs, setTrendingSongs] = useState<TrendingSongsResponse | null>(null);
  const [timeframe, setTimeframe] = useState<DiscoveryTimeframe>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'trending'>('recommendations');

  useEffect(() => {
    loadDiscoveryData();
  }, [timeframe]);

  const loadDiscoveryData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [recsData, trendingData] = await Promise.all([
        analyticsService.getPersonalizedRecommendations(10),
        analyticsService.getTrendingSongs(timeframe, 10)
      ]);

      setRecommendations(recsData);
      setTrendingSongs(trendingData);
    } catch (err) {
      console.error('Error loading discovery data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load discovery data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe: DiscoveryTimeframe) => {
    setTimeframe(newTimeframe);
  };

  const RecommendationCard: React.FC<{ recommendation: MusicRecommendation }> = ({ recommendation }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {Math.round(recommendation.relevance_score * 100)}% match
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-2">{recommendation.artist}</p>
      {recommendation.genre && (
        <p className="text-gray-500 text-xs mb-3">{recommendation.genre}</p>
      )}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <strong>Why recommended:</strong> {recommendation.explanation}
      </div>
    </div>
  );

  const TrendingSongCard: React.FC<{ song: TrendingSong }> = ({ song }) => (
    <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{song.title}</h3>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          Trending
        </span>
      </div>
      <p className="text-gray-600 text-sm mb-2">{song.artist}</p>
      {song.genre && (
        <p className="text-gray-500 text-xs mb-2">{song.genre}</p>
      )}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{song.view_count} views</span>
        <span>{song.favorite_count} favorites</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-300 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Music Discovery</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadDiscoveryData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Music Discovery</h2>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'trending'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Trending
          </button>
        </div>

        {/* Trending Timeframe Selector */}
        {activeTab === 'trending' && (
          <div className="flex space-x-2 mb-4">
            <span className="text-sm text-gray-600 py-2">Timeframe:</span>
            {(['1d', '7d', '30d'] as DiscoveryTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tf === '1d' ? '24h' : tf === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'recommendations' && recommendations && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Personalized Recommendations
            </h3>
            <span className="text-sm text-gray-500">
              {recommendations.recommendations.length} songs
            </span>
          </div>
          
          {recommendations.recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.recommendations.map((rec) => (
                <RecommendationCard key={rec.song_id} recommendation={rec} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recommendations available yet.</p>
              <p className="text-sm mt-2">
                Start adding songs to your collection to get personalized recommendations!
              </p>
            </div>
          )}

          {/* Privacy Notice */}
          {recommendations.privacy_notice && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Privacy & Personalization</h4>
              <p className="text-xs text-blue-600">{recommendations.privacy_notice.explanation}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trending' && trendingSongs && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Trending Songs
            </h3>
            <span className="text-sm text-gray-500">
              {trendingSongs.trending_songs.length} songs
            </span>
          </div>
          
          {trendingSongs.trending_songs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingSongs.trending_songs.map((song) => (
                <TrendingSongCard key={song.song_id} song={song} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No trending songs found for this timeframe.</p>
            </div>
          )}

          {/* Trending Factors */}
          {trendingSongs.trending_factors && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">Trending Factors</h4>
              <ul className="text-xs text-green-600 space-y-1">
                {trendingSongs.trending_factors.map((factor, index) => (
                  <li key={index}>• {factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MusicDiscovery;