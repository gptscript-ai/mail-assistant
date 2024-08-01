import React, { useEffect, useState } from 'react';
import { Modal, Box, TextField, Button, Typography, Fade } from '@mui/material';
import Stack from '@mui/material/Stack';

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
    onSubmit: (
        name: string,
        description: string,
        context: string,
        id?: string
    ) => void;
    create: boolean;
    fetchContext?: () => {};
    context?: Context;
}

const ContextFormModal: React.FC<ContextFormModalProps> = ({
    open,
    onClose,
    onSubmit,
    create,
    fetchContext,
    context,
}) => {
    const [contextName, setContextName] = useState('');
    const [contextDescription, setContextDescription] = useState('');
    const [contextContent, setContextContent] = useState('');
    const [contextID, setContextID] = useState('');
    useEffect(() => {
        setContextName(context ? context.Name : '');
        setContextDescription(context ? context.Description : '');
        setContextContent(context ? context.Content : '');
        setContextID(context ? context.ID : '');
    }, [context]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(contextName, contextDescription, contextContent, contextID);
        setContextName('');
        setContextDescription('');
        setContextContent('');
        if (fetchContext) {
            fetchContext();
        }
    };

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
                        Add Additional Rules
                    </Typography>
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{ mt: 2 }}
                    >
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="contextName"
                            label="Name"
                            name="contextName"
                            autoComplete="contextName"
                            autoFocus
                            value={contextName}
                            onChange={(e) => setContextName(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="contextDescription"
                            label="Description"
                            type="text"
                            id="contextDescription"
                            autoComplete="contextDescription"
                            value={contextDescription}
                            onChange={(e) =>
                                setContextDescription(e.target.value)
                            }
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            name="contextContext"
                            label="Content"
                            type="text"
                            id="contextContext"
                            autoComplete="contextContext"
                            value={contextContent}
                            onChange={(e) => setContextContent(e.target.value)}
                            multiline
                            rows={6}
                            variant="outlined"
                            sx={{ fontSize: '1.25rem' }}
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
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                            >
                                {create ? 'Create' : 'Update'}
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default ContextFormModal;
