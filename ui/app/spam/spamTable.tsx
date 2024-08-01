import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Note as NoteIcon } from '@phosphor-icons/react/dist/ssr/Note';
import { Mailbox as MailboxIcon } from '@phosphor-icons/react/dist/ssr/Mailbox';

import { useSelection } from '@/hooks/use-selection';
import { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import { ListItemText, Menu } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { useRouter } from 'next/navigation';
import { format } from 'timeago.js';
import { SpamEmail } from '@/types/spam';
import SpamModal from './spamView';

interface CustomersTableProps {
    rows?: SpamEmail[];
    rowsPerPage?: number;
    selectedIds: Set<string>;
    setSelectedIds: any;
    fetchSpams: () => Promise<void>;
}

function applyPagination(
    rows: SpamEmail[],
    page: number,
    rowsPerPage: number
): SpamEmail[] {
    return rows?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}

export function SpamTable({
    rows = [],
    selectedIds,
    setSelectedIds,
    // @ts-ignore
    fetchSpams,
}: CustomersTableProps): React.JSX.Element {
    const rowIds = React.useMemo(() => {
        return rows.map((context) => context.ID);
    }, [rows]);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const { selectAll, deselectAll, selectOne, deselectOne, selected } =
        useSelection(rowIds, selectedIds, setSelectedIds, page, rowsPerPage);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [editingSpamEmails, setEditingSpamEmails] = useState<SpamEmail>();
    const [renderedSpamEmails, setRenderedSpamEmails] = useState<SpamEmail[]>(
        []
    );

    useEffect(() => {
        setRenderedSpamEmails(applyPagination(rows, page, rowsPerPage));
    }, [rows, page, rowsPerPage]);

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleMenuOpen = (
        event: React.MouseEvent<HTMLElement>,
        row: SpamEmail
    ) => {
        setMenuAnchorEl(event.currentTarget);
        setEditingSpamEmails(row);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleViewSpamClick = () => {
        setIsModalVisible(true);
        setMenuAnchorEl(null);
    };

    const handleMovebackSpamClick = async (id: string) => {
        const response = await fetch(`/api/spams/${id}/moveback`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to move back to inbox');
        }
        fetchSpams();
    };

    const handleDeleteSpamsClick = async (id: string) => {
        const response = await fetch(`/api/spams/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete context');
        }
        fetchSpams();
        console.log('Spam deleted: ', id);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const selectedSome =
        (selected?.size ?? 0) > 0 && (selected?.size ?? 0) < rows.length;
    const selectedAll = rows.length > 0 && selected?.size === rows.length;

    return (
        <Card>
            <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: '800px' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={selectedAll}
                                    indeterminate={selectedSome}
                                    onChange={(event) => {
                                        if (event.target.checked) {
                                            selectAll();
                                        } else {
                                            deselectAll();
                                        }
                                    }}
                                />
                            </TableCell>
                            <TableCell>Subject</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {renderedSpamEmails.map((row) => {
                            const isSelected = selected?.has(row.ID);

                            return (
                                <TableRow
                                    hover
                                    key={row.ID}
                                    selected={isSelected}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={(event) => {
                                                if (event.target.checked) {
                                                    selectOne(row.ID);
                                                } else {
                                                    deselectOne(row.ID);
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Stack
                                            sx={{ alignItems: 'center' }}
                                            direction="row"
                                            spacing={2}
                                        >
                                            <Typography variant="subtitle2">
                                                {row.Subject}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        {format(row.CreatedAt, 'en_us')}
                                    </TableCell>
                                    <TableCell sx={{ width: '50px' }}>
                                        <IconButton
                                            onClick={(event) =>
                                                handleMenuOpen(event, row)
                                            }
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                        <Menu
                                            anchorEl={menuAnchorEl}
                                            open={Boolean(menuAnchorEl)}
                                            onClose={handleMenuClose}
                                        >
                                            <MenuItem
                                                onClick={handleViewSpamClick}
                                            >
                                                <ListItemIcon>
                                                    <NoteIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="View" />
                                            </MenuItem>
                                            <MenuItem
                                                onClick={() =>
                                                    handleMovebackSpamClick(
                                                        row.ID
                                                    )
                                                }
                                            >
                                                <ListItemIcon>
                                                    <MailboxIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Move Back" />
                                            </MenuItem>
                                            <MenuItem
                                                style={{
                                                    color: 'red',
                                                    fontWeight: 'bold',
                                                }}
                                                onClick={() =>
                                                    handleDeleteSpamsClick(
                                                        row.ID
                                                    )
                                                }
                                            >
                                                <ListItemIcon
                                                    style={{ color: 'red' }}
                                                >
                                                    <TrashIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Delete" />
                                            </MenuItem>
                                        </Menu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Box>
            <Divider />
            <TablePagination
                component="div"
                count={rows.length}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
            />
            <SpamModal
                open={isModalVisible}
                onClose={handleCloseModal}
                spam={editingSpamEmails}
            />
        </Card>
    );
}
