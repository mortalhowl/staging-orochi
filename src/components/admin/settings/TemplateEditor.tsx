import { Paper, TextInput, Button, Stack, Title, LoadingOverlay } from '@mantine/core';
import { useForm } from '@mantine/form';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { notifications } from '@mantine/notifications';

interface TemplateEditorProps {
  templateType: 'purchase_confirmation' | 'invitation_ticket' | 'resend_ticket';
  title: string;
}

export function TemplateEditor({ templateType, title }: TemplateEditorProps) {
  const [loading, setLoading] = useState(true);
  const form = useForm({ initialValues: { subject: '', content: '' } });

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);
      const { data } = await supabase.from('email_templates').select('*').eq('type', templateType).single();
      if (data) {
        form.setValues({ subject: data.subject, content: data.content });
        editor?.commands.setContent(data.content || '');
      }
      setLoading(false);
    };
    fetchTemplate();
  }, [templateType]);

  const handleSubmit = async (values: { subject: string }) => {
    setLoading(true);
    const content = editor?.getHTML() || '';
    const { error } = await supabase.from('email_templates').upsert({
      type: templateType,
      subject: values.subject,
      content: content,
    }, { onConflict: 'type' });

    if (error) {
      notifications.show({ title: 'Lỗi', message: 'Lưu mẫu thất bại', color: 'red' });
    } else {
      notifications.show({ title: 'Thành công', message: 'Đã lưu mẫu email.' });
    }
    setLoading(false);
  };

  return (
    <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Title order={4}>{title}</Title>
          <TextInput required label="Tiêu đề Email" {...form.getInputProps('subject')} />
<RichTextEditor editor={editor}>
                            <RichTextEditor.Toolbar sticky stickyOffset={60}>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.Bold /> <RichTextEditor.Italic /> <RichTextEditor.Underline />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.H1 /> <RichTextEditor.H2 /> <RichTextEditor.H3 />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.BulletList /> <RichTextEditor.OrderedList />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.Link /> <RichTextEditor.Unlink />
                                </RichTextEditor.ControlsGroup>
                            </RichTextEditor.Toolbar>
                            <RichTextEditor.Content />
                        </RichTextEditor>
          <Button type="submit" mt="md" style={{ alignSelf: 'flex-end' }}>Lưu mẫu</Button>
        </Stack>
      </form>
    </Paper>
  );
}