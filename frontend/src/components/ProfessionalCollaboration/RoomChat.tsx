import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CollaborationRoom } from '../../types/professionalCollaboration';

interface Props {
  room: CollaborationRoom;
}

const RoomChat: React.FC<Props> = ({ room: _room }) => {
  return (
    <Box>
      <Typography variant="h5">Room Chat</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Room chat interface coming soon...
      </Typography>
    </Box>
  );
};

export default RoomChat;