import Builder from "@/components/Builder";
import { Settings } from "@/lib/settings";

/**
 * Homepage — renders the builder page whose ID is stored in settings.homepage.
 * Configure it in Admin → Settings → General → Homepage Builder ID.
 * Returns null if not set or the builder document is empty.
 */
export default async function Home() {
    const settings = await Settings();
    const id = settings.homepage as string | undefined;

    if (!id?.trim()) return null;

    return <Builder id={id.trim()} />;
}
