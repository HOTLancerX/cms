import MessengerUI from "@/components/chat/MessengerUI";

interface MessagesUserPageProps {
    params: Promise<{ slug: string }>;
}

export default async function AccountMessagesUserPage({ params }: MessagesUserPageProps) {
    const { slug } = await params;
    return <MessengerUI targetSlug={slug} />;
}
