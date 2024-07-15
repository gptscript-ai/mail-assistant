import React, { useEffect, useState } from 'react';
import {
    Modal,
    Box,
    TextField,
    Button,
    Typography,
    Fade,
    ListItemText,
    Chip,
} from '@mui/material';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import { Task } from '@/types/task';

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

interface TaskFormModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (
        name: string,
        description: string,
        context: string,
        id?: string,
        context_ids?: string[]
    ) => void;
    create: boolean;
    fetchTask?: () => {};
    task?: Task;
    contexts?: Context[];
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
    open,
    onClose,
    onSubmit,
    create,
    fetchTask,
    task,
    contexts,
}) => {
    const [taskName, setTaskName] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskContext, setTaskContext] = useState<string>('');
    const [taskContextIds, setTaskContextIds] = useState<string[]>([]);
    const [taskID, setTaskID] = useState('');
    const [showNewContext, setShowNewContext] = useState(false);

    useEffect(() => {
        setTaskName(task ? task.Name : '');
        setTaskDescription(task ? task.Description : '');
        setTaskContext(task ? task.Context : '');
        setTaskID(task ? task.ID : '');
        setTaskContextIds(task && task.ContextIds ? task.ContextIds : []);
    }, [task]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(
            taskName,
            taskDescription,
            taskContext,
            taskID,
            taskContextIds
        );
        setTaskName('');
        setTaskDescription('');
        setTaskContext('');
        if (fetchTask) {
            fetchTask();
        }
    };

    const handleContextChange = (event: any) => {
        setTaskContextIds(event.target.value as string[]);
    };

    const toggleNewContext = () => {
        setShowNewContext((prev) => !prev);
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
                        {create ? 'Add New Task' : 'Update Task'}
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
                            fullWidth
                            name="taskDescription"
                            label="Task Description"
                            type="text"
                            id="taskDescription"
                            autoComplete="taskDescription"
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                        />
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="taskContext-label">
                                Rule Sets
                            </InputLabel>
                            <Select
                                labelId="taskContext-label"
                                id="taskContext"
                                label="Rule Sets"
                                multiple
                                value={taskContextIds}
                                onChange={handleContextChange}
                                renderValue={(selected) => {
                                    const names = contexts
                                        ?.filter(
                                            (context) =>
                                                taskContextIds?.indexOf(
                                                    context.ID
                                                ) > -1
                                        )
                                        .map((context) => context.Name);
                                    return (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 0.5,
                                            }}
                                        >
                                            {names?.map((value) => (
                                                <Chip
                                                    key={value}
                                                    label={value}
                                                />
                                            ))}
                                        </Box>
                                    );
                                }}
                            >
                                {contexts?.map((context) => (
                                    <MenuItem
                                        key={context.ID}
                                        value={context.ID}
                                    >
                                        <Checkbox
                                            checked={
                                                taskContextIds?.indexOf(
                                                    context.ID
                                                ) > -1
                                            }
                                        />
                                        <ListItemText primary={context.Name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {create && (
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={toggleNewContext}
                                sx={{ mt: 2 }}
                            >
                                {showNewContext
                                    ? 'Hide Additional Rules'
                                    : 'Add Additional Rules'}
                            </Button>
                        )}

                        {showNewContext && create && (
                            <TextField
                                margin="normal"
                                fullWidth
                                name="newContext"
                                label="New Context"
                                type="text"
                                id="newContext"
                                autoComplete="newContext"
                                value={taskContext}
                                onChange={(e) => setTaskContext(e.target.value)}
                                multiline
                                rows={4}
                                variant="outlined"
                                sx={{ fontSize: '1.25rem', mt: 2 }}
                            />
                        )}
                        {!create && (
                            <TextField
                                margin="normal"
                                fullWidth
                                name="existContext"
                                label="Extra Context"
                                type="text"
                                id="existContext"
                                autoComplete="existContext"
                                value={taskContext}
                                onChange={(e) => setTaskContext(e.target.value)}
                                multiline
                                rows={4}
                                variant="outlined"
                                sx={{ fontSize: '1.25rem', mt: 2 }}
                            />
                        )}
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

export default TaskFormModal;
