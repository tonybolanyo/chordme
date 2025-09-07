/**
 * Room Dashboard Component
 * Shows activity dashboard and progress tracking
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Event as EventIcon,
  FolderOpen as FolderIcon,
  Chat as ChatIcon
} from '@mui/icons-material';

import type { CollaborationRoom, ActivityDashboard } from '../../types/professionalCollaboration';
import professionalCollaborationService from '../../services/professionalCollaborationService';

interface Props {
  room: CollaborationRoom;
  onUpdate: () => void;
}

const RoomDashboard: React.FC<Props> = ({ room, onUpdate }) => {
  const [dashboard, setDashboard] = useState<ActivityDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [room.id]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboardData = await professionalCollaborationService.getActivityDashboard(room.id);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Room Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Participants
                  </Typography>
                  <Typography variant="h4">
                    {dashboard?.summary.active_participants || room.participant_count || 0}
                  </Typography>
                </Box>
                <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Messages
                  </Typography>
                  <Typography variant="h4">
                    {dashboard?.summary.total_messages || 0}
                  </Typography>
                </Box>
                <ChatIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Meetings
                  </Typography>
                  <Typography variant="h4">
                    {dashboard?.summary.total_meetings || 0}
                  </Typography>
                </Box>
                <EventIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Resources
                  </Typography>
                  <Typography variant="h4">
                    {dashboard?.summary.total_resources || 0}
                  </Typography>
                </Box>
                <FolderIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {room.recent_activity?.slice(0, 5).map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemIcon>
                    <ChatIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.content.substring(0, 50) + '...'}
                    secondary={new Date(activity.created_at).toLocaleString()}
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No recent activity" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Meetings
            </Typography>
            <List>
              {room.upcoming_meetings?.slice(0, 5).map((meeting) => (
                <ListItem key={meeting.id}>
                  <ListItemIcon>
                    <EventIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={meeting.title}
                    secondary={new Date(meeting.scheduled_at).toLocaleString()}
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No upcoming meetings" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Collaboration Score */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Collaboration Health
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Overall collaboration score: {dashboard?.summary.collaboration_score || 75}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={dashboard?.summary.collaboration_score || 75} 
                sx={{ mt: 1 }}
              />
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip label="Active Engagement" color="success" size="small" />
              <Chip label="Regular Meetings" color="primary" size="small" />
              <Chip label="Resource Sharing" color="info" size="small" />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RoomDashboard;