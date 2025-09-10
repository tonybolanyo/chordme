import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CollaborationRoom } from '../../types/professionalCollaboration';

interface Props {
  room: CollaborationRoom;
  onUpdate: () => void;
}

const RoomSettings: React.FC<Props> = () => {
  return (
    <Box>
      <Typography variant="h5">Room Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Room settings interface coming soon...
      </Typography>
    </Box>
  );
};

export default RoomSettings;