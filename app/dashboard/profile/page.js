"use client";

import { useUser } from "@/components/context/UserContext";
import UserProfileCard from "@/components/profile/UserProfileCard";

export default function ProfilePage() {
    const { user, loading, refresh } = useUser();

    return (
        <>
            <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
            <UserProfileCard user={user} loading={loading} onRefresh={refresh} allowNameEdit />
        </>
    );
}
