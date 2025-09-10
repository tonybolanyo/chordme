/**
 * Problem Sections Widget
 * 
 * Displays identified problem sections that need focus
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface ProblemSectionsWidgetProps {
  data: unknown;
  timeframe: string;
  loading: boolean;
  error: string | null;
}

const ProblemSectionsWidget: React.FC<ProblemSectionsWidgetProps> = ({
  data,
  timeframe,
  loading,
  error
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const problemSections = [
    {
      type: 'chord_transition',
      description: 'G to C transition',
      severity: 4.2,
      frequency: 8
    },
    {
      type: 'rhythm_timing',
      description: 'Verse rhythm',
      severity: 3.8,
      frequency: 5
    }
  ];

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-500';
    if (severity >= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('analytics.problemSections.title', 'Problem Areas')}
        </h3>
      </div>

      {problemSections.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-green-500 text-4xl mb-2">✅</div>
          <p className="text-green-600 font-medium">
            {t('analytics.problemSections.noproblems', 'No problem areas!')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('analytics.problemSections.keepUp', 'Keep up the great work!')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {problemSections.map((section, index) => (
            <div key={index} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(section.severity)}`}></div>
                  <span className="font-medium text-gray-900">{section.description}</span>
                </div>
                <span className="text-sm text-gray-600">{section.frequency}x</span>
              </div>
              <div className="text-sm text-gray-600 capitalize">
                {section.type.replace('_', ' ')} • Severity: {section.severity}/5
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemSectionsWidget;