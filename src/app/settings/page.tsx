
import { serialize } from '@/lib/utils';
import db from '@/lib/db';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
    const thresholdSetting = await db.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' },
    });

    const offsiteDistanceThreshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    return (
        <SettingsClient offsiteDistanceThreshold={offsiteDistanceThreshold} />
    );
}
