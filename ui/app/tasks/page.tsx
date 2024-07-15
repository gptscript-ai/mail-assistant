'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { MinusCircle as MinusIcon } from '@phosphor-icons/react/dist/ssr/MinusCircle';

import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { useEffect, useState } from 'react';
import TaskFormModal from '@/app/tasks/taskForm';
import { TasksTable } from '@/app/tasks/taskTable';
import { Task } from '@/types/task';
import { Message } from '@/types/message';

export default function Page(): React.JSX.Element {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [contexts, setContexts] = React.useState<Context[]>([]);

    const fetchContexts = async () => {
        try {
            const response = await fetch('/api/contexts');
            let contexts: Context[] = await response.json();
            contexts = contexts?.sort((a, b) => {
                if (a.CreatedAt < b.CreatedAt) {
                    return -1;
                }
                if (a.CreatedAt > b.CreatedAt) {
                    return 1;
                }
                return 0;
            });
            setContexts(contexts);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddTaskClick = () => {
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const assignMessagesToTasks = (
        tasks: Task[],
        messages: Message[]
    ): Task[] => {
        const taskMap: { [key: string]: Task } = {};

        tasks?.forEach((task) => {
            task.Messages = [];
            taskMap[task.ID] = task;
        });

        messages?.forEach((message) => {
            const task = taskMap[message.TaskID];
            if (task) {
                task.Messages.push(message);
            }
        });

        return tasks;
    };

    const fetchTasks = async () => {
        try {
            const taskResponse = await fetch('/api/tasks');
            let tasks: Task[] = await taskResponse.json();
            const messageResponse = await fetch('/api/messages');
            let messages: Message[] = await messageResponse.json();
            tasks = assignMessagesToTasks(tasks, messages);
            setTasks(tasks);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateTask = async (
        name: string,
        description: string,
        context: string,
        id?: string,
        contextIds?: string[]
    ) => {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    context,
                    contextIds,
                }),
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
        fetchContexts();
        setInterval(() => fetchTasks(), 10000);
        setInterval(() => fetchContexts(), 10000);
    }, []);

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
                        color="primary"
                    >
                        Add
                    </Button>
                    {selected.size > 0 && (
                        <Stack direction="row" spacing={1}>
                            <Button
                                startIcon={
                                    <MinusIcon fontSize="var(--icon-fontSize-md)" />
                                }
                                onClick={handleDeleteTask}
                                variant="contained"
                                color="error"
                            >
                                Remove
                            </Button>
                        </Stack>
                    )}
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
            {tasks && (
                <TasksTable
                    rows={tasks}
                    selectedIds={selected}
                    setSelectedIds={setSelected}
                    fetchTasks={fetchTasks}
                    contexts={contexts}
                />
            )}
            <TaskFormModal
                open={isModalVisible}
                onClose={handleCloseModal}
                onSubmit={handleCreateTask}
                create={true}
                contexts={contexts}
            />
        </Stack>
    );
}
