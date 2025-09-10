/**
 * Professional Collaboration Room Component
 * Main interface for managing professional collaboration workspaces
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Tab,
  Tabs,
  Typography,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Button,
  Grid,
  Alert
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  FolderOpen as ResourcesIcon,
  Event as MeetingsIcon,
  Chat as ChatIcon,
  Timeline as ProgressIcon,
  Dashboard as DashboardIcon,
  MoreVert as MoreVertIcon,
  VideoCall as VideoCallIcon,
  CalendarToday as CalendarIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

import type { CollaborationRoom } from '../../types/professionalCollaboration';
import professionalCollaborationService from '../../services/professionalCollaborationService';

// Import sub-components (to be created)
import RoomParticipants from './RoomParticipants';
import RoomResources from './RoomResources';
import RoomMeetings from './RoomMeetings';
import RoomChat from './RoomChat';
import RoomProgress from './RoomProgress';
import RoomDashboard from './RoomDashboard';
import RoomSettings from './RoomSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`room-tabpanel-${index}`}
      aria-labelledby={`room-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `room-tab-${index}`,
    'aria-controls': `room-tabpanel-${index}`,
  };
}

const CollaborationRoomComponent: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<CollaborationRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notifications, setNotifications] = useState<number>(0);

  useEffect(() => {
    if (roomId) {
      loadRoom();
    }
  }, [roomId]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const roomData = await professionalCollaborationService.getRoom(roomId!);
      setRoom(roomData);
    } catch (err) {
      console.error('Failed to load room:', err);
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleLeaveRoom = async () => {
    try {
      if (room?.user_role === 'owner') {
        // Show confirmation dialog for room owners
        const confirmed = window.confirm(
          'As the room owner, leaving will archive the room. Are you sure?'
        );
        if (!confirmed) return;
      }
      
      await professionalCollaborationService.leaveRoom(roomId!);
      navigate('/collaboration-rooms');
    } catch (err) {
      console.error('Failed to leave room:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    }
    handleMenuClose();
  };

  const handleArchiveRoom = async () => {
    try {
      const confirmed = window.confirm(
        'Are you sure you want to archive this room? It can be restored later.'
      );
      if (!confirmed) return;

      await professionalCollaborationService.updateRoom(roomId!, { status: 'archived' });
      navigate('/collaboration-rooms');
    } catch (err) {
      console.error('Failed to archive room:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive room');
    }
    handleMenuClose();
  };

  const getRoomTypeColor = (roomType: string) => {
    switch (roomType) {
      case 'album': return 'primary';
      case 'tour': return 'secondary';
      case 'lesson_plan': return 'success';
      default: return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
      case 'band_leader': return 'error';
      case 'member': return 'primary';
      case 'guest': return 'warning';
      case 'observer': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading collaboration room...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadRoom}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!room) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          Room not found or access denied.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Room Header */}
      <Paper sx={{ mb: 2, p: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h4" component="h1">
                {room.name}
              </Typography>
              <Chip 
                label={room.room_type.replace('_', ' ')} 
                color={getRoomTypeColor(room.room_type)}
                size="small"
              />
              <Chip 
                label={room.user_role} 
                color={getRoleColor(room.user_role!)}
                size="small"
                variant="outlined"
              />
            </Box>
            {room.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {room.description}
              </Typography>
            )}
          </Grid>
          
          {/* Room Actions */}
          <Grid item>
            <Box display="flex" alignItems="center" gap={1}>
              {room.has_meeting_scheduler && (
                <Tooltip title="Quick Meeting">
                  <IconButton color="primary">
                    <VideoCallIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              {room.has_calendar_integration && (
                <Tooltip title="Calendar">
                  <IconButton>
                    <CalendarIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Notifications">
                <IconButton>
                  <Badge badgeContent={notifications} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <IconButton onClick={handleMenuClick}>
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Room Navigation Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="room navigation tabs"
        >
          <Tab 
            icon={<DashboardIcon />} 
            label="Dashboard" 
            {...a11yProps(0)} 
          />
          <Tab 
            icon={<PeopleIcon />} 
            label={`Participants (${room.participant_count || 0})`}
            {...a11yProps(1)} 
          />
          {room.has_resource_library && (
            <Tab 
              icon={<ResourcesIcon />} 
              label="Resources" 
              {...a11yProps(2)} 
            />
          )}
          {room.has_meeting_scheduler && (
            <Tab 
              icon={<MeetingsIcon />} 
              label="Meetings" 
              {...a11yProps(3)} 
            />
          )}
          {room.has_chat_enabled && (
            <Tab 
              icon={<ChatIcon />} 
              label="Chat" 
              {...a11yProps(4)} 
            />
          )}
          {room.has_progress_tracking && (
            <Tab 
              icon={<ProgressIcon />} 
              label="Progress" 
              {...a11yProps(5)} 
            />
          )}
          <Tab 
            icon={<SettingsIcon />} 
            label="Settings" 
            {...a11yProps(6)} 
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <RoomDashboard room={room} onUpdate={loadRoom} />
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        <RoomParticipants room={room} onUpdate={loadRoom} />
      </TabPanel>
      
      {room.has_resource_library && (
        <TabPanel value={activeTab} index={2}>
          <RoomResources room={room} onUpdate={loadRoom} />
        </TabPanel>
      )}
      
      {room.has_meeting_scheduler && (
        <TabPanel value={activeTab} index={3}>
          <RoomMeetings room={room} onUpdate={loadRoom} />
        </TabPanel>
      )}
      
      {room.has_chat_enabled && (
        <TabPanel value={activeTab} index={4}>
          <RoomChat room={room} />
        </TabPanel>
      )}
      
      {room.has_progress_tracking && (
        <TabPanel value={activeTab} index={5}>
          <RoomProgress room={room} onUpdate={loadRoom} />
        </TabPanel>
      )}
      
      <TabPanel value={activeTab} index={6}>
        <RoomSettings room={room} onUpdate={loadRoom} />
      </TabPanel>

      {/* Room Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          handleMenuClose();
        }}>
          Copy Room Link
        </MenuItem>
        
        {room.access_mode === 'link-access' && (
          <MenuItem onClick={async () => {
            try {
              const link = await professionalCollaborationService.generateInviteLink(roomId!);
              navigator.clipboard.writeText(link);
              handleMenuClose();
            } catch (err) {
              console.error('Failed to generate invite link:', err);
            }
          }}>
            Copy Invite Link
          </MenuItem>
        )}
        
        <MenuItem onClick={async () => {
          try {
            const blob = await professionalCollaborationService.exportRoomData(roomId!, 'json');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${room.name}-export.json`;
            a.click();
            URL.revokeObjectURL(url);
            handleMenuClose();
          } catch (err) {
            console.error('Failed to export room data:', err);
          }
        }}>
          Export Room Data
        </MenuItem>
        
        {(room.user_role === 'owner' || room.user_role === 'band_leader') && (
          <MenuItem onClick={handleArchiveRoom}>
            Archive Room
          </MenuItem>
        )}
        
        <MenuItem onClick={handleLeaveRoom} sx={{ color: 'error.main' }}>
          Leave Room
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CollaborationRoomComponent;