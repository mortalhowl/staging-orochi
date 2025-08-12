import { useState, useEffect } from 'react';
import { Paper, Title, TextInput, Button, Stack, Textarea, Tabs, FileInput, Image, rem } from '@mantine/core';
import { useForm } from '@mantine/form';
import { supabase } from '../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconPhoto, IconLink } from '@tabler/icons-react';

interface CompanyInfoForm {
  id?: string;
  name: string;
  logo_url: string;
  description: string;
  address: string;
  phone: string;
  email: string;
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
      description: '',
      address: '',
      phone: '',
      email: '',
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
    <Paper withBorder p="xl" radius="md" maw={800} mx="auto">
      <Title order={3} mb="lg">Thông tin Công ty</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput required label="Tên Công ty / Nhà tổ chức" {...form.getInputProps('name')} />
          <Textarea label="Mô tả ngắn" {...form.getInputProps('description')} />
          <TextInput label="Địa chỉ" {...form.getInputProps('address')} />
          <TextInput label="Số điện thoại" {...form.getInputProps('phone')} />
          <TextInput required label="Email liên hệ" type="email" {...form.getInputProps('email')} />

          <Tabs defaultValue="upload" mt="md">
            <Tabs.List>
              <Tabs.Tab value="upload" leftSection={<IconPhoto style={{ width: rem(16), height: rem(16) }} />}>Tải lên Logo</Tabs.Tab>
              <Tabs.Tab value="url" leftSection={<IconLink style={{ width: rem(16), height: rem(16) }} />}>Dùng link URL</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="upload" pt="xs">
              <FileInput label="Logo" accept="image/png,image/jpeg" onChange={setLogoFile} clearable />
              {imagePreview && <Image src={imagePreview} mt="sm" radius="md" h={100} w="auto" fit="contain" />}
            </Tabs.Panel>
            <Tabs.Panel value="url" pt="xs">
              <TextInput label="URL Logo" {...form.getInputProps('logo_url')} />
            </Tabs.Panel>
          </Tabs>

          <Button type="submit" mt="xl" loading={loading}>Lưu thay đổi</Button>
        </Stack>
      </form>
    </Paper>
  );
}
