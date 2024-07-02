'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { MinusCircle as MinusIcon } from '@phosphor-icons/react/dist/ssr/MinusCircle';
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';

import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TaskFormModal from '@/app/tasks/taskForm';
import { TasksTable } from '@/app/tasks/taskTable';

export default function Page(): React.JSX.Element {
    const router = useRouter();
    const page = 0;
    const rowsPerPage = 5;
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());

    const handleAddTaskClick = () => {
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/tasks');
            let tasks: Task[] = await response.json();
            tasks = tasks?.sort((a, b) => {
                if (a.CreatedAt < b.CreatedAt) {
                    return -1;
                }
                if (a.CreatedAt > b.CreatedAt) {
                    return 1;
                }
                return 0;
            });
            setTasks(tasks);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateTask = async (name: string, description: string) => {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description }),
            });

            if (!response.ok) {
                throw new Error('Failed to create task');
            }

            const data = await response.json();
            console.log('Task created:', data);
            fetchTasks();
            setIsModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteTask = async () => {
        if (selected.size === 0) {
            alert('Must select at least one task to delete');
        }
        try {
            for (const id of Array.from(selected)) {
                const response = await fetch(`/api/tasks/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Failed to delete task');
                }
                console.log('Task deleted: ', id);
            }
            fetchTasks();
            setSelected(new Set());
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleTaskRun = async () => {
        if (selected.size === 0) {
            alert('Must select a task');
        } else if (selected.size > 1) {
            alert('Must select exact one task');
        } else {
            const ids = Array.from(selected);
            router.push(`/task/${ids[0]}`);
        }
    };

    const renderedTasks = applyPagination(tasks, page, rowsPerPage);

    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={3}>
                <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Typography variant="h4">Tasks</Typography>
                </Stack>
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                >
                    <Button
                        startIcon={
                            <PlusIcon fontSize="var(--icon-fontSize-md)" />
                        }
                        onClick={handleAddTaskClick}
                        variant="contained"
                    >
                        Add
                    </Button>
                    <Button
                        startIcon={
                            <MinusIcon fontSize="var(--icon-fontSize-md)" />
                        }
                        onClick={handleDeleteTask}
                        variant="contained"
                    >
                        Remove
                    </Button>
                    <Button
                        startIcon={
                            <PlayIcon fontSize="var(--icon-fontSize-md)" />
                        }
                        onClick={handleTaskRun}
                        variant="contained"
                    >
                        Run
                    </Button>
                </Stack>
            </Stack>
            <Card sx={{ p: 2 }}>
                <OutlinedInput
                    defaultValue=""
                    fullWidth
                    placeholder="Search tasks"
                    startAdornment={
                        <InputAdornment position="start">
                            <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                        </InputAdornment>
                    }
                    sx={{ maxWidth: '500px' }}
                />
            </Card>
            {renderedTasks && (
                <TasksTable
                    count={renderedTasks.length}
                    page={page}
                    rows={renderedTasks}
                    rowsPerPage={rowsPerPage}
                    selectedIds={selected}
                    setSelectedIds={setSelected}
                />
            )}
            <TaskFormModal
                open={isModalVisible}
                onClose={handleCloseModal}
                onSubmit={handleCreateTask}
            />
        </Stack>
    );
}

function applyPagination(
    rows: Task[],
    page: number,
    rowsPerPage: number
): Task[] {
    return rows?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}
