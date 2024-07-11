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
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Pencil as PencilIcon } from '@phosphor-icons/react/dist/ssr/Pencil';

import { useSelection } from '@/hooks/use-selection';
import { useState } from 'react';
import ContextFormModal from '@/app/contexts/contextForm';
import IconButton from '@mui/material/IconButton';
import { ListItemText, Menu } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { useRouter } from 'next/navigation';

interface CustomersTableProps {
    count?: number;
    page?: number;
    rows?: Context[];
    rowsPerPage?: number;
    selectedIds: Set<string>;
    setSelectedIds: any;
    fetchContexts: () => Promise<void>;
}

function noop(): void {
    // do nothing
}

export function ContextsTable({
    count = 0,
    rows = [],
    page = 0,
    rowsPerPage = 0,
    selectedIds,
    setSelectedIds,
    // @ts-ignore
    fetchContexts,
}: CustomersTableProps): React.JSX.Element {
    const rowIds = React.useMemo(() => {
        return rows.map((context) => context.ID);
    }, [rows]);

    const router = useRouter();
    const { selectAll, deselectAll, selectOne, deselectOne, selected } =
        useSelection(rowIds, selectedIds, setSelectedIds);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [editingContext, setEditingContext] = useState<Context>();

    const handleMenuOpen = (
        event: React.MouseEvent<HTMLElement>,
        row: Context
    ) => {
        setMenuAnchorEl(event.currentTarget);
        setEditingContext(row);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleUpdateContextClick = () => {
        setIsModalVisible(true);
        setMenuAnchorEl(null);
    };

    const handleDeleteContextClick = async (id: string) => {
        const response = await fetch(`/api/contexts/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete context');
        }
        fetchContexts();
        console.log('Context deleted: ', id);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const handleUpdateContext = async (
        name: string,
        description: string,
        content: string,
        id?: string
    ) => {
        const response = await fetch(`/api/contexts/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description, content }),
        });

        if (!response.ok) {
            console.error(new Error('Failed to create context'));
        }
        setIsModalVisible(false);
        fetchContexts();
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
                            <TableCell>Name</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Created</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => {
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
                                                {row.Name}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{row.Description}</TableCell>
                                    <TableCell>
                                        {dayjs(row.CreatedAt).format(
                                            'YYYY-MM-DD HH:mm'
                                        )}
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
                                                onClick={
                                                    handleUpdateContextClick
                                                }
                                            >
                                                <ListItemIcon>
                                                    <PencilIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Edit" />
                                            </MenuItem>
                                            <MenuItem
                                                style={{
                                                    color: 'red',
                                                    fontWeight: 'bold',
                                                }}
                                                onClick={() =>
                                                    handleDeleteContextClick(
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
                count={count}
                page={page}
                onPageChange={noop}
                onRowsPerPageChange={noop}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
            />
            <ContextFormModal
                open={isModalVisible}
                onClose={handleCloseModal}
                onSubmit={handleUpdateContext}
                context={editingContext}
                create={false}
            />
        </Card>
    );
}