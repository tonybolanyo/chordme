import React from 'react';
import { ForumHome, ForumNavigation } from '../../components/Forum';
import './Forum.css';

interface ForumPageProps {
  className?: string;
}

const ForumPage: React.FC<ForumPageProps> = ({ className = '' }) => {
  // In a real app, this would come from authentication context
  const userReputation = {
    total_score: 150,
    level: 3,
    level_name: 'Member'
  };

  return (
    <div className={`forum-page ${className}`}>
      <div className="forum-page__container">
        <aside className="forum-page__sidebar">
          <ForumNavigation 
            currentPath="/forum" 
            userReputation={userReputation}
          />
        </aside>
        
        <main className="forum-page__content">
          <ForumHome />
        </main>
      </div>
    </div>
  );
};

export default ForumPage;