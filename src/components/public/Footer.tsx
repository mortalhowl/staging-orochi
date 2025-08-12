import { useState, useEffect } from 'react';
import { Container, Group, Text, Image, Stack, Anchor, ActionIcon, Divider, Title, Paper } from '@mantine/core';
import { supabase } from '../../services/supabaseClient';
import { IconBrandFacebook, IconBrandInstagram, IconBrandTiktok, IconBrandTwitter, IconBrandYoutube } from '@tabler/icons-react';

interface CompanyInfo {
    name: string;
    description: string;
    tax_code: string;
    logo_url: string;
    address: string;
    phone: string;
    email: string;
    facebook_url: string;
    instagram_url: string;
    x_url: string;
    tiktok_url: string;
    youtube_url: string;
}

export function Footer() {
    const [info, setInfo] = useState<CompanyInfo | null>(null);

    useEffect(() => {
        const fetchInfo = async () => {
            const { data } = await supabase.from('company_info').select('*').limit(1).single();
            if (data) {
                setInfo(data);
            }
        };
        fetchInfo();
    }, []);

    if (!info) {
        return null;
    }

    const socialLinks = [
        { href: info.facebook_url, icon: IconBrandFacebook },
        { href: info.instagram_url, icon: IconBrandInstagram },
        { href: info.x_url, icon: IconBrandTwitter },
        { href: info.tiktok_url, icon: IconBrandTiktok },
        { href: info.youtube_url, icon: IconBrandYoutube },
    ];

    return (
        <Paper p="xs" radius={0} mt="xl">
            <Container size="lg">
                <Stack>
                    <Group justify="space-between" align="flex-start">
                        <Stack>
                            <Title order={5} c="#008a87">Thông tin công ty</Title>
                            <Divider />
                            <Group wrap="nowrap" align="center" style={{ alignItems: 'flex-start' }}>
                                {info.logo_url && (
                                    <Image
                                        src={info.logo_url}
                                        h={60}
                                        w="auto"
                                        style={{ flexShrink: 0 }}
                                    />
                                )}

                                <Stack gap={4} style={{ flex: 1, minWidth: 0, whiteSpace: 'normal' }}>
                                    <Text size="sm" c="dimmed" fw="bold">
                                        {info.name}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Mã số thuế: {info.tax_code}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {info.description}
                                    </Text>
                                </Stack>
                            </Group>

                        </Stack>
                        <Stack>
                            <Title order={5} c="#008a87">Liên hệ</Title>
                            <Divider />
                            <Stack gap={4} style={{ flex: 1, minWidth: 0, whiteSpace: 'normal' }}>
                                <Text size="sm">Địa chỉ: {info.address}</Text>
                                <Text size="sm">Điện thoại: <Anchor href={`tel:${info.phone}`}>{info.phone}</Anchor></Text>
                                <Text size="sm">Email: <Anchor href={`mailto:${info.email}`}>{info.email}</Anchor></Text>
                            </Stack>
                        </Stack>
                        <Stack>
                            <Title order={5} c="#008a87">Theo dõi chúng tôi</Title>
                            <Divider />
                            <Group gap="xs" wrap="nowrap">
                            {socialLinks.map((social, index) => (
                                social.href && (
                                    <ActionIcon key={index} component="a" href={social.href} target="_blank" variant="subtle" color="gray">
                                        <social.icon />
                                    </ActionIcon>
                                )
                            ))}
                            </Group>
                        </Stack>
                    </Group>
                    <Divider />
                    <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>© {new Date().getFullYear()} {/*{info.name}*/}Orochi. All rights reserved.</Text>
                </Stack>
            </Container>
        </Paper>
    );
}
