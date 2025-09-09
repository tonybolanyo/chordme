import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CollaborationRoom } from '../../types/professionalCollaboration';

interface Props {
  room: CollaborationRoom;
  onUpdate: () => void;
}

const RoomProgress: React.FC<Props> = ({ room: _room, onUpdate: _onUpdate }) => {
  return (
    <Box>
      <Typography variant="h5">Progress Tracking</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Progress tracking interface coming soon...
      </Typography>
    </Box>
  );
};

export default RoomProgress;