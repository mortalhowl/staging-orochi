import { useState, useEffect } from 'react';
import { Paper, Title, TextInput, Button, Stack, Textarea, Tabs, FileInput, Image, rem, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { supabase } from '../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconPhoto, IconLink } from '@tabler/icons-react';

interface CompanyInfoForm {
  id?: string;
  name: string;
  logo_url: string;
  tax_code: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  facebook_url: string;
  instagram_url: string;
  x_url: string;
  tiktok_url: string;
  youtube_url: string;
}

export function CompanyInfoPage() {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);

  const form = useForm<CompanyInfoForm>({
    initialValues: {
      name: '',
      logo_url: '',
      tax_code: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      facebook_url: '',
      instagram_url: '',
      x_url: '',
      tiktok_url: '',
      youtube_url: '',
    },
  });

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('company_info').select('*').limit(1);

      if (error) {
        console.error("Error fetching company info:", error);
      } else if (data && data.length > 0) {
        form.setValues(data[0]);
        setImagePreview(data[0].logo_url);
        setConfigId(data[0].id);
      }
      setLoading(false);
    };
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    if (logoFile) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(logoFile);
    } else if (form.values.logo_url) {
      setImagePreview(form.values.logo_url);
    } else {
      setImagePreview(null);
    }
  }, [logoFile, form.values.logo_url]);

  const handleSubmit = async (values: CompanyInfoForm) => {
    setLoading(true);
    console.log('[DEBUG] Starting submission. Existing config ID:', configId);
    try {
      let finalLogoUrl = values.logo_url;

      if (logoFile) {
        console.log('[DEBUG] Uploading new logo file...');
        const fileName = `logo_${Date.now()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(fileName, logoFile, {
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(uploadData.path);
        finalLogoUrl = urlData.publicUrl;
        console.log('[DEBUG] New logo URL:', finalLogoUrl);
      }

      const { id, ...restOfValues } = values;
      const submissionData = {
        ...restOfValues,
        logo_url: finalLogoUrl,
      };

      let error;
      if (configId) {
        // Nếu đã có ID, thực hiện UPDATE
        console.log('[DEBUG] Updating existing record with ID:', configId);
        ({ error } = await supabase.from('company_info').update(submissionData).eq('id', configId));
      } else {
        // SỬA LỖI Ở ĐÂY: INSERT và lấy lại bản ghi để cập nhật ID
        console.log('[DEBUG] Inserting new record.');
        const { data: newRecord, error: insertError } = await supabase
          .from('company_info')
          .insert([submissionData])
          .select()
          .single();

        error = insertError;
        if (newRecord) {
          console.log('[DEBUG] New record inserted. Updating configId to:', newRecord.id);
          setConfigId(newRecord.id); // Cập nhật state với ID mới
        }
      }

      if (error) throw error;

      notifications.show({ title: 'Thành công', message: 'Đã lưu thông tin công ty.', color: 'green' });
    } catch (err: any) {
      console.error('[DEBUG] Submission failed:', err);
      notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder p="xl" radius="md" maw={600} mx="auto">
      <Title order={3} mb="lg">Thông tin Công ty</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput required label="Tên Công ty" {...form.getInputProps('name')} />
          <TextInput label="Mã số thuế" {...form.getInputProps('tax_code')} />
          <Textarea label="Mô tả ngắn" {...form.getInputProps('description')} />
          <TextInput label="Địa chỉ" {...form.getInputProps('address')} />
          <TextInput label="Số điện thoại" {...form.getInputProps('phone')} />
          <TextInput required label="Email liên hệ" type="email" {...form.getInputProps('email')} />
          <Tabs defaultValue="upload" variant='pills' radius={'md'}>
            <Tabs.List justify='center'>
              <Tabs.Tab value="upload" leftSection={<IconPhoto style={{ width: rem(16), height: rem(16) }} />}>Tải lên Logo</Tabs.Tab>
              <Tabs.Tab value="url" leftSection={<IconLink style={{ width: rem(16), height: rem(16) }} />}>Dùng link URL</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="upload" pt="xs">
              <FileInput
                accept="image/png,image/jpeg"
                onChange={setLogoFile}
                clearable
                placeholder="Chọn hình ảnh"
              />
              <Text size="sm" c="dimmed" mt="xs">Xem trước ảnh:</Text>
              {imagePreview && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
                  <Image src={imagePreview} radius="md" h={100} w="auto" fit="contain" />
                </div>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="url" pt="xs">
              <TextInput label="URL Logo" {...form.getInputProps('logo_url')} />
            </Tabs.Panel>
          </Tabs>
          <TextInput label="Facebook URL" placeholder="https://facebook.com/..." {...form.getInputProps('facebook_url')} />
          <TextInput label="Instagram URL" placeholder="https://instagram.com/..." {...form.getInputProps('instagram_url')} />
          <TextInput label="X (Twitter) URL" placeholder="https://x.com/..." {...form.getInputProps('x_url')} />
          <TextInput label="Tiktok URL" placeholder="https://tiktok.com/@..." {...form.getInputProps('tiktok_url')} />
          <TextInput label="Youtube URL" placeholder="https://youtube.com/..." {...form.getInputProps('youtube_url')} />
          <Button type="submit" mt="xs" bg='#008a87' loading={loading}>Lưu thay đổi</Button>
        </Stack>
      </form>
    </Paper>
  );
}
