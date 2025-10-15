// src/components/admin/settings/TemplateEditor.tsx
import { Paper, TextInput, Button, Stack, Title, LoadingOverlay } from '@mantine/core';
import { useForm } from '@mantine/form';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { SettingsApi } from '../../../services/api/settings'; // <-- IMPORT SERVICE
import type { EmailTemplateType } from '../../../types'; // <-- IMPORT TYPE

interface TemplateEditorProps {
  templateType: EmailTemplateType;
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
      try {
        const template = await SettingsApi.getEmailTemplate(templateType);
        if (template) {
          form.setValues({ subject: template.subject, content: template.content });
          editor?.commands.setContent(template.content || '');
        }
      } catch (error: any) {
        notifications.show({ title: 'Lỗi', message: error.message, color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [templateType, editor]); // Thêm editor vào dependency array

  const handleSubmit = async (values: { subject: string }) => {
    setLoading(true);
    const content = editor?.getHTML() || '';
    try {
      await SettingsApi.upsertEmailTemplate({
        type: templateType,
        subject: values.subject,
        content: content,
      });
      notifications.show({ title: 'Thành công', message: 'Đã lưu mẫu email.' });
    } catch (error: any) {
      notifications.show({ title: 'Lỗi', message: 'Lưu mẫu thất bại', color: 'red' });
    } finally {
      setLoading(false);
    }
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