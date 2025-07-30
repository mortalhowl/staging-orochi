import { Modal, Button, Stack, TextInput, Select, rem, Tabs, FileInput, Image, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import type { Article } from '../../../types';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { IconCheck, IconX, IconPhoto, IconLink } from '@tabler/icons-react';
import slugify from 'slugify';

interface ArticleFormModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    events: { value: string; label: string }[];
    articleToEdit?: Article | null;
}

export function ArticleFormModal({ opened, onClose, onSuccess, events, articleToEdit }: ArticleFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const isEditing = !!articleToEdit;

    const form = useForm({
        initialValues: {
            title: '',
            event_id: null as string | null,
            image_url: '',
        },
        validate: {
            title: (value) => (value.trim().length > 0 ? null : 'Tiêu đề không được để trống'),
        },
    });

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: false, // Tắt extension 'link' mặc định của StarterKit
            }),
            Link, // Sử dụng extension 'Link' của Mantine
        ],
        content: '',
    });

    useEffect(() => {
        if (articleToEdit && opened) {
            form.setValues({
                title: articleToEdit.title,
                event_id: articleToEdit.event_id,
                image_url: articleToEdit.image_url || '',
            });
            editor?.commands.setContent(articleToEdit.content || '');
            setImagePreview(articleToEdit.image_url);
        } else {
            form.reset();
            editor?.commands.clearContent();
            setCoverFile(null);
            setImagePreview(null);
        }
    }, [articleToEdit, opened]);

    useEffect(() => {
        if (coverFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(coverFile);
        }
    }, [coverFile]);

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        const content = editor?.getHTML();
        
        // Có thể sẽ cần dùng
        // if (!content || content === '<p></p>') {
        //     notifications.show({ title: 'Lỗi', message: 'Nội dung bài viết không được để trống.', color: 'red' });
        //     setLoading(false);
        //     return;
        // }

        try {
            // SỬA LỖI Ở ĐÂY
            // 1. Lấy URL từ form làm giá trị cơ sở.
            // Nó có thể là URL mới người dùng dán vào, hoặc URL cũ khi sửa, hoặc chuỗi rỗng.
            let finalImageUrl = values.image_url;

            // 2. Nếu có file được tải lên, nó sẽ được ưu tiên và ghi đè lên URL trên.
            if (coverFile) {
                const fileName = `${Date.now()}_${coverFile.name}`;
                const { data, error: uploadError } = await supabase.storage.from('event-images').upload(fileName, coverFile);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(data.path);
                finalImageUrl = urlData.publicUrl;
            }

            let finalSlug = articleToEdit?.slug;
            if (!isEditing || (isEditing && articleToEdit.title !== values.title)) {
                const baseSlug = slugify(values.title, {
                    lower: true,
                    strict: true,
                    locale: 'vi',
                    trim: true,
                });
                finalSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
            }

            const submissionData = {
                title: values.title,
                event_id: values.event_id,
                slug: finalSlug, // 3. Thêm slug vào dữ liệu
                content,
                image_url: finalImageUrl,
            };

            if (isEditing) {
                const { error } = await supabase.from('articles').update(submissionData).eq('id', articleToEdit.id);
                if (error) throw error;
                notifications.show({ title: 'Thành công', message: 'Đã cập nhật bài viết.' });
            } else {
                const { error } = await supabase.from('articles').insert([submissionData]);
                if (error) throw error;
                notifications.show({ title: 'Thành công', message: 'Đã tạo bài viết mới.' });
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={isEditing ? 'Sửa bài viết' : 'Tạo bài viết mới'} size="xl">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <TextInput required label="Tiêu đề bài viết" {...form.getInputProps('title')} />
                    <Select
                        label="Gắn với sự kiện (Tùy chọn)"
                        placeholder="Chọn một sự kiện"
                        data={events}
                        searchable
                        clearable
                        {...form.getInputProps('event_id')}
                    />

                    <Stack gap={4} mt="sm">
                        <Text component="label" fw={500} fz="sm">Nội dung</Text>
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
                    </Stack>

                    <Tabs defaultValue="upload" mt="md">
                        <Tabs.List>
                            <Tabs.Tab value="upload" leftSection={<IconPhoto style={{ width: rem(16), height: rem(16) }} />}>
                                Tải lên ảnh
                            </Tabs.Tab>
                            <Tabs.Tab value="url" leftSection={<IconLink style={{ width: rem(16), height: rem(16) }} />}>
                                Dùng link URL
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="upload" pt="xs">
                            <FileInput label="Ảnh bìa" placeholder="Chọn file ảnh" accept="image/png,image/jpeg" onChange={setCoverFile} />
                            {imagePreview && <Image src={imagePreview} mt="sm" radius="md" h={200} fit="contain" />}
                        </Tabs.Panel>

                        <Tabs.Panel value="url" pt="xs">
                            <TextInput label="URL Ảnh bìa" placeholder="https://example.com/image.png" {...form.getInputProps('image_url')} />
                        </Tabs.Panel>
                    </Tabs>

                    <Button type="submit" mt="md" loading={loading}>Lưu bài viết</Button>
                </Stack>
            </form>
        </Modal>
    );
}