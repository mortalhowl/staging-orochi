import { Modal, Button, Stack, TextInput, Switch, Tabs, FileInput, Image, Divider, Group, Text, Box } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconPhoto, IconLink } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import type { Event } from '../../../types';
import slugify from 'slugify';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMantineColorScheme } from '@mantine/core';

// 1. Cập nhật interface cho form để bao gồm thời gian bán vé
interface EventFormValues {
  title: string;
  description: string;
  location: string;
  start_time: Date | null;
  end_time: Date | null;
  sale_start_time: Date | null; // Thêm mới
  sale_end_time: Date | null;   // Thêm mới
  cover_image_url: string;
  is_active: boolean;
}

interface EventFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventToEdit?: Event | null;
}

export function EventFormModal({ opened, onClose, onSuccess, eventToEdit }: EventFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const isEditing = !!eventToEdit;

  const form = useForm<EventFormValues>({
    initialValues: {
      title: '',
      description: '',
      location: '',
      start_time: null,
      end_time: null,
      sale_start_time: null, // Thêm mới
      sale_end_time: null,   // Thêm mới
      cover_image_url: '',
      is_active: true,
    },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : 'Tên sự kiện không được để trống'),
      start_time: (value) => (value ? null : 'Thời gian bắt đầu không được để trống'),
      end_time: (value, values) => {
        if (!value) return 'Thời gian kết thúc không được để trống';
        if (values.start_time && value <= values.start_time) {
          return 'Thời gian kết thúc phải sau thời gian bắt đầu';
        }
        return null;
      },
      // (Tùy chọn) Thêm validation cho thời gian bán vé
      sale_end_time: (value, values) => {
        if (values.sale_start_time && value && value <= values.sale_start_time) {
          return 'Thời gian kết thúc bán vé phải sau thời gian bắt đầu';
        }
        return null;
      },
    },
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  useEffect(() => {
    if (eventToEdit && opened) {
      form.setValues({
        title: eventToEdit.title,
        location: eventToEdit.location || '',
        start_time: eventToEdit.start_time ? new Date(eventToEdit.start_time) : null,
        end_time: eventToEdit.end_time ? new Date(eventToEdit.end_time) : null,
        sale_start_time: eventToEdit.sale_start_time ? new Date(eventToEdit.sale_start_time) : null,
        sale_end_time: eventToEdit.sale_end_time ? new Date(eventToEdit.sale_end_time) : null,
        cover_image_url: eventToEdit.cover_image_url || '',
        is_active: eventToEdit.is_active,
      });
      // 3. Điền nội dung vào editor
      editor?.commands.setContent(eventToEdit.description || '');
      setImagePreview(eventToEdit.cover_image_url);
    } else {
      form.reset();
      editor?.commands.clearContent();
      setCoverFile(null);
      setImagePreview(null);
    }
  }, [eventToEdit, opened]);

  useEffect(() => {
    if (eventToEdit && opened) {
      form.setValues({
        title: eventToEdit.title,
        description: eventToEdit.description || '',
        location: eventToEdit.location || '',
        start_time: eventToEdit.start_time ? new Date(eventToEdit.start_time) : null,
        end_time: eventToEdit.end_time ? new Date(eventToEdit.end_time) : null,
        sale_start_time: eventToEdit.sale_start_time ? new Date(eventToEdit.sale_start_time) : null, // Thêm mới
        sale_end_time: eventToEdit.sale_end_time ? new Date(eventToEdit.sale_end_time) : null,       // Thêm mới
        cover_image_url: eventToEdit.cover_image_url || '',
        is_active: eventToEdit.is_active,
      });
      setImagePreview(eventToEdit.cover_image_url);
    } else {
      form.reset();
      setCoverFile(null);
      setImagePreview(null);
    }
  }, [eventToEdit, opened]);

  useEffect(() => {
    if (eventToEdit && opened) {
      form.setValues({
        title: eventToEdit.title,
        description: eventToEdit.description || '',
        location: eventToEdit.location || '',
        start_time: eventToEdit.start_time ? new Date(eventToEdit.start_time) : null,
        end_time: eventToEdit.end_time ? new Date(eventToEdit.end_time) : null,
        cover_image_url: eventToEdit.cover_image_url || '',
        is_active: eventToEdit.is_active,
      });
      setImagePreview(eventToEdit.cover_image_url);
    } else {
      form.reset();
      setCoverFile(null);
      setImagePreview(null);
    }
  }, [eventToEdit, opened]);

  // Tạo ảnh xem trước khi người dùng chọn file
  useEffect(() => {
    if (coverFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(coverFile);
    }
  }, [coverFile]);

  const handleSubmit = async (values: EventFormValues) => {
    setLoading(true);
    const description = editor?.getHTML() || '';
    try {
      let finalCoverImageUrl = values.cover_image_url;

      // 1. Ưu tiên file upload. Nếu có file, upload và lấy URL mới.
      if (coverFile) {
        const fileName = `${Date.now()}_${coverFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(data.path);
        finalCoverImageUrl = urlData.publicUrl;
      }

      // 2. LOGIC TẠO SLUG
      let finalSlug = eventToEdit?.slug; // Mặc định giữ slug cũ nếu đang sửa

      // Chỉ tạo slug mới khi:
      // - Đây là sự kiện mới (không có eventToEdit)
      // - Hoặc khi tên sự kiện (title) bị thay đổi
      if (!isEditing || (isEditing && eventToEdit.title !== values.title)) {
        const baseSlug = slugify(values.title, {
          lower: true,      // chuyển thành chữ thường
          strict: true,     // xóa các ký tự đặc biệt
          locale: 'vi',     // xử lý ký tự tiếng Việt
          trim: true        // loại bỏ khoảng trắng thừa
        });

        // Thêm một hậu tố ngẫu nhiên ngắn để đảm bảo slug là duy nhất
        // mà không cần truy vấn lại database
        finalSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
      }

      const submissionData = {
        ...values,
        description,
        slug: finalSlug,
        cover_image_url: finalCoverImageUrl,
        start_time: values.start_time ? new Date(values.start_time).toISOString() : null,
        end_time: values.end_time ? new Date(values.end_time).toISOString() : null,
        sale_start_time: values.sale_start_time ? new Date(values.sale_start_time).toISOString() : null,
        sale_end_time: values.sale_end_time ? new Date(values.sale_end_time).toISOString() : null,
      };

      if (isEditing) {
        // Luôn gửi toàn bộ object `submissionData` để update
        const { error } = await supabase.from('events').update(submissionData).eq('id', eventToEdit.id);
        if (error) throw error;
        notifications.show({ title: 'Thành công', message: 'Cập nhật sự kiện thành công!', color: 'green', icon: <IconCheck /> });
      } else {
        const { error } = await supabase.from('events').insert([submissionData]);
        if (error) throw error;
        notifications.show({ title: 'Thành công', message: 'Tạo sự kiện mới thành công!', color: 'green', icon: <IconCheck /> });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ title: 'Thất bại', message: err.message || 'Đã có lỗi xảy ra', color: 'red', icon: <IconX /> });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => { }}
      withCloseButton={false}
      title={<Text fw={600} style={{ flex: 1 }}>{isEditing ? 'Sửa sự kiện' : 'Tạo sự kiện mới'}</Text>}
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack >

          {/* Tiêu đề & trạng thái */}
          <Group align="center">
            <TextInput
              required
              label="Tên sự kiện"
              placeholder="Nhập tên sự kiện..."
              style={{ flex: 3 }} // 3 phần -> 75%
              {...form.getInputProps('title')}
            />
            <Switch
              label="Kích hoạt"
              style={{ flex: 1 }} // 1 phần -> 25%
              {...form.getInputProps('is_active', { type: 'checkbox' })}
            />
          </Group>


          {/* Mô tả & địa điểm */}
          <Stack gap={4} mt="sm">
            <Text component="label" fw={500} fz="sm">Mô tả</Text>
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
              <RichTextEditor.Content mih={200} />
            </RichTextEditor>
          </Stack>
          <TextInput
            label="Địa điểm"
            placeholder="Nhập địa điểm..."
            {...form.getInputProps('location')}
          />

          {/* Thời gian diễn ra */}
          <Divider label="Thời gian diễn ra" labelPosition="center" />
          <Group grow>
            <DateTimePicker
              required
              label="Bắt đầu"
              placeholder="Chọn ngày giờ"
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps('start_time')}
            />
            <DateTimePicker
              required
              label="Kết thúc"
              placeholder="Chọn ngày giờ"
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps('end_time')}
            />
          </Group>

          {/* Thời gian mở bán vé */}
          <Divider label="Thời gian mở bán vé" labelPosition="center" />
          <Group grow>
            <DateTimePicker
              label="Bắt đầu bán vé"
              placeholder="Chọn ngày giờ"
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps('sale_start_time')}
            />
            <DateTimePicker
              label="Kết thúc bán vé"
              placeholder="Chọn ngày giờ"
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps('sale_end_time')}
            />
          </Group>

          {/* Ảnh bìa */}
          <Divider label="Ảnh bìa sự kiện" labelPosition="center" />
          <Tabs defaultValue="upload" variant="pills" radius="md">
            <Tabs.List justify='center'>
              <Tabs.Tab
                value="upload"
                leftSection={<IconPhoto size={16} />}
              >
                Tải lên ảnh
              </Tabs.Tab>
              <Tabs.Tab
                value="url"
                leftSection={<IconLink size={16} />}
              >
                Dùng link URL
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="upload" pt="xs">
              <FileInput
                label="Chọn ảnh bìa"
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
                label="URL ảnh bìa"
                placeholder="https://example.com/image.png"
                {...form.getInputProps('cover_image_url')}
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