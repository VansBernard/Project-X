import { type ChangeEvent, useEffect, useState } from 'react';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Button } from '../components/UI';
import { FormField, CheckboxField } from '../components/Form';
import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type AdItem = {
  id: string;
  imageUrl: string;
  caption: string;
};

type LightSettings = {
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  productUpdates: boolean;
};

type AdsSettings = {
  adsEnabled: boolean;
  ads: AdItem[];
};

type GeneralSettings = {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  country?: string;
};

const defaultLightSettings: LightSettings = {
  timezone: 'UTC',
  language: 'English',
  theme: 'system',
  emailNotifications: true,
  productUpdates: true,
};

const defaultAdsSettings: AdsSettings = {
  adsEnabled: true,
  ads: [],
};

const persistedSettingsKey = 'project-x-light-settings';

function readBrowserSettings(): Partial<LightSettings> {
  const saved = localStorage.getItem(persistedSettingsKey);
  if (!saved) return {};

  try {
    return JSON.parse(saved) as LightSettings;
  } catch {
    return {};
  }
}

function SettingCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-white p-4 sm:p-6">
      <div className="mb-5 pb-4 sm:mb-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function AdPreview({ ad, onRemove }: { ad: AdItem; onRemove: () => void }) {
  return (
    <div className="bg-white p-3 overflow-hidden sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-shrink-0">
          <img src={ad.imageUrl} alt={ad.caption} className="h-20 w-20 object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900">{ad.caption}</p>
          <p className="mt-1 text-xs text-slate-500 truncate">{ad.imageUrl}</p>
        </div>
        <div className="flex-shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.roleName === 'Super Admin';
  
  // Light settings state
  const [lightSettings, setLightSettings] = useState<LightSettings>(defaultLightSettings);
  const [lightDraft, setLightDraft] = useState<LightSettings>(defaultLightSettings);
  
  // Ads settings state
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(defaultAdsSettings);
  const [adsDraft, setAdsDraft] = useState<AdsSettings>(defaultAdsSettings);
  
  // UI state
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = useState(false);
  const [newAd, setNewAd] = useState({ imageUrl: '', caption: '' });
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'ads'>('general');

  // General settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({ name: '', legalName: '', email: '', phone: '', country: '' });
  const [generalDraft, setGeneralDraft] = useState<GeneralSettings>({ name: '', legalName: '', email: '', phone: '', country: '' });
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);

  // Load settings on mount
  useEffect(() => {
    // Load general dealer settings
    apiClient.getDealerProfile()
      .then((response) => {
        const dealer = response.data;
        const generalData: GeneralSettings = {
          name: dealer.name || '',
          legalName: dealer.legalName || '',
          email: dealer.email || '',
          phone: dealer.phone || '',
          country: dealer.country || ''
        };
        setGeneralSettings(generalData);
        setGeneralDraft(generalData);
      })
      .catch((error) => {
        console.error('Failed to load dealer profile:', error);
      });

    // Load light settings from localStorage
    const browserSettings = readBrowserSettings();
    const initialLightSettings = { ...defaultLightSettings, ...browserSettings };
    setLightSettings(initialLightSettings);
    setLightDraft(initialLightSettings);

    // Load ads settings if admin
    if (isAdmin) {
      apiClient.getDashboardAds()
        .then((response) => {
          const ads = response.data.ads ?? [];
          const adsEnabled = response.data.adsEnabled ?? false;
          const initialAdsSettings = { adsEnabled, ads };
          setAdsSettings(initialAdsSettings);
          setAdsDraft(initialAdsSettings);
        })
        .catch((error) => {
          console.error('Failed to load ads settings:', error);
          setStatusMessage('Failed to load ads settings. Using defaults.');
          setStatusType('error');
          setTimeout(() => setStatusMessage(null), 3000);
        });
    }
  }, [isAdmin]);

  const showMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveLightSettings = async () => {
    try {
      setIsSaving(true);
      localStorage.setItem(persistedSettingsKey, JSON.stringify(lightDraft));
      setLightSettings(lightDraft);
      window.dispatchEvent(new StorageEvent('storage', { key: persistedSettingsKey, newValue: JSON.stringify(lightDraft) }));
      showMessage('Preferences saved successfully.');
    } catch {
      showMessage('Failed to save preferences.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneralSettings = async () => {
    try {
      setIsSaving(true);
      const updateInput: Record<string, string | undefined> = {};
      if (generalDraft.name !== undefined) updateInput.name = generalDraft.name;
      if (generalDraft.legalName !== undefined) updateInput.legalName = generalDraft.legalName;
      if (generalDraft.email !== undefined) updateInput.email = generalDraft.email;
      if (generalDraft.phone !== undefined) updateInput.phone = generalDraft.phone;
      if (generalDraft.country !== undefined) updateInput.country = generalDraft.country;
      
      await apiClient.updateDealerProfile(updateInput as any);
      setGeneralSettings(generalDraft);
      setIsEditingGeneral(false);
      showMessage('General settings saved successfully.');
    } catch (error) {
      console.error('Error saving general settings:', error);
      showMessage('Failed to save general settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdsSettings = async () => {
    if (!isAdmin) return;

    try {
      setIsSaving(true);
      await apiClient.saveDashboardAds({
        adsEnabled: adsDraft.adsEnabled,
        ads: adsDraft.ads,
      });
      setAdsSettings(adsDraft);
      showMessage('Ads settings saved and deployed to dashboards.');
    } catch (error) {
      console.error('Failed to save ads settings:', error);
      showMessage('Failed to save ads settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setLightDraft(lightSettings);
    setAdsDraft(adsSettings);
    setNewAd({ imageUrl: '', caption: '' });
    showMessage('All changes discarded.');
  };

  const handleAddAd = () => {
    if (!newAd.imageUrl.trim() || !newAd.caption.trim()) {
      showMessage('Image URL and caption are required.', 'error');
      return;
    }

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setAdsDraft((prev) => ({
      ...prev,
      adsEnabled: true,
      ads: [...prev.ads, { id, imageUrl: newAd.imageUrl.trim(), caption: newAd.caption.trim() }],
    }));
    setNewAd({ imageUrl: '', caption: '' });
    showMessage('Ad added. Save settings to deploy.');
  };

  const handleAdFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewAd((prev) => ({ ...prev, imageUrl: reader.result as string }));
        showMessage(`Image "${file.name}" loaded.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAd = (id: string) => {
    setAdsDraft((prev) => ({
      ...prev,
      ads: prev.ads.filter((ad) => ad.id !== id),
    }));
    showMessage('Ad removed. Save settings to deploy.');
  };

  const hasUnsavedLightChanges = JSON.stringify(lightDraft) !== JSON.stringify(lightSettings);
  const hasUnsavedAdsChanges = isAdmin && JSON.stringify(adsDraft) !== JSON.stringify(adsSettings);
  const hasUnsavedChanges = hasUnsavedLightChanges || hasUnsavedAdsChanges;

  return (
    <>
      <Sidebar />
      <Header title="Settings" simplified />
      <MainLayout showBack={false}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header with Save/Discard */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {hasUnsavedChanges && (
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  onClick={handleCancelChanges}
                  disabled={isSaving}
                >
                  Discard
                </Button>
                {hasUnsavedLightChanges && (
                  <Button 
                    variant="primary" 
                    onClick={handleSaveLightSettings}
                    disabled={isSaving}
                  >
                    Save Preferences
                  </Button>
                )}
                {hasUnsavedAdsChanges && (
                  <Button 
                    variant="primary" 
                    onClick={handleSaveAdsSettings}
                    disabled={isSaving}
                  >
                    Save Ads
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              statusType === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Tabs */}
          <div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-6">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'general'
                    ? 'font-semibold text-primary'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'appearance'
                    ? 'font-semibold text-primary'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Appearance
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'notifications'
                    ? 'font-semibold text-primary'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Notifications
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('ads')}
                  className={`px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'ads'
                      ? 'font-semibold text-primary'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard Ads
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="grid gap-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <>
                <SettingCard
                  title="Company Information"
                  description="Manage your dealer company details"
                >
                  {!isEditingGeneral ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Company Name</label>
                          <p className="text-slate-900">{generalSettings.name || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Legal Name</label>
                          <p className="text-slate-900">{generalSettings.legalName || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Email</label>
                          <p className="text-slate-900">{generalSettings.email || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Phone</label>
                          <p className="text-slate-900">{generalSettings.phone || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Country</label>
                          <p className="text-slate-900">{generalSettings.country || '—'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsEditingGeneral(true)}
                        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Company Name *</label>
                        <input
                          type="text"
                          value={generalDraft.name}
                          onChange={(e) => setGeneralDraft({ ...generalDraft, name: e.target.value })}
                          className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Legal Name</label>
                        <input
                          type="text"
                          value={generalDraft.legalName || ''}
                          onChange={(e) => setGeneralDraft({ ...generalDraft, legalName: e.target.value })}
                          className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Enter legal name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Email</label>
                        <input
                          type="email"
                          value={generalDraft.email || ''}
                          onChange={(e) => setGeneralDraft({ ...generalDraft, email: e.target.value })}
                          className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Enter email"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Phone</label>
                        <input
                          type="tel"
                          value={generalDraft.phone || ''}
                          onChange={(e) => setGeneralDraft({ ...generalDraft, phone: e.target.value })}
                          className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Country</label>
                        <input
                          type="text"
                          value={generalDraft.country || ''}
                          onChange={(e) => setGeneralDraft({ ...generalDraft, country: e.target.value })}
                          className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Enter country code (e.g., US)"
                          maxLength={2}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleSaveGeneralSettings}
                          disabled={isSaving}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setGeneralDraft(generalSettings);
                            setIsEditingGeneral(false);
                          }}
                          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </SettingCard>
              </>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <SettingCard
                title="Appearance"
                description="Appearance settings will be available soon."
              >
                <p className="text-sm text-slate-600">Coming soon</p>
              </SettingCard>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <SettingCard
                title="Notification Preferences"
                description="Choose what notifications you receive"
              >
                <div className="space-y-4">
                  <CheckboxField
                    label="Email notifications"
                    name="emailNotifications"
                    checked={lightDraft.emailNotifications}
                    onChange={(checked) => setLightDraft((prev) => ({ ...prev, emailNotifications: checked }))}
                  />
                  <CheckboxField
                    label="Product update emails"
                    name="productUpdates"
                    checked={lightDraft.productUpdates}
                    onChange={(checked) => setLightDraft((prev) => ({ ...prev, productUpdates: checked }))}
                  />
                  <p className="text-xs text-slate-500">You can change these preferences at any time. We respect your inbox.</p>
                </div>
              </SettingCard>
            )}

            {/* Ads Tab (Admin Only) */}
            {activeTab === 'ads' && isAdmin && (
              <>
                <SettingCard
                  title="Dashboard Ads Settings"
                  description="Manage ads displayed on dealer dashboards"
                >
                  <CheckboxField
                    label="Enable ads on all dashboards"
                    name="adsEnabled"
                    checked={adsDraft.adsEnabled}
                    onChange={(checked) => setAdsDraft((prev) => ({ ...prev, adsEnabled: checked }))}
                  />
                  <p className="text-xs text-slate-500">
                    {adsDraft.adsEnabled
                      ? 'Ads are currently enabled and visible on dealer dashboards.'
                      : 'Ads are disabled. No ads will appear on dealer dashboards.'}
                  </p>
                </SettingCard>

                <SettingCard
                  title="Add New Ad"
                  description="Create a new ad campaign"
                >
                  <div className="space-y-4">
                    <FormField
                      label="Ad image URL"
                      name="adImageUrl"
                      value={newAd.imageUrl}
                      onChange={(value) => setNewAd((prev) => ({ ...prev, imageUrl: value }))}
                      placeholder="https://example.com/image.jpg or use file upload below"
                    />
                    <label className="flex cursor-pointer items-center gap-2 bg-slate-50 px-3 py-3 transition-colors hover:bg-slate-100 sm:px-4">
                      <span className="text-sm font-medium text-slate-700">📁 Upload image from files</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAdFileUpload} />
                    </label>
                    <FormField
                      label="Ad caption"
                      name="adCaption"
                      value={newAd.caption}
                      onChange={(value) => setNewAd((prev) => ({ ...prev, caption: value }))}
                      placeholder="Short description or call-to-action"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddAd}
                      disabled={isSaving}
                    >
                      Add Ad
                    </Button>
                  </div>
                </SettingCard>

                {adsDraft.ads.length > 0 && (
                  <SettingCard
                    title="Active Ads"
                    description={`${adsDraft.ads.length} ad${adsDraft.ads.length !== 1 ? 's' : ''} configured`}
                  >
                    <div className="space-y-3">
                      {adsDraft.ads.map((ad) => (
                        <AdPreview
                          key={ad.id}
                          ad={ad}
                          onRemove={() => handleRemoveAd(ad.id)}
                        />
                      ))}
                    </div>
                  </SettingCard>
                )}
              </>
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
}

export default SettingsPage;
