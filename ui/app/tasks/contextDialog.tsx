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
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';

interface ContextFormModalProps {
    open: boolean;
    onClose: () => void;
    contexts: Context[];
    task: Task;
}

const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
    marginRight: 'auto',
    '& .MuiFormControlLabel-label': {
        fontSize: theme.typography.body2.fontSize,
        fontWeight: theme.typography.body2.fontWeight,
        color: theme.palette.text.secondary,
    },
    '& .MuiCheckbox-root': {
        color: theme.palette.primary.main,
    },
}));

const theme = createTheme({
    typography: {
        body2: {
            fontSize: '0.875rem',
            fontWeight: 400,
        },
    },
});

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
        <ThemeProvider theme={theme}>
            <Dialog
                open={open}
                onClose={onClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: async (
                        event: React.FormEvent<HTMLFormElement>
                    ) => {
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
                        Looks like you did not setup any rules for this task. Do
                        you want to select existing rule sets or add additional
                        rules?
                    </DialogContentText>
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
                                            taskContextIds.indexOf(context.ID) >
                                            -1
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
                                            taskContextIds.indexOf(context.ID) >
                                            -1
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
                    <StyledFormControlLabel
                        control={
                            <Checkbox
                                checked={doNotShowAgain}
                                onChange={handleCheckboxChange}
                                name="doNotShowAgain"
                                color="primary"
                            />
                        }
                        label="Don't show again"
                    />
                    <Button type="submit">Continue</Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};
export default ContextFormDialog;
