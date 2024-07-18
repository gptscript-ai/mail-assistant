import { useState } from 'react';
import StackTrace from './stackTrace';
import type { CallFrame } from '@gptscript-ai/gptscript';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import { Modal } from '@mui/material';
import Box from '@mui/material/Box';
import { Note } from '@phosphor-icons/react/dist/ssr/Note';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';

const Calls = ({ calls }: { calls: Record<string, CallFrame> }) => {
    const [showModal, setShowModal] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    const getFunctionCalls = (calls: Record<string, CallFrame>) => {
        return Object.keys(calls)
            .filter((k) => k.startsWith('call_'))
            .map((k) => calls[k].toolName);
    };

    const onClose = () => {
        setShowModal(false);
    };

    return (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
                display: 'flex',
            }}
        >
            {getFunctionCalls(calls)?.length > 0 && (
                <Tooltip title={`Tool called successfully`}>
                    <CheckCircleIcon
                        style={{
                            color: 'green',
                            fontSize: 20,
                        }}
                    />
                </Tooltip>
            )}
            <Tooltip
                title="View stack trace"
                sx={{
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.1)', // Example hover effect
                        transition: 'background-color 0.3s ease',
                    },
                }}
            >
                <IconButton onClick={() => setShowModal(true)}>
                    <Note size={20} />
                </IconButton>
            </Tooltip>
            <Modal
                open={showModal}
                onClose={onClose}
                className="flex items-center justify-center"
            >
                <Box className="bg-white rounded-lg p-4 w-full max-w-md mx-auto h-4/5">
                    <Box>
                        <Button
                            color="primary"
                            onClick={() => setShowModal(false)}
                        >
                            <CloseIcon />
                        </Button>
                    </Box>
                    {calls && Object.keys(calls).length > 0 && (
                        <StackTrace calls={calls} />
                    )}
                </Box>
            </Modal>
        </Stack>
    );
};

export default Calls;
