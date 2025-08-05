import { Table, Checkbox, LoadingOverlay, Text, Tooltip, Badge } from '@mantine/core';
import type { Article } from '../../../types';
import { formatDate } from '../../../utils/formatters';

interface ArticlesTableProps {
    articles: Article[];
    loading: boolean;
    selection: string[];
    setSelection: (selection: string[]) => void;
    onRowClick: (articleId: string) => void;
}

export function ArticlesTable({ articles, loading, selection, setSelection, onRowClick }: ArticlesTableProps) {
    const rows = articles.map((article) => (
        <Table.Tr
            key={article.id}
            bg={selection.includes(article.id) ? 'var(--mantine-color-blue-light)' : undefined}
        >
            <Table.Td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    aria-label="Select row"
                    checked={selection.includes(article.id)}
                    onChange={(e) =>
                        setSelection(
                            e.currentTarget.checked
                                ? [...selection, article.id]
                                : selection.filter((id) => id !== article.id)
                        )
                    }
                />
            </Table.Td>
            <Table.Td onClick={() => onRowClick(article.id)}>
                <Tooltip label={article.title} withArrow>
                    <Text truncate="end" style={{ maxWidth: 300 }}>{article.title}</Text>
                </Tooltip>
            </Table.Td>
            <Table.Td onClick={() => onRowClick(article.id)}>{article.events?.title || 'Không có'}</Table.Td>
            <Table.Td onClick={() => onRowClick(article.id)}>{formatDate(article.created_at)}</Table.Td>
            <Table.Td>
        <Badge color={article.status === 'public' ? 'green' : 'gray'}>
          {article.status === 'public' ? 'Công khai' : 'Ẩn'}
        </Badge>
      </Table.Td>
        </Table.Tr>
    ));

    return (
        <div style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
            <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th style={{ width: 40 }}>
                            <Checkbox
                                onChange={(e) =>
                                    setSelection(e.currentTarget.checked ? articles.map((item) => item.id) : [])
                                }
                                checked={selection.length > 0 && selection.length === articles.length}
                                indeterminate={selection.length > 0 && selection.length !== articles.length}
                            />
                        </Table.Th>
                        <Table.Th>Tên bài viết</Table.Th>
                        <Table.Th>Sự kiện liên quan</Table.Th>
                        <Table.Th>Ngày tạo</Table.Th>
                        <Table.Th>Trạng thái</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.length > 0 ? (
                        rows
                    ) : (
                        <Table.Tr>
                            <Table.Td colSpan={5} align="center">
                                Không có bài viết nào
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </div>
    );
}