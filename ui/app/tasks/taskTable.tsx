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
import { useEffect, useMemo, useState } from 'react';
import TaskFormModal from '@/app/tasks/taskForm';
import IconButton from '@mui/material/IconButton';
import { ListItemText, Menu } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { useRouter } from 'next/navigation';
import ContextFormDialog from '@/app/tasks/contextDialog';
import Badge from '@mui/material/Badge';
import { Task } from '@/types/task';

interface CustomersTableProps {
    rows?: Task[];
    selectedIds: Set<string>;
    setSelectedIds: any;
    contexts: Context[];
    fetchTasks: () => Promise<void>;
}

function applyPagination(
    rows: Task[],
    page: number,
    rowsPerPage: number
): Task[] {
    return rows?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}

export function TasksTable({
    rows = [],
    selectedIds,
    setSelectedIds,
    contexts,
    // @ts-ignore
    fetchTasks,
}: CustomersTableProps): React.JSX.Element {
    const rowIds = useMemo(() => {
        return rows.map((task) => task.ID);
    }, [rows]);

    const router = useRouter();
    const { selectAll, deselectAll, selectOne, deselectOne, selected } =
        useSelection(rowIds, selectedIds, setSelectedIds);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [editingTask, setEditingTask] = useState<Task>();
    const [showContextDialog, setShowContextDialog] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [renderedTasks, setRenderedTasks] = useState<Task[]>([]);

    useEffect(() => {
        setRenderedTasks(applyPagination(rows, page, rowsPerPage));
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
        row: Task
    ) => {
        setMenuAnchorEl(event.currentTarget);
        setEditingTask(row);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleOnCloseDialog = () => {
        setShowContextDialog(false);
    };

    const handleRunTaskClick = (id: string) => {
        setMenuAnchorEl(null);
        if (
            editingTask?.Context ||
            (editingTask?.ContextIds && editingTask?.ContextIds.length > 0)
        ) {
            router.push(`/task/${editingTask.ID}`);
        } else {
            setShowContextDialog(true);
        }
    };

    const handleUpdateTaskClick = () => {
        setIsModalVisible(true);
        setMenuAnchorEl(null);
    };

    const handleDeleteTaskClick = async () => {
        const response = await fetch(`/api/tasks/${editingTask?.ID}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Failed to delete task');
        }
        await fetchTasks();
        setMenuAnchorEl(null);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const handleUpdateTask = async (
        name: string,
        description: string,
        context: string,
        id?: string,
        contextIds?: string[]
    ) => {
        const response = await fetch(`/api/tasks/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description, context, contextIds }),
        });

        if (!response.ok) {
            console.error(new Error('Failed to create task'));
        }
        setIsModalVisible(false);
        fetchTasks();
    };

    const hasUnreadMessage = (task: Task): boolean => {
        if (task.Messages && task.Messages.length > 0) {
            return task.Messages.some((m) => !m.Read);
        }
        return false;
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
                        {renderedTasks.map((row) => {
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
                                            <Badge
                                                variant="dot"
                                                color="error"
                                                invisible={
                                                    !hasUnreadMessage(row)
                                                }
                                                overlap="circular"
                                            >
                                                <MoreVertIcon />
                                            </Badge>
                                        </IconButton>
                                        <Menu
                                            anchorEl={menuAnchorEl}
                                            open={Boolean(menuAnchorEl)}
                                            onClose={handleMenuClose}
                                        >
                                            <MenuItem
                                                onClick={() =>
                                                    handleRunTaskClick(row.ID)
                                                }
                                            >
                                                <ListItemIcon>
                                                    <PlayIcon />
                                                </ListItemIcon>
                                                <ListItemText primary="Run" />
                                            </MenuItem>
                                            <MenuItem
                                                onClick={handleUpdateTaskClick}
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
                                                    handleDeleteTaskClick(
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
            <TaskFormModal
                open={isModalVisible}
                onClose={handleCloseModal}
                onSubmit={handleUpdateTask}
                task={editingTask}
                contexts={contexts}
                create={false}
            />
            {editingTask && (
                <ContextFormDialog
                    open={showContextDialog}
                    onClose={handleOnCloseDialog}
                    contexts={contexts}
                    task={editingTask}
                ></ContextFormDialog>
            )}
        </Card>
    );
}
