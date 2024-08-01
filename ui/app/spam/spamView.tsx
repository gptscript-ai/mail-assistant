import React, { useEffect, useState } from 'react';
import { Modal, Box, TextField, Button, Typography, Fade } from '@mui/material';
import Stack from '@mui/material/Stack';
import { SpamEmail } from '@/types/spam';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

interface ContextFormModalProps {
    open: boolean;
    onClose: () => void;
    spam?: SpamEmail;
}

const SpamModal: React.FC<ContextFormModalProps> = ({
    open,
    onClose,
    spam,
}) => {
    const [spamSubject, setSpamSubject] = useState('');
    const [spamBody, setSpamBody] = useState('');
    const [spamID, setSpamID] = useState('');
    useEffect(() => {
        setSpamSubject(spam ? spam.Subject : '');
        setSpamBody(spam ? spam?.EmailBody : '');
        setSpamID(spam ? spam.ID : '');
    }, [spam]);

    return (
        <Modal
            aria-labelledby="transition-modal-title"
            aria-describedby="transition-modal-description"
            open={open}
            onClose={onClose}
            closeAfterTransition
        >
            <Fade in={open}>
                <Box sx={style}>
                    <Typography
                        id="transition-modal-title"
                        variant="h6"
                        component="h2"
                    >
                        Email Detail
                    </Typography>
                    <Box component="form" noValidate sx={{ mt: 2 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            disabled
                            id="spamSubject"
                            label="Subject"
                            name="spamSubject"
                            autoComplete="contextName"
                            autoFocus
                            value={spamSubject}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            disabled
                            multiline
                            rows={12}
                            name="contextDescription"
                            label="Description"
                            type="text"
                            id="contextDescription"
                            autoComplete="contextDescription"
                            value={spamBody}
                        />
                        <Stack direction="row" spacing={2}>
                            <Button
                                type="reset"
                                fullWidth
                                color="error"
                                onClick={onClose}
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                            >
                                Close
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default SpamModal;
