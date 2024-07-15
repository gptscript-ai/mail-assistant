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
import { useRouter } from 'next/navigation';
import ContextFormModal from '@/app/contexts/contextForm';
import { ContextsTable } from '@/app/contexts/contextTable';

export default function Page(): React.JSX.Element {
    const router = useRouter();
    const page = 0;
    const rowsPerPage = 15;
    const [contexts, setContexts] = useState<Context[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());

    const handleAddContextClick = () => {
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

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

    const handleCreateContext = async (
        name: string,
        description: string,
        content: string
    ) => {
        try {
            const response = await fetch('/api/contexts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, description, content }),
            });

            if (!response.ok) {
                throw new Error('Failed to create context');
            }

            const data = await response.json();
            console.log('Context created:', data);
            fetchContexts();
            setIsModalVisible(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteContext = async () => {
        if (selected.size === 0) {
            alert('Must select at least one context to delete');
        }
        try {
            for (const id of Array.from(selected)) {
                const response = await fetch(`/api/contexts/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Failed to delete context');
                }
                console.log('Context deleted: ', id);
            }
            fetchContexts();
            setSelected(new Set());
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchContexts();
        setInterval(() => fetchContexts(), 10000);
    }, []);

    const renderedContexts = applyPagination(contexts, page, rowsPerPage);

    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={3}>
                <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Typography variant="h4">Rule Sets</Typography>
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
                        onClick={handleAddContextClick}
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
                                onClick={handleDeleteContext}
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
                    placeholder="Search contexts"
                    startAdornment={
                        <InputAdornment position="start">
                            <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                        </InputAdornment>
                    }
                    sx={{ maxWidth: '500px' }}
                />
            </Card>
            {renderedContexts && (
                <ContextsTable
                    rows={renderedContexts}
                    rowsPerPage={rowsPerPage}
                    selectedIds={selected}
                    setSelectedIds={setSelected}
                    fetchContexts={fetchContexts}
                />
            )}
            <ContextFormModal
                open={isModalVisible}
                onClose={handleCloseModal}
                onSubmit={handleCreateContext}
                create={true}
            />
        </Stack>
    );
}

function applyPagination(
    rows: Context[],
    page: number,
    rowsPerPage: number
): Context[] {
    return rows?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}
