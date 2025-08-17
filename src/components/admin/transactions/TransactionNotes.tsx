import { useState, useEffect } from 'react';
import { Stack, Textarea, Button, Group, Text, Paper, Avatar, Loader, Center, ScrollArea } from '@mantine/core';
import { supabase } from '../../../services/supabaseClient';
import { useAuthStore } from '../../../store/authStore';
import { notifications } from '@mantine/notifications';
import { formatDateTime } from '../../../utils/formatters';
import { IconSend } from '@tabler/icons-react';

interface TransactionNotesProps {
  transactionId: string;
}

interface Note {
  id: string;
  note: string;
  created_at: string;
  users: {
    full_name: string;
    avatar_url: string;
  } | null;
}

export function TransactionNotes({ transactionId }: TransactionNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuthStore();

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transaction_notes')
      .select('*, users(full_name, avatar_url)')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching notes:", error);
      notifications.show({ title: 'Lỗi', message: 'Không thể tải ghi chú.', color: 'red' });
    } else {
      setNotes(data as Note[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (transactionId) {
      fetchNotes();
    }
  }, [transactionId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from('transaction_notes').insert({
      transaction_id: transactionId,
      user_id: userProfile?.id,
      note: newNote,
    });

    if (error) {
      notifications.show({ title: 'Lỗi', message: 'Thêm ghi chú thất bại.', color: 'red' });
    } else {
      setNewNote('');
      fetchNotes(); // Tải lại danh sách ghi chú
    }
    setSubmitting(false);
  };

  if (loading) {
    return <Center><Loader /></Center>;
  }

  return (
    <Stack justify="space-between" h="calc(80vh - 100px)">
      <ScrollArea>
      <Stack gap="xs">
        {notes.map((note) => {
          const isMine = note.users?.full_name === userProfile?.full_name;

          return (
            <Group
              key={note.id}
              align="flex-start"
              justify={isMine ? 'flex-end' : 'flex-start'}
              style={{ width: '95%' }}
            >
              {!isMine && <Avatar src={note.users?.avatar_url} size="md" radius="xl" />}

              <Stack
                gap={4}
                align={isMine ? 'flex-end' : 'flex-start'}
                style={{ maxWidth: '70%' }}
              >
                <Paper
                  p="9px"
                  radius="xl"
                  style={{
                    backgroundColor: isMine ? '#228be6' : '#f1f3f5',
                    color: isMine ? 'white' : 'black',
                  }}
                >
                  <Text size="sm">{note.note}</Text>
                </Paper>
                <Text size="xs" c="dimmed">
                  {note.users?.full_name || 'Không rõ'} - {formatDateTime(note.created_at)}
                </Text>
              </Stack>

              {isMine && <Avatar src={note.users?.avatar_url} size="md" radius="xl" />}
            </Group>
          );
        })}

        {notes.length === 0 && <Text c="dimmed" ta="center">Chưa có ghi chú nào.</Text>}
      </Stack>
      </ScrollArea>

      <Group mt="md" gap="xs" align="flex-end" wrap="nowrap" style={{ width: '100%' }}>
        <Textarea
          placeholder="Nhập ghi chú nội bộ..."
          value={newNote}
          onChange={(e) => setNewNote(e.currentTarget.value)}
          minRows={1}
          autosize
          w="100%"
          radius="xl"
          styles={{
            input: { fontSize: 14 },
          }}
        />
        <Button
          onClick={handleAddNote}
          loading={submitting}
          radius="xl"
          px="sm"
          style={{
            alignSelf: 'stretch', // cao bằng Textarea
            backgroundColor: '#228be6',
          }}
        >
          <IconSend size={18} />
        </Button>
      </Group>
    </Stack>
  );
}
