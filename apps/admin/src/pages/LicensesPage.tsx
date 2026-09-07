import { useEffect, useState } from 'react';
import { Sidebar, Header, MainLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/UI';
import { FormField, SelectField } from '../components/Form';
import { StatusBadge } from '../components/StatusBadge';
import { TableSkeleton } from '../components/TableSkeleton';
import { apiClient, type DeviceListItem, type LicenseDetail } from '../lib/api';
import noDataImg from '../../No data.jpg';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function LicensesPage() {
  const [license, setLicense] = useState<LicenseDetail | null>(null);
  const [deviceLicense, setDeviceLicense] = useState<LicenseDetail | null>(null);
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [licenseType, setLicenseType] = useState<'temporary' | 'permanent'>('temporary');
  const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10));
  const [metadata, setMetadata] = useState('');
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [verifyPayload, setVerifyPayload] = useState('');
  const [verifySignature, setVerifySignature] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [licenses, setLicenses] = useState<LicenseDetail[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [licensesError, setLicensesError] = useState<string | null>(null);

  const loadLicenses = async () => {
    setLicensesLoading(true);
    setLicensesError(null);

    try {
      const response = await apiClient.listLicenses({ take: 100 });
      setLicenses(response.data);
    } catch (error) {
      setLicensesError((error as Error)?.message || 'Failed to load licenses.');
      setLicenses([]);
    } finally {
      setLicensesLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    apiClient.listDevices({ take: 100 })
      .then((response) => {
        if (!cancelled) {
          setDevices(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) setDevices([]);
      });

    loadLicenses();

    return () => { cancelled = true; };
  }, []);

  const issueSelectedLicense = async (kind: 'temporary' | 'permanent') => {
    setIssueLoading(true);
    setIssueError(null);
    setLicenseType(kind);

    try {
      const result = await apiClient.issueLicense({
        deviceId: selectedDeviceId,
        contractId: selectedContractId,
        licenseType: kind,
        expiresAt: kind === 'temporary' ? expiresAt : undefined,
        metadata: metadata ? JSON.parse(metadata) : {},
      });
      setLicense(result.data);
    } catch (error) {
      setIssueError((error as Error)?.message || 'Failed to issue license.');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!selectedDeviceId) return;
    setLookupLoading(true);
    setLookupError(null);
    setDeviceLicense(null);

    try {
      const result = await apiClient.getDeviceActiveLicense(selectedDeviceId);
      setDeviceLicense(result.data.license);
    } catch (error) {
      setLookupError((error as Error)?.message || 'Failed to lookup device license.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    setVerifyResult(null);

    try {
      const payload = JSON.parse(verifyPayload);
      const result = await apiClient.verifyLicense(payload, verifySignature);
      setVerifyResult(result.data.valid ? 'License is valid' : 'License is invalid');
    } catch (error) {
      setVerifyResult((error as Error)?.message || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <Header title="Licenses" subtitle="Issue, verify, and inspect device unlock licenses." />
      <MainLayout>
        <div className="space-y-6">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Issue licenses for devices and verify payload signatures from the backend.</p>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card className="space-y-6 p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Issue license</h2>
                <p className="mt-2 text-sm text-slate-600">Create a signed unlock license for a device or contract.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <SelectField
                  label="Device"
                  name="deviceId"
                  value={selectedDeviceId}
                  onChange={setSelectedDeviceId}
                  options={[{ value: '', label: 'Select device' }, ...devices.map((device) => ({ value: device.id, label: device.serialNumber || `${device.manufacturer ?? ''} ${device.model ?? ''}`.trim() }))]}
                />
                <FormField
                  label="Contract ID"
                  name="contractId"
                  value={selectedContractId}
                  onChange={setSelectedContractId}
                  placeholder="Enter contract id"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <SelectField
                  label="License type"
                  name="licenseType"
                  value={licenseType}
                  onChange={(value) => setLicenseType(value as 'temporary' | 'permanent')}
                  options={[
                    { value: 'temporary', label: 'Temporary unlock' },
                    { value: 'permanent', label: 'Permanent unlock' }
                  ]}
                />
                <FormField
                  label="Metadata (JSON)"
                  name="metadata"
                  type="textarea"
                  value={metadata}
                  onChange={setMetadata}
                  placeholder='{"source":"admin"}'
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <FormField
                  label="Expiration date"
                  name="expiresAt"
                  type="date"
                  value={licenseType === 'temporary' ? expiresAt : ''}
                  onChange={setExpiresAt}
                  disabled={licenseType !== 'temporary'}
                />
              </div>

              {issueError && <p className="text-sm text-red-500">{issueError}</p>}

              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={() => issueSelectedLicense('temporary')} disabled={issueLoading || !selectedDeviceId || !selectedContractId}>
                  {issueLoading ? 'Issuing…' : 'Issue temporary license'}
                </Button>
                <Button variant="primary" onClick={() => issueSelectedLicense('permanent')} disabled={issueLoading || !selectedDeviceId || !selectedContractId}>
                  {issueLoading ? 'Issuing…' : 'Issue permanent unlock'}
                </Button>
              </div>

              {license ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Issued license</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{license.id}</p>
                    </div>
                    <StatusBadge status={license.status} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Device</p>
                      <p className="text-sm text-slate-900">{license.device?.serialNumber ?? selectedDeviceId}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Type</p>
                      <p className="text-sm text-slate-900">{license.licenseType ?? 'temporary'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Expires</p>
                      <p className="text-sm text-slate-900">{license.expiresAt ? dateFormatter.format(new Date(license.expiresAt)) : '—'}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{license.licenseType === 'permanent' ? 'Permanent unlock key' : 'License key'}</p>
                    <p className="break-all mt-2">{license.licenseKey ?? 'Available after payment confirmation'}</p>
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="space-y-6 p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Verification & lookup</h2>
                <p className="mt-2 text-sm text-slate-600">Lookup active device licenses or verify a license payload signature.</p>
              </div>

              <div className="space-y-4">
                <SelectField
                  label="Lookup active license for device"
                  name="lookupDevice"
                  value={selectedDeviceId}
                  onChange={setSelectedDeviceId}
                  options={[{ value: '', label: 'Select device' }, ...devices.map((device) => ({ value: device.id, label: device.serialNumber || `${device.manufacturer ?? ''} ${device.model ?? ''}`.trim() }))]}
                />
                <Button variant="secondary" onClick={handleLookup} disabled={lookupLoading || !selectedDeviceId}>
                  {lookupLoading ? 'Looking up…' : 'Lookup active license'}
                </Button>

                {lookupError && <p className="text-sm text-red-500">{lookupError}</p>}

                {deviceLicense ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Active license</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{deviceLicense.id}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={deviceLicense.status} />
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                        {deviceLicense.licenseType ?? 'temporary'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">
                      {deviceLicense.expiresAt ? `Expires at ${dateFormatter.format(new Date(deviceLicense.expiresAt))}` : 'Permanent unlock: no expiry'}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <FormField
                    label="Payload JSON"
                    name="verifyPayload"
                    type="textarea"
                    value={verifyPayload}
                    onChange={setVerifyPayload}
                    placeholder='{"licenseId":"...","deviceId":"..."}'
                  />
                </div>
                <div>
                  <FormField
                    label="Signature"
                    name="verifySignature"
                    value={verifySignature}
                    onChange={setVerifySignature}
                    placeholder="Paste signature here"
                  />
                </div>
                <Button variant="primary" onClick={handleVerify} disabled={verifyLoading || !verifyPayload || !verifySignature}>
                  {verifyLoading ? 'Verifying…' : 'Verify license'}
                </Button>

                {verifyResult ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p>{verifyResult}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">License operations</h2>
            <p className="mt-2 text-sm text-slate-600">These actions use the backend license engine and device lookup endpoints.</p>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 p-5 border-b border-slate-200 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Issued licenses</p>
                <p className="text-sm text-slate-500">Showing {licenses.length} license{licenses.length === 1 ? '' : 's'}.</p>
              </div>
            </div>

            <div className="overflow-x-auto bg-white">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">License ID</th>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Contract</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                  </tr>
                </thead>
                {licensesLoading ? (
                  <TableSkeleton columnCount={6} rowCount={5} />
                ) : licensesError ? (
                  <tbody>
                    <tr>
                      <td className="px-4 py-10 text-center" colSpan={5}>
                        <p className="text-sm text-slate-500">{licensesError}</p>
                      </td>
                    </tr>
                  </tbody>
                ) : licenses.length === 0 ? (
                  <tbody>
                    <tr>
                      <td className="px-4 py-10 text-center" colSpan={5}>
                        <div className="flex flex-col items-center gap-4">
                          <img src={noDataImg} alt="No licenses" className="max-w-[280px] opacity-95" />
                          <p className="text-sm text-slate-500">No licenses have been issued yet.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y divide-slate-200 bg-slate-50">
                    {licenses.map((licenseItem) => (
                      <tr key={licenseItem.id} className="hover:bg-white transition-colors cursor-default">
                        <td className="px-4 py-4 font-medium text-slate-900 break-all">{licenseItem.id}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{licenseItem.device?.serialNumber ?? licenseItem.deviceId ?? 'Unknown'}</td>
                        <td className="px-4 py-4 text-sm text-slate-700">{licenseItem.contract?.id ?? licenseItem.contractId ?? 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-slate-700 uppercase tracking-wide">{licenseItem.licenseType ?? 'temporary'}</td>
                        <td className="px-4 py-4"><StatusBadge status={licenseItem.status} /></td>
                        <td className="px-4 py-4 text-sm text-slate-500">{licenseItem.expiresAt ? dateFormatter.format(new Date(licenseItem.expiresAt)) : 'Permanent'}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </Card>
        </div>
      </MainLayout>
    </>
  );
}
