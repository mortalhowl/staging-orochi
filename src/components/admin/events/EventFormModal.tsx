import { Modal, Button, Stack, TextInput, Textarea, Switch, Tabs, FileInput, Image, rem, Divider } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconPhoto, IconLink } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import type { Event } from '../../../types';
import slugify from 'slugify';

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
    <Modal opened={opened} onClose={onClose} title={isEditing ? 'Cập nhật sự kiện' : 'Tạo sự kiện mới'} centered size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput required label="Tên sự kiện" placeholder="Nhập tên sự kiện..." {...form.getInputProps('title')} />
          <Textarea label="Mô tả" placeholder="Nhập mô tả..." {...form.getInputProps('description')} />
          <TextInput label="Địa điểm" placeholder="Nhập địa điểm..." {...form.getInputProps('location')} />
          
          <Divider label="Thời gian diễn ra" labelPosition="center" my="sm" />
          <DateTimePicker required label="Bắt đầu" placeholder="Chọn ngày giờ" valueFormat="DD/MM/YYYY HH:mm" {...form.getInputProps('start_time')} />
          <DateTimePicker required label="Kết thúc" placeholder="Chọn ngày giờ" valueFormat="DD/MM/YYYY HH:mm" {...form.getInputProps('end_time')} />

          {/* 3. THÊM CÁC TRƯỜNG NHẬP LIỆU MỚI */}
          <Divider label="Thời gian mở bán vé" labelPosition="center" my="sm" />
          <DateTimePicker label="Bắt đầu bán vé" placeholder="Chọn ngày giờ" valueFormat="DD/MM/YYYY HH:mm" {...form.getInputProps('sale_start_time')} />
          <DateTimePicker label="Kết thúc bán vé" placeholder="Chọn ngày giờ" valueFormat="DD/MM/YYYY HH:mm" {...form.getInputProps('sale_end_time')} />

          <Divider my="sm" />
          
          <Tabs defaultValue="upload">
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
              <TextInput label="URL Ảnh bìa" placeholder="https://example.com/image.png" {...form.getInputProps('cover_image_url')} />
            </Tabs.Panel>
          </Tabs>

          <Switch label="Kích hoạt sự kiện" {...form.getInputProps('is_active', { type: 'checkbox' })} />
          <Button type="submit" mt="md" loading={loading}>
            Lưu
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}