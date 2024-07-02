import React, { useState } from 'react';
import { Modal, Box, TextField, Button, Typography, Fade } from '@mui/material';
import Stack from '@mui/material/Stack';

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

interface TaskFormModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => void;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
    open,
    onClose,
    onSubmit,
}) => {
    const [taskName, setTaskName] = useState('');
    const [taskDescription, setTaskDescription] = useState('');

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(taskName, taskDescription);
        setTaskName('');
        setTaskDescription('');
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
                        Add New Task
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
                            id="taskName"
                            label="Task Name"
                            name="taskName"
                            autoComplete="taskName"
                            autoFocus
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="taskDescription"
                            label="Task Description"
                            type="text"
                            id="taskDescription"
                            autoComplete="taskDescription"
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                        />
                        <Stack direction="row" spacing={2}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                            >
                                Submit
                            </Button>
                            <Button
                                type="reset"
                                fullWidth
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

export default TaskFormModal;
