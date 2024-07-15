import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import React, { useEffect, useState } from 'react';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { Box, Chip, FormControlLabel, ListItemText } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import { useRouter } from 'next/navigation';
import { Task } from '@/types/task';

interface ContextFormModalProps {
    open: boolean;
    onClose: () => void;
    contexts: Context[];
    task: Task;
}

const ContextFormDialog: React.FC<ContextFormModalProps> = ({
    open,
    onClose,
    contexts,
    task,
}) => {
    const router = useRouter();
    const [taskContextIds, setTaskContextIds] = useState<string[]>([]);
    const [showNewContext, setShowNewContext] = useState(false);
    const [taskContext, setTaskContext] = useState<string>('');
    const [doNotShowAgain, setDoNotShowAgain] = useState(false);

    const handleCheckboxChange = (event: any) => {
        setDoNotShowAgain(event.target.checked);
        if (event.target.checked) {
            setTaskContext(' ');
        }
    };

    const handleContextChange = (event: any) => {
        setTaskContextIds(event.target.value as string[]);
    };

    const toggleNewContext = () => {
        setShowNewContext((prev) => !prev);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                component: 'form',
                onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const response = await fetch(`/api/tasks/${task.ID}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: task.Name,
                            description: task.Description,
                            context: taskContext,
                            contextIds: taskContextIds,
                        }),
                    });

                    if (!response.ok) {
                        console.log(new Error('Failed to update task'));
                    }
                    router.push(`/task/${task.ID}`);
                },
            }}
        >
            <DialogTitle>Rules</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Looks like you did not setup any rules for this task. Do you
                    want to select existing rule sets or add additional rules?
                </DialogContentText>
                <FormControl fullWidth margin="normal">
                    <InputLabel id="taskContext-label">Rule Sets</InputLabel>
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
                                        taskContextIds.indexOf(context.ID) > -1
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
                                        <Chip key={value} label={value} />
                                    ))}
                                </Box>
                            );
                        }}
                    >
                        {contexts?.map((context) => (
                            <MenuItem key={context.ID} value={context.ID}>
                                <Checkbox
                                    checked={
                                        taskContextIds.indexOf(context.ID) > -1
                                    }
                                />
                                <ListItemText primary={context.Name} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
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
                {showNewContext && (
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
            </DialogContent>
            <DialogActions>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={doNotShowAgain}
                            onChange={handleCheckboxChange}
                            name="doNotShowAgain"
                            color="primary"
                        />
                    }
                    label="Do not show again"
                    sx={{ marginRight: 'auto' }}
                />
                <Button type="submit">Continue</Button>
            </DialogActions>
        </Dialog>
    );
};
export default ContextFormDialog;
