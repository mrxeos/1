import { PrescriptionSettings, User, Role, PrescriptionFieldSetting } from '../types';

const SETTINGS_KEY = 'clinicAppSettings';
const THEME_KEY = 'clinicAppTheme';
export const STATS_PRICES_KEY = 'clinicStatsPrices';
const CUSTOM_THEME_COLORS_KEY = 'clinicAppCustomThemeColors';
const REMEMBERED_USER_KEY = 'clinicRememberedUser';

export const defaultSettings: PrescriptionSettings = {
    headerText: `
<div style="text-align: center;">
<h1 style="font-size: 1.875rem; font-weight: 700; color: var(--primary);">اسم الطبيب</h1>
<p style="color: var(--text-secondary);">التخصص</p>
<p style="font-size: 0.875rem; color: var(--text-secondary);">العنوان: 123 شارع العيادة, القاهرة | الهاتف: 0123456789</p>
</div>
    `.trim(),
    footerText: `
<div style="text-align: left;">
<p style="font-weight: 600;">توقيع الطبيب</p>
<div style="width: 12rem; border-bottom: 1px solid var(--border); margin-top: 0.5rem;"></div>
</div>
    `.trim(),
    showDoctorNotes: true,
    fontSize: 16,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    paperSize: 'A4',
    headerAreaHeight: 20,
    patientName: { enabled: true, showLabel: true, label: 'اسم المريض:', top: '6.5%', horizontalEdge: 'left', horizontalOffset: '45%', textAlign: 'right' },
    patientAge: { enabled: true, showLabel: true, label: 'العمر:', top: '9%', horizontalEdge: 'left', horizontalOffset: '45%', textAlign: 'right' },
    visitDate: { enabled: true, showLabel: true, label: 'التاريخ:', top: '6.5%', horizontalEdge: 'right', horizontalOffset: '5%', textAlign: 'right' },
    patientWeight: { enabled: true, showLabel: true, label: 'الوزن:', top: '9%', horizontalEdge: 'right', horizontalOffset: '5%', textAlign: 'right' },
    temperature: { enabled: true, showLabel: true, label: 'الحرارة:', top: '9%', horizontalEdge: 'right', horizontalOffset: '25%', textAlign: 'right' },
    fileNumber: { enabled: true, showLabel: true, label: 'رقم الملف:', top: '92.00%', horizontalEdge: 'left', horizontalOffset: '20.00%', textAlign: 'right' },
    symptoms: { enabled: true, showLabel: true, label: 'الشكوى:', top: '11.5%', horizontalEdge: 'left', horizontalOffset: '45%', textAlign: 'right' },
    diagnosis: { enabled: true, showLabel: true, label: 'التشخيص:', top: '14%', horizontalEdge: 'left', horizontalOffset: '45%', textAlign: 'right' },
};

export const defaultCustomColors = {
    primary: '#0d9488',
    primaryFocus: '#0f766e',
    primaryContent: '#ffffff',
    secondary: '#0ea5e9',
    accent: '#3b82f6',
    background: '#f3f4f6',
    surface: '#ffffff',
    textPrimary: '#1f2937',
    textSecondary: '#4b5563',
    border: '#e5e7eb',
};

const API_URL = '/api';

async function apiFetch(path: string, options?: RequestInit) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    if (!response.ok) {
        return null;
    }
    return response.json();
}

// --- Theme Service (Keep Local) ---
export const getTheme = (): string => {
    return localStorage.getItem(THEME_KEY) || 'default';
};

export const saveTheme = (themeName: string): void => {
    localStorage.setItem(THEME_KEY, themeName);
};

export const getCustomThemeColors = (): typeof defaultCustomColors => {
    try {
        const savedColors = localStorage.getItem(CUSTOM_THEME_COLORS_KEY);
        if (savedColors) {
            const parsed = JSON.parse(savedColors);
            return { ...defaultCustomColors, ...parsed };
        }
    } catch (error) {
        console.error("Failed to parse custom colors from localStorage", error);
    }
    return defaultCustomColors;
};

export const saveCustomThemeColors = (colors: typeof defaultCustomColors): void => {
    localStorage.setItem(CUSTOM_THEME_COLORS_KEY, JSON.stringify(colors));
};

// --- Price Settings Service (Shared) ---
export const getPrices = async (): Promise<{ exam: number; consult: number }> => {
    const prices = await apiFetch(`/settings/${STATS_PRICES_KEY}`);
    return prices || { exam: 100, consult: 50 };
};

export const savePrices = async (prices: { exam: number; consult: number }) => {
    await apiFetch(`/settings/${STATS_PRICES_KEY}`, {
        method: 'POST',
        body: JSON.stringify({ value: prices }),
    });
};


// --- Prescription Settings Service (Shared) ---
export const getSettings = async (): Promise<PrescriptionSettings> => {
    const saved = await apiFetch(`/settings/${SETTINGS_KEY}`);
    if (saved) {
        return { ...defaultSettings, ...saved };
    }
    return defaultSettings;
};

export const saveSettings = async (settings: PrescriptionSettings): Promise<void> => {
    await apiFetch(`/settings/${SETTINGS_KEY}`, {
        method: 'POST',
        body: JSON.stringify({ value: settings }),
    });
};

// --- Authentication Service (Shared) ---
export const getUsers = (): Promise<User[]> => apiFetch('/users');

export const addUser = async (user: Omit<User, 'id'>): Promise<User> => {
    return apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(user),
    });
};

export const updateUser = async (updatedUser: User): Promise<void> => {
    await apiFetch(`/users/${updatedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedUser),
    });
};

export const deleteUser = async (userId: number): Promise<void> => {
    await apiFetch(`/users/${userId}`, {
        method: 'DELETE',
    });
};

export const login = (username: string, password: string): Promise<User | null> => {
    return apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};

export const getRememberedUser = (): User | null => {
    try {
        const savedUserJson = localStorage.getItem(REMEMBERED_USER_KEY);
        if (!savedUserJson) return null;
        return JSON.parse(savedUserJson);
    } catch (error) {
        localStorage.removeItem(REMEMBERED_USER_KEY);
        return null;
    }
};

export const saveRememberedUser = (user: User): void => {
    const { password, ...userToRemember } = user;
    localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(userToRemember));
};

export const clearRememberedUser = (): void => {
    localStorage.removeItem(REMEMBERED_USER_KEY);
};
