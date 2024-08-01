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
import { SpamEmail } from '@/types/spam';
import { SpamTable } from './spamTable';
import SpamModal from './spamView';

export default function Page(): React.JSX.Element {
    const rowsPerPage = 15;
    const [spamEmails, setSpamEmails] = useState<SpamEmail[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredSpamEmails, setFilteredSpamEmails] = useState(spamEmails);

    useEffect(() => {
        if (searchQuery === '') {
            setFilteredSpamEmails(spamEmails);
        } else {
            setFilteredSpamEmails(
                spamEmails?.filter((spamEmails) =>
                    spamEmails.Subject.toLowerCase().includes(
                        searchQuery.toLowerCase()
                    )
                )
            );
        }
    }, [searchQuery, spamEmails]);

    const handleSearchChange = (event: any) => {
        setSearchQuery(event.target.value);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const fetchSpamEmails = async () => {
        try {
            const response = await fetch('/api/spams');
            let spams: SpamEmail[] = await response.json();
            spams = spams?.sort((a, b) => {
                if (a.CreatedAt < b.CreatedAt) {
                    return 1;
                }
                if (a.CreatedAt > b.CreatedAt) {
                    return -1;
                }
                return 0;
            });
            setSpamEmails(spams);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteSpamEmail = async () => {
        if (selected.size === 0) {
            alert('Must select at least one context to delete');
        }
        try {
            for (const id of Array.from(selected)) {
                const response = await fetch(`/api/spams/${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    throw new Error('Failed to delete context');
                }
                console.log('Spam deleted: ', id);
            }
            fetchSpamEmails();
            setSelected(new Set());
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchSpamEmails();
        setInterval(() => fetchSpamEmails(), 10000);
    }, []);

    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={3}>
                <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Typography variant="h4">Cold Email</Typography>
                </Stack>
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                >
                    {selected.size > 0 && (
                        <Stack direction="row" spacing={1}>
                            <Button
                                startIcon={
                                    <MinusIcon fontSize="var(--icon-fontSize-md)" />
                                }
                                onClick={handleDeleteSpamEmail}
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
                    value={searchQuery}
                    onChange={handleSearchChange}
                    fullWidth
                    placeholder="Search cold emails"
                    startAdornment={
                        <InputAdornment position="start">
                            <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                        </InputAdornment>
                    }
                    sx={{ maxWidth: '500px' }}
                />
            </Card>
            {filteredSpamEmails && (
                <SpamTable
                    rows={filteredSpamEmails}
                    rowsPerPage={rowsPerPage}
                    selectedIds={selected}
                    setSelectedIds={setSelected}
                    fetchSpams={fetchSpamEmails}
                />
            )}
            <SpamModal open={isModalVisible} onClose={handleCloseModal} />
        </Stack>
    );
}
