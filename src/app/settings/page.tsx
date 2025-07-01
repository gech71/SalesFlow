
import prisma from '@/lib/prisma';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    
    // Provide a default value if the setting is not in the database for some reason
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    return (
        <SettingsClient threshold={threshold} />
    );
}
