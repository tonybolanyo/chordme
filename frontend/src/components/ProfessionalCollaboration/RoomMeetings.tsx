import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CollaborationRoom } from '../../types/professionalCollaboration';

interface Props {
  room: CollaborationRoom;
  onUpdate: () => void;
}

const RoomMeetings: React.FC<Props> = () => {
  return (
    <Box>
      <Typography variant="h5">Meeting Scheduler</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Meeting scheduling interface coming soon...
      </Typography>
    </Box>
  );
};

export default RoomMeetings;