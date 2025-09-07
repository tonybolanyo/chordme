import React from 'react';
import { ProjectDashboard } from '../../../src/components/ProjectManagement';

/**
 * Demo page to showcase the Project Management Dashboard
 * This demonstrates the complete project management workflow
 */
const ProjectManagementDemo: React.FC = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '1rem', 
        background: '#f8f9fa', 
        borderBottom: '1px solid #e0e0e0',
        textAlign: 'center'
      }}>
        <h1>🎵 ChordMe Advanced Project Management Tools</h1>
        <p>Complete project management for music collaboration workflows</p>
      </div>
      
      <div style={{ flex: 1 }}>
        <ProjectDashboard />
      </div>
    </div>
  );
};

export default ProjectManagementDemo;