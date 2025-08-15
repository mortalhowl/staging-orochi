import { Modal, Button, Stack, TextInput, Select, Group, Divider, Tabs, FileInput, Image, Text, Switch, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { supabase } from '../../../services/supabaseClient';
import type { Article, ArticleStatus } from '../../../types';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { IconPhoto, IconLink } from '@tabler/icons-react';
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
            status: 'public' as ArticleStatus,
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
                status: articleToEdit.status,
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
                status: values.status,
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
        <Modal
            opened={opened}
            onClose={() => { }}
            withCloseButton={false}
            title={<Text fw={600} style={{ flex: 1 }}>{isEditing ? 'Sửa bài viết' : 'Tạo bài viết mới'}</Text>}
            size="lg"
            centered
        >
            <form id="article-form" onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    {/* Tiêu đề & sự kiện */}

                    <Group align="center">
                        <TextInput
                            required
                            label="Tên sự kiện"
                            placeholder="Nhập tên sự kiện..."
                            style={{ flex: 3 }} // 3 phần -> 75%
                            {...form.getInputProps('title')}
                        />
                        <Divider my="sm" />
                        <Switch
                            label="Công khai"
                            checked={form.values.status === 'public'}
                            style={{ flex: 1 }} // 1 phần -> 25%
                            onChange={(event) =>
                                form.setFieldValue(
                                    'status',
                                    event.currentTarget.checked ? 'public' : 'hidden'
                                )
                            }
                        />
                    </Group>

                    <Select
                        label="Gắn với sự kiện (Tùy chọn)"
                        placeholder="Chọn một sự kiện"
                        data={events}
                        searchable
                        clearable
                        {...form.getInputProps('event_id')}
                    />

                    {/* Nội dung */}
                    <Divider label="Nội dung bài viết" labelPosition="center" />
                    <Stack gap={4}>
                        <Text component="label" fw={500} fz="sm">
                            Nội dung
                        </Text>
                        <RichTextEditor editor={editor}>
                            <RichTextEditor.Toolbar sticky stickyOffset={60}>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.Bold />
                                    <RichTextEditor.Italic />
                                    <RichTextEditor.Underline />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.H1 />
                                    <RichTextEditor.H2 />
                                    <RichTextEditor.H3 />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.BulletList />
                                    <RichTextEditor.OrderedList />
                                </RichTextEditor.ControlsGroup>
                                <RichTextEditor.ControlsGroup>
                                    <RichTextEditor.Link />
                                    <RichTextEditor.Unlink />
                                </RichTextEditor.ControlsGroup>
                            </RichTextEditor.Toolbar>
                            <RichTextEditor.Content />
                        </RichTextEditor>
                    </Stack>

                    {/* Ảnh bìa */}
                    <Divider label="Ảnh bìa bài viết" labelPosition="center" />
                    <Tabs defaultValue="upload" variant="pills" radius="md">
                        <Tabs.List>
                            <Tabs.Tab value="upload" leftSection={<IconPhoto size={16} />}>
                                Tải lên ảnh
                            </Tabs.Tab>
                            <Tabs.Tab value="url" leftSection={<IconLink size={16} />}>
                                Dùng link URL
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="upload" pt="xs">
                            <FileInput
                                label="Ảnh bìa"
                                placeholder="Chọn file ảnh"
                                accept="image/png,image/jpeg"
                                onChange={setCoverFile}
                            />
                            {imagePreview && (
                                <Image
                                    src={imagePreview}
                                    mt="sm"
                                    radius="md"
                                    h={200}
                                    fit="contain"
                                />
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="url" pt="xs">
                            <TextInput
                                label="URL Ảnh bìa"
                                placeholder="https://example.com/image.png"
                                {...form.getInputProps('image_url')}
                            />
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
                <Box
                    pos="sticky"
                    bottom={0}
                    p="md"
                    style={(theme) => {
                        const { colorScheme } = useMantineColorScheme();
                        return {
                            backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
                            borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                            marginTop: 'auto',
                            marginLeft: -16,
                            marginRight: -16,
                            marginBottom: -16,
                        }
                    }}
                >
                    <Group justify="flex-end">
                        <Button
                            variant="light"
                            color="gray"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            loading={loading}
                        >
                            Lưu
                        </Button>
                    </Group>
                </Box>
            </form>
        </Modal>
    );
}