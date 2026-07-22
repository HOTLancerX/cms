/**
 * app/account/usernav.ts
 *
 * Default nav items shown in the account sidebar.
 * Plugins can add additional items via addHook("user.nav", ...).
 */

export interface UserNavItem {
    key: string;
    label: string;
    icon: string;
    href: string;
    position: number;
}

export const DEFAULT_USER_NAV: UserNavItem[] = [
    {
        key:      "account-home",
        label:    "Dashboard",
        icon:     "solar:home-2-bold",
        href:     "/account",
        position: 1,
    },
    {
        key:      "account-orders",
        label:    "My Orders",
        icon:     "solar:bag-bold",
        href:     "/account/orders",
        position: 2,
    },
    {
        key:      "account-messages",
        label:    "Messages",
        icon:     "solar:chat-round-dots-bold",
        href:     "/account/messages",
        position: 3,
    },
    {
        key:      "account-settings",
        label:    "Settings",
        icon:     "solar:settings-bold",
        href:     "/account/settings",
        position: 99,
    },
];
